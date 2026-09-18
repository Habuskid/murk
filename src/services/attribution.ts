import { Attribution } from "ox/erc8021"
import { concat, type Hex } from "viem"
import { getCeloClient } from "./celo"

const ATTRIBUTION_PATTERN = /^[a-z0-9_]{1,32}$/

export function getConfiguredAttributionCode(): string | null {
  const code = process.env.CELO_ATTRIBUTION_CODE?.trim()
  if (!code) return null

  if (!ATTRIBUTION_PATTERN.test(code)) {
    throw new Error("CELO_ATTRIBUTION_CODE_INVALID")
  }

  return code
}

function toDataSuffix(code: string): Hex {
  return Attribution.toDataSuffix({ codes: [code] }) as Hex
}

export function appendMurkAttribution(data: Hex): Hex {
  const code = getConfiguredAttributionCode()
  if (!code) return data

  return concat([data, toDataSuffix(code)])
}

export function requireMurkAttributionSuffix(): Hex {
  const code = getConfiguredAttributionCode()
  if (!code) {
    throw new Error("CELO_ATTRIBUTION_CODE_NOT_CONFIGURED")
  }

  return toDataSuffix(code)
}

export async function verifyMurkAttribution(hash: Hex): Promise<{
  configuredCode: string | null
  verified: boolean
  observedCodes: string[]
}> {
  const configuredCode = getConfiguredAttributionCode()
  if (!configuredCode) {
    return {
      configuredCode: null,
      verified: false,
      observedCodes: [],
    }
  }

  try {
    const tx = await getCeloClient().getTransaction({ hash })
    const decoded = Attribution.fromData(tx.input as Hex)

    const observedCodes =
      decoded && "codes" in decoded && Array.isArray(decoded.codes)
        ? [...decoded.codes]
        : []

    return {
      configuredCode,
      verified: observedCodes.includes(configuredCode),
      observedCodes,
    }
  } catch {
    return {
      configuredCode,
      verified: false,
      observedCodes: [],
    }
  }
}
