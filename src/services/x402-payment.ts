/**
 * Live x402 v2 payment executor for Murk's server-side agent wallet.
 *
 * Murk policy approves one exact payment requirement before this adapter runs.
 * The executor constrains x402 to that exact requirement, then independently
 * verifies the resulting Celo settlement receipt contains the exact ERC-20
 * transfer Murk approved.
 */

import { x402Client, x402HTTPClient } from "@x402/core/client"
import { wrapFetchWithPayment } from "@x402/fetch"
import { ExactEvmScheme } from "@x402/evm/exact/client"
import { CELO_RPC_URL, getCeloClient } from "./celo"
import { resolveAgentExecutionWallet } from "./agent-wallet"
import { hasExactErc20Transfer } from "./funding"

export type ApprovedX402Payment = {
  agentId: string
  selectedAsset: string
  assetAddress: string
  amountRaw: bigint
  payTo: string
  resourceUrl: string
}

export type LiveX402PaymentResult = {
  txHash: `0x${string}`
  deliveredResource?: unknown
  resourceFailure?: {
    status: number
    contentType: string
  }
}

export class X402PaymentOutcomeUncertainError extends Error {
  readonly code = "X402_PAYMENT_OUTCOME_UNCERTAIN"
  readonly txHash?: `0x${string}`

  constructor(cause?: unknown, txHash?: `0x${string}`) {
    super("X402_PAYMENT_OUTCOME_UNCERTAIN")
    this.name = "X402PaymentOutcomeUncertainError"
    this.txHash = txHash
    if (cause !== undefined) {
      ;(this as Error & { cause?: unknown }).cause = cause
    }
  }
}

export class X402SettlementRevertedError extends Error {
  readonly code = "X402_SETTLEMENT_REVERTED"
  readonly txHash: `0x${string}`

  constructor(txHash: `0x${string}`) {
    super("X402_SETTLEMENT_REVERTED")
    this.name = "X402SettlementRevertedError"
    this.txHash = txHash
  }
}

function normalizeAddress(value: string): string {
  return value.toLowerCase()
}

async function readDeliveredBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function executeApprovedX402Payment(
  approved: ApprovedX402Payment
): Promise<LiveX402PaymentResult> {
  const executionWallet = await resolveAgentExecutionWallet(approved.agentId)

  const client = x402Client.fromConfig({
    schemes: [
      {
        network: "eip155:42220",
        client: new ExactEvmScheme(executionWallet.x402Signer, {
          rpcUrl: CELO_RPC_URL,
        }),
      },
    ],
    // Murk already performs stricter local-currency policy evaluation before
    // this executor is called. The x402 SDK must not introduce a competing
    // token/USD policy layer that can change Murk's approved decision.
    spendControls: false,
    paymentRequirementsSelector: (_version, accepts) => {
      const exact = accepts.find((candidate) => {
        return (
          candidate.scheme === "exact" &&
          candidate.network === "eip155:42220" &&
          normalizeAddress(candidate.asset) ===
            normalizeAddress(approved.assetAddress) &&
          BigInt(candidate.amount) === approved.amountRaw &&
          normalizeAddress(candidate.payTo) === normalizeAddress(approved.payTo)
        )
      })

      if (!exact) {
        throw new Error("X402_TERMS_CHANGED_AFTER_POLICY_APPROVAL")
      }

      return exact
    },
  })

  const fetchWithPayment = wrapFetchWithPayment(fetch, client)

  let response: Response
  try {
    response = await fetchWithPayment(approved.resourceUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    })
  } catch (cause) {
    // Once the x402 wrapper is invoked, Murk cannot prove whether failure
    // occurred before or after payment submission. Keep spend reserved.
    throw new X402PaymentOutcomeUncertainError(cause)
  }

  const settlement = new x402HTTPClient(client).getPaymentSettleResponse((name) =>
    response.headers.get(name)
  )

  if (!settlement?.success || !settlement.transaction) {
    // The payment wrapper has already been invoked. Without a definitive
    // settlement result Murk cannot safely assume zero funds moved.
    throw new X402PaymentOutcomeUncertainError(
      new Error("X402_SETTLEMENT_EVIDENCE_MISSING")
    )
  }

  const txHash = settlement.transaction as `0x${string}`
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    throw new Error("X402_SETTLEMENT_TX_HASH_INVALID")
  }

  // From this point onward a settlement hash exists. Any inability to prove
  // the final onchain state is financially uncertain and must never release
  // the spend reservation or trigger another automatic payment.
  let receipt
  try {
    receipt = await getCeloClient().waitForTransactionReceipt({
      hash: txHash,
      confirmations: 1,
      timeout: 60_000,
    })
  } catch (cause) {
    throw new X402PaymentOutcomeUncertainError(cause, txHash)
  }

  if (receipt.status !== "success") {
    throw new X402SettlementRevertedError(txHash)
  }

  const exactTransfer = hasExactErc20Transfer({
    logs: receipt.logs,
    tokenAddress: approved.assetAddress as `0x${string}`,
    expectedFrom: executionWallet.address,
    expectedTo: approved.payTo as `0x${string}`,
    expectedAmount: approved.amountRaw,
  })

  if (!exactTransfer) {
    throw new X402PaymentOutcomeUncertainError(
      new Error("X402_SETTLEMENT_TRANSFER_MISMATCH"),
      txHash
    )
  }

  if (!response.ok) {
    return {
      txHash,
      resourceFailure: {
        status: response.status,
        contentType:
          response.headers.get("content-type") || "application/octet-stream",
      },
    }
  }

  const deliveredResource = await readDeliveredBody(response)

  return {
    txHash,
    deliveredResource,
  }
}
