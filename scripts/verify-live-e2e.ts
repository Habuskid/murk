import { mkdir, writeFile } from "node:fs/promises"
import { and, desc, eq } from "drizzle-orm"
import { getDb, schema } from "../src/db/index"
import { repository } from "../src/db/repository"
import { getCeloClient } from "../src/services/celo"
import { hasExactErc20Transfer } from "../src/services/funding"
import { getErc8004Status } from "../src/services/erc8004"
import {
  getConfiguredAttributionCode,
  verifyMurkAttribution,
} from "../src/services/attribution"

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function normalize(value: string) {
  return value.toLowerCase()
}

async function main() {
  requireEnv("DATABASE_URL")
  requireEnv("CELO_RPC_URL")
  requireEnv("PUBLIC_APP_ORIGIN")
  const internalAgentId = requireEnv("LIVE_AGENT_ID")
  const expectedPortalWallet = requireEnv(
    "PORTAL_USER_WALLET_VERIFIED_ADDRESS"
  )
  const attributionCode = getConfiguredAttributionCode()
  expect(attributionCode, "CELO_ATTRIBUTION_CODE is required")

  const db = getDb()
  const celo = getCeloClient()

  const agent = await repository.findAgentById(internalAgentId)
  expect(agent, "LIVE_AGENT_NOT_FOUND")

  const portalWallet = await repository.findUserWallet(agent.ownerUserId)
  expect(portalWallet, "PORTAL_WALLET_NOT_PERSISTED")
  expect(
    normalize(portalWallet.address) === normalize(expectedPortalWallet),
    "PORTAL_WALLET_ADDRESS_MISMATCH"
  )
  expect(agent.walletAddress, "AGENT_EXECUTION_WALLET_MISSING")

  const [fundingTx] = await db
    .select()
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.purpose, "FUND_AGENT"),
        eq(schema.transactions.toAddress, agent.walletAddress),
        eq(schema.transactions.status, "CONFIRMED")
      )
    )
    .orderBy(desc(schema.transactions.confirmedAt))
    .limit(1)

  expect(fundingTx, "CONFIRMED_FUNDING_TX_NOT_FOUND")
  expect(fundingTx.assetAddress, "FUNDING_ASSET_ADDRESS_MISSING")
  expect(fundingTx.amountRaw && fundingTx.amountRaw > 0n, "FUNDING_AMOUNT_INVALID")

  const fundingReceipt = await celo.getTransactionReceipt({
    hash: fundingTx.txHash as `0x${string}`,
  })
  expect(fundingReceipt.status === "success", "FUNDING_TX_NOT_SUCCESSFUL")

  expect(
    hasExactErc20Transfer({
      logs: fundingReceipt.logs,
      tokenAddress: fundingTx.assetAddress as `0x${string}`,
      expectedFrom: portalWallet.address,
      expectedTo: agent.walletAddress,
      expectedAmount: fundingTx.amountRaw,
    }),
    "FUNDING_TRANSFER_NOT_EXACT"
  )

  const [completedPurchase] = await db
    .select()
    .from(schema.purchases)
    .where(
      and(
        eq(schema.purchases.agentId, agent.id),
        eq(schema.purchases.state, "COMPLETED")
      )
    )
    .orderBy(desc(schema.purchases.completedAt))
    .limit(1)

  expect(completedPurchase, "COMPLETED_X402_PURCHASE_NOT_FOUND")
  expect(
    completedPurchase.settlementAmountRaw &&
      completedPurchase.settlementAmountRaw > 0n,
    "X402_SETTLEMENT_AMOUNT_INVALID"
  )

  const [paymentRequirement] = await db
    .select()
    .from(schema.paymentRequirements)
    .where(eq(schema.paymentRequirements.purchaseId, completedPurchase.id))
    .orderBy(desc(schema.paymentRequirements.receivedAt))
    .limit(1)

  expect(paymentRequirement, "X402_PAYMENT_REQUIREMENT_NOT_PERSISTED")
  expect(
    paymentRequirement.network === "eip155:42220",
    "X402_REQUIREMENT_WRONG_NETWORK"
  )

  const [requirementAsset] = await db
    .select()
    .from(schema.paymentRequirementAssets)
    .where(
      eq(
        schema.paymentRequirementAssets.paymentRequirementId,
        paymentRequirement.id
      )
    )
    .limit(1)

  expect(requirementAsset, "X402_REQUIREMENT_ASSET_NOT_PERSISTED")
  expect(
    requirementAsset.amountRaw === completedPurchase.settlementAmountRaw,
    "X402_REQUIREMENT_AMOUNT_MISMATCH"
  )

  const [approvedPolicy] = await db
    .select()
    .from(schema.policyDecisions)
    .where(eq(schema.policyDecisions.purchaseId, completedPurchase.id))
    .limit(1)
  expect(approvedPolicy, "APPROVED_POLICY_EVIDENCE_MISSING")
  expect(approvedPolicy.decision === "APPROVED", "X402_POLICY_NOT_APPROVED")

  const [rateQuote] = await db
    .select()
    .from(schema.rateQuotes)
    .where(eq(schema.rateQuotes.purchaseId, completedPurchase.id))
    .limit(1)
  expect(rateQuote, "X402_RATE_EVIDENCE_MISSING")
  expect(rateQuote.rateNumerator > 0n, "X402_RATE_NUMERATOR_INVALID")
  expect(rateQuote.rateDenominator > 0n, "X402_RATE_DENOMINATOR_INVALID")
  expect(
    rateQuote.quotedAt.getTime() <= completedPurchase.updatedAt.getTime(),
    "X402_RATE_TIMESTAMP_AFTER_PURCHASE"
  )
  expect(
    rateQuote.expiresAt.getTime() >= completedPurchase.createdAt.getTime(),
    "X402_RATE_EXPIRED_DURING_PURCHASE"
  )

  const [reservation] = await db
    .select()
    .from(schema.spendReservations)
    .where(eq(schema.spendReservations.purchaseId, completedPurchase.id))
    .limit(1)
  expect(reservation, "X402_SPEND_RESERVATION_MISSING")
  expect(reservation.status === "COMMITTED", "X402_SPEND_NOT_COMMITTED")

  const [resource] = await db
    .select()
    .from(schema.resources)
    .where(eq(schema.resources.purchaseId, completedPurchase.id))
    .limit(1)
  expect(resource, "X402_RESOURCE_EVIDENCE_MISSING")
  expect(
    resource.httpStatus >= 200 && resource.httpStatus < 300,
    "X402_RESOURCE_NOT_DELIVERED"
  )
  expect(resource.contentHash, "X402_RESOURCE_HASH_MISSING")

  const [receiptRow] = await db
    .select()
    .from(schema.receipts)
    .where(eq(schema.receipts.purchaseId, completedPurchase.id))
    .limit(1)
  expect(receiptRow, "X402_RECEIPT_MISSING")

  const [x402Tx] = await db
    .select()
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.purchaseId, completedPurchase.id),
        eq(schema.transactions.purpose, "X402_PURCHASE"),
        eq(schema.transactions.status, "CONFIRMED")
      )
    )
    .limit(1)

  expect(x402Tx, "CONFIRMED_X402_TX_NOT_FOUND")
  expect(x402Tx.txHash, "X402_TX_HASH_MISSING")

  const x402Receipt = await celo.getTransactionReceipt({
    hash: x402Tx.txHash as `0x${string}`,
  })
  expect(x402Receipt.status === "success", "X402_TX_NOT_SUCCESSFUL")

  expect(
    hasExactErc20Transfer({
      logs: x402Receipt.logs,
      tokenAddress: requirementAsset.assetAddress as `0x${string}`,
      expectedFrom: agent.walletAddress,
      expectedTo: paymentRequirement.payTo as `0x${string}`,
      expectedAmount: requirementAsset.amountRaw,
    }),
    "X402_ONCHAIN_TRANSFER_NOT_EXACT"
  )

  const [blockedPurchase] = await db
    .select()
    .from(schema.purchases)
    .where(
      and(
        eq(schema.purchases.agentId, agent.id),
        eq(schema.purchases.state, "POLICY_BLOCKED")
      )
    )
    .orderBy(desc(schema.purchases.createdAt))
    .limit(1)

  expect(blockedPurchase, "LIVE_BLOCKED_PURCHASE_NOT_FOUND")

  const [blockedPolicy] = await db
    .select()
    .from(schema.policyDecisions)
    .where(eq(schema.policyDecisions.purchaseId, blockedPurchase.id))
    .limit(1)
  expect(blockedPolicy, "BLOCKED_POLICY_EVIDENCE_MISSING")
  expect(blockedPolicy.decision === "BLOCKED", "BLOCKED_POLICY_NOT_BLOCKED")

  const blockedTransactions = await db
    .select({ id: schema.transactions.id })
    .from(schema.transactions)
    .where(eq(schema.transactions.purchaseId, blockedPurchase.id))
  expect(blockedTransactions.length === 0, "BLOCKED_PURCHASE_HAS_TRANSACTION")

  const blockedReservations = await db
    .select({ id: schema.spendReservations.id })
    .from(schema.spendReservations)
    .where(eq(schema.spendReservations.purchaseId, blockedPurchase.id))
  expect(blockedReservations.length === 0, "BLOCKED_PURCHASE_RESERVED_SPEND")

  const [blockedReceipt] = await db
    .select()
    .from(schema.receipts)
    .where(eq(schema.receipts.purchaseId, blockedPurchase.id))
    .limit(1)
  expect(blockedReceipt, "BLOCKED_RECEIPT_MISSING")

  const blockedReceiptJson = blockedReceipt.receiptJson as {
    txHash?: unknown
    policyDecision?: unknown
    resourceDeliveryStatus?: unknown
  }
  expect(blockedReceiptJson.txHash === null, "BLOCKED_RECEIPT_HAS_TX_HASH")
  expect(
    blockedReceiptJson.policyDecision === "BLOCKED",
    "BLOCKED_RECEIPT_DECISION_INVALID"
  )

  expect(agent.erc8004AgentId, "ERC8004_AGENT_ID_NOT_PERSISTED")
  const erc8004Status = await getErc8004Status({
    agentId: BigInt(agent.erc8004AgentId),
    expectedOwner: portalWallet.address,
    expectedAgentWallet: agent.walletAddress,
  })

  expect(erc8004Status.registered, "ERC8004_NOT_REGISTERED")
  expect(erc8004Status.ownerMatches, "ERC8004_OWNER_MISMATCH")
  expect(erc8004Status.walletBound, "ERC8004_EXECUTION_WALLET_NOT_BOUND")

  const identityTransactions = await db
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.walletId, portalWallet.id))
    .orderBy(desc(schema.transactions.confirmedAt))

  const registerTx = identityTransactions.find(
    (tx) => tx.purpose === "ERC8004_REGISTER" && tx.status === "CONFIRMED"
  )
  const bindTx = identityTransactions.find(
    (tx) =>
      tx.purpose === "ERC8004_BIND_AGENT_WALLET" &&
      tx.status === "CONFIRMED"
  )

  expect(registerTx, "ERC8004_REGISTER_TX_NOT_PERSISTED")
  expect(bindTx, "ERC8004_BIND_TX_NOT_PERSISTED")

  const attributionCandidates = [registerTx.txHash, bindTx.txHash]
  let attributedTx:
    | {
        txHash: string
        observedCodes: string[]
      }
    | undefined

  for (const txHash of attributionCandidates) {
    const result = await verifyMurkAttribution(txHash as `0x${string}`)
    if (result.verified) {
      attributedTx = {
        txHash,
        observedCodes: result.observedCodes,
      }
      break
    }
  }

  expect(
    attributedTx,
    `ERC8021_ATTRIBUTION_NOT_VERIFIED:${attributionCode}`
  )

  const publicOrigin = new URL(requireEnv("PUBLIC_APP_ORIGIN")).origin
  const metadataUrl = `${publicOrigin}/api/agents/${agent.id}/erc8004/metadata`
  const metadataResponse = await fetch(metadataUrl, {
    headers: { Accept: "application/json" },
  })
  expect(metadataResponse.ok, "ERC8004_PUBLIC_METADATA_UNREACHABLE")

  const metadata = await metadataResponse.json() as {
    name?: unknown
    registrations?: Array<{ agentId?: unknown; agentRegistry?: unknown }>
  }
  expect(
    typeof metadata.name === "string" && metadata.name.length > 0,
    "ERC8004_METADATA_NAME_MISSING"
  )

  const evidence = {
    verifiedAt: new Date().toISOString(),
    chainId: 42220,
    agent: {
      internalId: agent.id,
      executionWallet: agent.walletAddress,
      portalOwnerWallet: portalWallet.address,
      erc8004AgentId: agent.erc8004AgentId,
    },
    funding: {
      txHash: fundingTx.txHash,
      token: fundingTx.assetAddress,
      amountRaw: fundingTx.amountRaw?.toString(),
      blockNumber: fundingReceipt.blockNumber.toString(),
      exactTransferVerified: true,
    },
    approvedPurchase: {
      purchaseId: completedPurchase.id,
      merchantUrl: completedPurchase.merchantUrl,
      resourceUrl: completedPurchase.resourceUrl,
      settlementAsset: completedPurchase.selectedAsset,
      settlementAmountRaw: completedPurchase.settlementAmountRaw?.toString(),
      accountingCurrency: completedPurchase.accountingCurrency,
      accountingAmountMinor:
        completedPurchase.accountingAmountMinor?.toString(),
      payTo: paymentRequirement.payTo,
      txHash: x402Tx.txHash,
      blockNumber: x402Receipt.blockNumber.toString(),
      exactTransferVerified: true,
      spendReservation: reservation.status,
      rate: {
        provider: rateQuote.provider,
        numerator: rateQuote.rateNumerator.toString(),
        denominator: rateQuote.rateDenominator.toString(),
        quotedAt: rateQuote.quotedAt.toISOString(),
        expiresAt: rateQuote.expiresAt.toISOString(),
      },
      resource: {
        status: resource.httpStatus,
        contentType: resource.contentType,
        contentHash: resource.contentHash,
      },
    },
    blockedPurchase: {
      purchaseId: blockedPurchase.id,
      reasonCodes: blockedPolicy.reasonCodesJson,
      transactionCount: blockedTransactions.length,
      reservationCount: blockedReservations.length,
      txHash: null,
    },
    erc8004: {
      owner: erc8004Status.owner,
      registeredWallet: erc8004Status.registeredWallet,
      registerTxHash: registerTx.txHash,
      bindTxHash: bindTx.txHash,
      metadataUrl,
    },
    erc8021: {
      assignedCode: attributionCode,
      verifiedTxHash: attributedTx.txHash,
      observedCodes: attributedTx.observedCodes,
    },
  }

  await mkdir(".generated/evidence", { recursive: true })
  await writeFile(
    ".generated/evidence/live-e2e.json",
    JSON.stringify(evidence, null, 2) + "\n",
    "utf8"
  )

  console.log(JSON.stringify(evidence, null, 2))
  console.log("\nMurk live E2E evidence verification PASSED")
  console.log("Evidence written to .generated/evidence/live-e2e.json")
}

main().catch((error) => {
  console.error("\nMurk live E2E evidence verification FAILED")
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
