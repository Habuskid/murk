/**
 * x402 protocol transport.
 *
 * Detects both x402 v2 PAYMENT-REQUIRED headers and legacy body-formatted
 * challenges, then normalizes only the facts Murk needs for policy evaluation.
 */

import { x402Client, x402HTTPClient } from "@x402/core/client"
import { MerchantRequirementOption } from "../core/types"

export type ResourceRequestResult =
  | {
      type: "DELIVERED"
      status: number
      contentType: string
      data: unknown
    }
  | {
      type: "PAYMENT_REQUIRED"
      status: 402
      requirements: MerchantRequirementOption[]
      rawHeaders: Record<string, string>
      rawPayload: unknown
    }

function toRawHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {}
  headers.forEach((value, key) => {
    result[key.toLowerCase()] = value
  })
  return result
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function requestResource(
  url: string,
  headers: Record<string, string> = {}
): Promise<ResourceRequestResult> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...headers,
    },
    redirect: "follow",
  })

  const contentType = response.headers.get("content-type") || "application/octet-stream"
  const body = await readResponseBody(response)

  if (response.status !== 402) {
    return {
      type: "DELIVERED",
      status: response.status,
      contentType,
      data: body,
    }
  }

  const httpClient = new x402HTTPClient(new x402Client({ spendControls: false }))
  const paymentRequired = httpClient.getPaymentRequiredResponse(
    (name) => response.headers.get(name),
    body
  )

  const requirements: MerchantRequirementOption[] = paymentRequired.accepts
    .filter((item) => item.network === "eip155:42220")
    .map((item) => ({
      scheme: item.scheme,
      network: item.network,
      chainId: 42220,
      assetAddress: item.asset as `0x${string}`,
      amountRaw: BigInt(item.amount),
      payTo: item.payTo as `0x${string}`,
      extra: item.extra,
    }))

  if (requirements.length === 0) {
    throw new Error("NO_SUPPORTED_CELO_X402_REQUIREMENTS")
  }

  return {
    type: "PAYMENT_REQUIRED",
    status: 402,
    requirements,
    rawHeaders: toRawHeaders(response.headers),
    rawPayload: body,
  }
}
