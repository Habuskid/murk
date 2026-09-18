import { afterEach, describe, expect, it } from "vitest"
import {
  encodeAbiParameters,
  encodeEventTopics,
  type Address,
  type Hex,
} from "viem"
import { Attribution } from "ox/erc8021"
import {
  appendMurkAttribution,
  getConfiguredAttributionCode,
  requireMurkAttributionSuffix,
} from "../src/services/attribution"
import {
  CELO_TOKENS,
  IS_CELO_SEPOLIA,
  tokenRawToFeeUnits,
} from "../src/services/celo"
import {
  ERC20_TRANSFER_ABI,
  hasExactErc20Transfer,
} from "../src/services/funding"
import {
  assertRegisteredAgentMatches,
  buildRegisterTransaction,
} from "../src/services/erc8004"

const TOKEN = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as Address
const FROM = "0x1111111111111111111111111111111111111111" as Address
const TO = "0x2222222222222222222222222222222222222222" as Address

function transferLog(input?: {
  token?: Address
  from?: Address
  to?: Address
  amount?: bigint
}) {
  const token = input?.token ?? TOKEN
  const from = input?.from ?? FROM
  const to = input?.to ?? TO
  const amount = input?.amount ?? 1_000_000n

  const topics = encodeEventTopics({
    abi: ERC20_TRANSFER_ABI,
    eventName: "Transfer",
    args: { from, to },
  }) as [Hex, ...Hex[]]

  return {
    address: token,
    topics,
    data: encodeAbiParameters([{ type: "uint256" }], [amount]),
  } as const
}

afterEach(() => {
  delete process.env.CELO_ATTRIBUTION_CODE
})

describe("onchain integrity", () => {
  it("accepts only the exact confirmed ERC-20 funding transfer", () => {
    const exact = transferLog()

    expect(
      hasExactErc20Transfer({
        logs: [exact],
        tokenAddress: TOKEN,
        expectedFrom: FROM,
        expectedTo: TO,
        expectedAmount: 1_000_000n,
      })
    ).toBe(true)

    expect(
      hasExactErc20Transfer({
        logs: [exact],
        tokenAddress: TOKEN,
        expectedFrom: FROM,
        expectedTo: TO,
        expectedAmount: 999_999n,
      })
    ).toBe(false)

    expect(
      hasExactErc20Transfer({
        logs: [exact],
        tokenAddress: TOKEN,
        expectedFrom: FROM,
        expectedTo: "0x3333333333333333333333333333333333333333",
        expectedAmount: 1_000_000n,
      })
    ).toBe(false)

    expect(
      hasExactErc20Transfer({
        logs: [exact],
        tokenAddress: "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e",
        expectedFrom: FROM,
        expectedTo: TO,
        expectedAmount: 1_000_000n,
      })
    ).toBe(false)
  })

  it("appends a decodable ERC-8021 Murk attribution code", () => {
    process.env.CELO_ATTRIBUTION_CODE = "murk"
    const baseData = "0xa9059cbb" as Hex

    const tagged = appendMurkAttribution(baseData)
    const decoded = Attribution.fromData(tagged)

    expect(tagged.startsWith(baseData)).toBe(true)
    expect(decoded).toBeDefined()
    expect(decoded && "codes" in decoded ? decoded.codes : []).toContain("murk")
    expect(getConfiguredAttributionCode()).toBe("murk")
  })

  it("adds the same ERC-8021 suffix to ERC-8004 registration calldata", () => {
    const uri = "https://murk.example/api/agents/agent_01/erc8004/metadata"

    delete process.env.CELO_ATTRIBUTION_CODE
    const untagged = buildRegisterTransaction(uri)

    process.env.CELO_ATTRIBUTION_CODE = "murk"
    const tagged = buildRegisterTransaction(uri)
    const decoded = Attribution.fromData(tagged.data)

    expect(tagged.data.startsWith(untagged.data)).toBe(true)
    expect(decoded && "codes" in decoded ? decoded.codes : []).toContain("murk")
  })

  it("uses only verified fee configuration for the active Celo network", () => {
    const usdc = CELO_TOKENS.USDC
    const usdt = CELO_TOKENS.USDT

    expect(usdc.decimals).toBe(6)
    expect(usdt.decimals).toBe(6)
    expect(usdc.feeCurrencyAddress).not.toBe(usdc.address)
    expect(usdt.feeCurrencyAddress).not.toBe(usdt.address)

    if (IS_CELO_SEPOLIA) {
      expect(usdc.address).toBe(
        "0x01C5C0122039549AD1493B8220cABEdD739BC44E"
      )
      expect(usdc.feeCurrencyAddress).toBe(
        "0xbf1441Ea57f43f35f713431001f35742c88071c7"
      )
      expect(usdt.address).toBe(
        "0xd077A400968890Eacc75cdc901F0356c943e4fDb"
      )
      expect(usdt.feeCurrencyAddress).toBe(
        "0xe19447B12cb0d0220B2a501D8382be2f61CcF92a"
      )
    } else {
      expect(usdc.address).toBe(
        "0xcebA9300f2b948710d2653dD7B07f33A8B32118C"
      )
      expect(usdc.feeCurrencyAddress).toBe(
        "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B"
      )
      expect(usdt.address).toBe(
        "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e"
      )
      expect(usdt.feeCurrencyAddress).toBe(
        "0x0E2A3e05bc9A16F5292A6170456A710cb89C6f72"
      )
    }

    expect(tokenRawToFeeUnits(1_000_000n, 6)).toBe(
      1_000_000_000_000_000_000n
    )
  })

  it("accepts only the exact owner and Murk metadata URI for ERC-8004 registration", () => {
    const expectedURI =
      "https://murk.example/api/agents/agent_01/erc8004/metadata"

    expect(() =>
      assertRegisteredAgentMatches({
        actualOwner: FROM,
        actualAgentURI: expectedURI,
        expectedOwner: FROM,
        expectedAgentURI: expectedURI,
      })
    ).not.toThrow()

    expect(() =>
      assertRegisteredAgentMatches({
        actualOwner: TO,
        actualAgentURI: expectedURI,
        expectedOwner: FROM,
        expectedAgentURI: expectedURI,
      })
    ).toThrow("ERC8004_REGISTRATION_OWNER_MISMATCH")

    expect(() =>
      assertRegisteredAgentMatches({
        actualOwner: FROM,
        actualAgentURI: "https://other.example/agent.json",
        expectedOwner: FROM,
        expectedAgentURI: expectedURI,
      })
    ).toThrow("ERC8004_REGISTRATION_URI_MISMATCH")
  })

  it("fails closed for invalid or missing attribution configuration", () => {
    expect(() => requireMurkAttributionSuffix()).toThrow(
      "CELO_ATTRIBUTION_CODE_NOT_CONFIGURED"
    )

    process.env.CELO_ATTRIBUTION_CODE = "MURK INVALID"
    expect(() => getConfiguredAttributionCode()).toThrow(
      "CELO_ATTRIBUTION_CODE_INVALID"
    )
  })
})
