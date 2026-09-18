/**
 * x402 Protocol Client & Settlement Integration
 * Handles 402 challenges, requirement extraction, settlement via facilitator, and resource retrieval.
 */

import { MerchantRequirementOption } from "../core/types"
import { parseX402Response, X402PaymentRequirement } from "../../spikes/spike-c-x402-purchase"

export const X402_FACILITATOR_URL = process.env.X402_FACILITATOR_URL || "https://api.x402.celo.org"

export type ResourceRequestResult =
  | {
      type: "DELIVERED"
      status: number
      contentType: string
      data: any
    }
  | {
      type: "PAYMENT_REQUIRED"
      status: 402
      requirements: MerchantRequirementOption[]
      rawHeaders: Record<string, string>
      rawPayload: unknown
    }

export async function requestResource(url: string, headers: Record<string, string> = {}): Promise<ResourceRequestResult> {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...headers,
    },
  })

  if (res.status === 402) {
    let body: any = null
    try {
      body = await res.json()
    } catch {
      body = {}
    }

    const parsed = parseX402Response(402, res.headers, body)

    const options: MerchantRequirementOption[] = parsed.requirements.map((r) => ({
      scheme: r.scheme,
      network: r.network,
      chainId: r.chainId,
      assetAddress: r.assetAddress,
      amountRaw: r.amountRaw,
      payTo: r.payTo,
      extra: r.extra,
    }))

    return {
      type: "PAYMENT_REQUIRED",
      status: 402,
      requirements: options,
      rawHeaders: parsed.rawHeaders,
      rawPayload: body,
    }
  }

  const contentType = res.headers.get("content-type") || "application/json"
  let data: any
  try {
    data = await res.json()
  } catch {
    data = await res.text()
  }

  return {
    type: "DELIVERED",
    status: res.status,
    contentType,
    data,
  }
}
