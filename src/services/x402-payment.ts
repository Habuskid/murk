/**
 * Live x402 v2 payment executor for Murk's server-side agent wallet.
 *
 * The Murk policy engine chooses and approves an exact payment requirement first.
 * This adapter then configures x402's selector to accept only that already-approved
 * requirement. It must never silently choose a different token, amount, recipient,
 * network, or scheme.
 */

import { x402Client, x402HTTPClient } from "@x402/core/client"
import { wrapFetchWithPayment } from "@x402/fetch"
import { ExactEvmScheme } from "@x402/evm/exact/client"
import { CELO_RPC_URL } from "./celo"
import { resolveAgentExecutionWallet } from "./agent-wallet"

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
  deliveredResource: unknown
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
        client: new ExactEvmScheme(executionWallet.x402Signer, { rpcUrl: CELO_RPC_URL }),
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
          normalizeAddress(candidate.asset) === normalizeAddress(approved.assetAddress) &&
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
  const response = await fetchWithPayment(approved.resourceUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(`X402_RESOURCE_REQUEST_FAILED_${response.status}`)
  }

  const settlement = new x402HTTPClient(client).getPaymentSettleResponse((name) =>
    response.headers.get(name)
  )

  if (!settlement?.success || !settlement.transaction) {
    throw new Error("X402_SETTLEMENT_EVIDENCE_MISSING")
  }

  const txHash = settlement.transaction as `0x${string}`
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    throw new Error("X402_SETTLEMENT_TX_HASH_INVALID")
  }

  const deliveredResource = await readDeliveredBody(response)

  return {
    txHash,
    deliveredResource,
  }
}
