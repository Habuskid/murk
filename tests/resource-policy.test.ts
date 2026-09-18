import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { assertAllowedX402Purchase } from "../src/lib/resource-policy"

const original = {
  approved: process.env.NEXT_PUBLIC_X402_RESOURCE_URL,
  blocked: process.env.NEXT_PUBLIC_X402_BLOCKED_RESOURCE_URL,
  fixture: process.env.ENABLE_LOCAL_X402_FIXTURE,
  network: process.env.NEXT_PUBLIC_MURK_NETWORK,
  testnetMerchant: process.env.ENABLE_TESTNET_X402_MERCHANT,
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_X402_RESOURCE_URL =
    "https://merchant.example/api/paid?q=celo"
  delete process.env.NEXT_PUBLIC_X402_BLOCKED_RESOURCE_URL
  process.env.ENABLE_LOCAL_X402_FIXTURE = "false"
  process.env.NEXT_PUBLIC_MURK_NETWORK = "testnet"
  process.env.ENABLE_TESTNET_X402_MERCHANT = "false"
})

afterEach(() => {
  if (original.approved === undefined) {
    delete process.env.NEXT_PUBLIC_X402_RESOURCE_URL
  } else {
    process.env.NEXT_PUBLIC_X402_RESOURCE_URL = original.approved
  }

  if (original.blocked === undefined) {
    delete process.env.NEXT_PUBLIC_X402_BLOCKED_RESOURCE_URL
  } else {
    process.env.NEXT_PUBLIC_X402_BLOCKED_RESOURCE_URL = original.blocked
  }

  if (original.fixture === undefined) {
    delete process.env.ENABLE_LOCAL_X402_FIXTURE
  } else {
    process.env.ENABLE_LOCAL_X402_FIXTURE = original.fixture
  }

  if (original.network === undefined) {
    delete process.env.NEXT_PUBLIC_MURK_NETWORK
  } else {
    process.env.NEXT_PUBLIC_MURK_NETWORK = original.network
  }

  if (original.testnetMerchant === undefined) {
    delete process.env.ENABLE_TESTNET_X402_MERCHANT
  } else {
    process.env.ENABLE_TESTNET_X402_MERCHANT = original.testnetMerchant
  }
})

describe("x402 resource policy", () => {
  it("allows the exact configured external resource", () => {
    expect(
      assertAllowedX402Purchase({
        merchantUrl: "https://merchant.example",
        resourceUrl: "https://merchant.example/api/paid?q=celo",
      })
    ).toEqual({
      merchantOrigin: "https://merchant.example",
      resourceUrl: "https://merchant.example/api/paid?q=celo",
    })
  })

  it("rejects a different path on the same merchant", () => {
    expect(() =>
      assertAllowedX402Purchase({
        merchantUrl: "https://merchant.example",
        resourceUrl: "https://merchant.example/admin",
      })
    ).toThrow("X402_RESOURCE_NOT_ALLOWED")
  })

  it("rejects merchant/resource origin mismatches", () => {
    expect(() =>
      assertAllowedX402Purchase({
        merchantUrl: "https://merchant.example",
        resourceUrl: "https://other.example/api/paid?q=celo",
      })
    ).toThrow("X402_MERCHANT_RESOURCE_ORIGIN_MISMATCH")
  })

  it("rejects private literal targets even if configured", () => {
    process.env.NEXT_PUBLIC_X402_RESOURCE_URL =
      "https://127.0.0.1/api/merchant/paid"

    expect(() =>
      assertAllowedX402Purchase({
        merchantUrl: "https://127.0.0.1",
        resourceUrl: "https://127.0.0.1/api/merchant/paid",
      })
    ).toThrow("X402_RESOURCE_PRIVATE_HOST_NOT_ALLOWED")
  })

  it("rejects non-HTTPS external resources", () => {
    process.env.NEXT_PUBLIC_X402_RESOURCE_URL =
      "http://merchant.example/api/paid"

    expect(() =>
      assertAllowedX402Purchase({
        merchantUrl: "http://merchant.example",
        resourceUrl: "http://merchant.example/api/paid",
      })
    ).toThrow("X402_RESOURCE_HTTPS_REQUIRED")
  })

  it("allows only the exact guarded same-origin Sepolia settlement harness", () => {
    delete process.env.NEXT_PUBLIC_X402_RESOURCE_URL
    delete process.env.NEXT_PUBLIC_X402_BLOCKED_RESOURCE_URL
    process.env.ENABLE_TESTNET_X402_MERCHANT = "true"

    expect(
      assertAllowedX402Purchase({
        merchantUrl: "https://murk-staging.example",
        resourceUrl: "https://murk-staging.example/api/testnet/x402-resource",
      })
    ).toEqual({
      merchantOrigin: "https://murk-staging.example",
      resourceUrl: "https://murk-staging.example/api/testnet/x402-resource",
    })

    expect(() =>
      assertAllowedX402Purchase({
        merchantUrl: "https://murk-staging.example",
        resourceUrl: "https://murk-staging.example/api/testnet/other",
      })
    ).toThrow("X402_RESOURCE_NOT_CONFIGURED")
  })

  it("rejects the Sepolia settlement harness in mainnet mode", () => {
    delete process.env.NEXT_PUBLIC_X402_RESOURCE_URL
    delete process.env.NEXT_PUBLIC_X402_BLOCKED_RESOURCE_URL
    process.env.NEXT_PUBLIC_MURK_NETWORK = "mainnet"
    process.env.ENABLE_TESTNET_X402_MERCHANT = "true"

    expect(() =>
      assertAllowedX402Purchase({
        merchantUrl: "https://murk.example",
        resourceUrl: "https://murk.example/api/testnet/x402-resource",
      })
    ).toThrow("X402_RESOURCE_NOT_CONFIGURED")
  })

  it("fails closed when no resource is configured", () => {
    delete process.env.NEXT_PUBLIC_X402_RESOURCE_URL
    delete process.env.NEXT_PUBLIC_X402_BLOCKED_RESOURCE_URL

    expect(() =>
      assertAllowedX402Purchase({
        merchantUrl: "https://merchant.example",
        resourceUrl: "https://merchant.example/api/paid",
      })
    ).toThrow("X402_RESOURCE_NOT_CONFIGURED")
  })
})
