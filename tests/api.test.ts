/**
 * API security-boundary tests.
 *
 * Live authenticated-route behavior depends on the signed Portal-backed Murk
 * session and is covered by the browser/live integration gate. Unit tests here assert that
 * protected data and money-moving endpoints fail closed without authentication.
 */

import { describe, expect, it } from "vitest"
import { NextRequest } from "next/server"
import { GET as healthGet } from "../src/app/api/health/route"
import { GET as agentsGet, POST as agentsPost } from "../src/app/api/agents/route"
import { GET as agentDetailGet, PATCH as agentDetailPatch } from "../src/app/api/agents/[id]/route"
import { GET as agentBalancesGet } from "../src/app/api/agents/[id]/balances/route"
import { POST as agentPausePost } from "../src/app/api/agents/[id]/pause/route"
import { POST as agentResumePost } from "../src/app/api/agents/[id]/resume/route"
import {
  POST as agentFundPost,
  PUT as agentFundPreparePut,
} from "../src/app/api/agents/[id]/fund/route"
import { POST as agentWithdrawPost } from "../src/app/api/agents/[id]/withdraw/route"
import { POST as agentPurchasesPost } from "../src/app/api/agents/[id]/purchases/route"
import { GET as purchasesDetailGet } from "../src/app/api/purchases/[id]/route"
import { GET as purchaseReceiptGet } from "../src/app/api/purchases/[id]/receipt/route"
import { GET as activityGet } from "../src/app/api/activity/route"

function request(
  path: string,
  init: {
    method?: string
    headers?: HeadersInit
    body?: BodyInit | null
  } = {}
): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, init)
}

async function expectUnauthorized(response: Response) {
  expect(response.status).toBe(401)
  const body = await response.json()
  expect(body.error).toBe("AUTHORIZATION_REQUIRED")
}

describe("API security boundary", () => {
  it("keeps GET /api/health public and non-financial", async () => {
    const res = await healthGet()
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.status).toBe("ok")
    expect(json.components?.app).toBe("healthy")
  })

  it("protects the agent collection", async () => {
    await expectUnauthorized(await agentsGet(request("/api/agents")))

    await expectUnauthorized(
      await agentsPost(
        request("/api/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Procurement Agent",
            accountingCurrency: "NGN",
            timezone: "Africa/Lagos",
            dailyLimitMinor: "500000",
            perPurchaseLimitMinor: "200000",
            allowedAssets: ["USDC"],
          }),
        })
      )
    )
  })

  it("protects agent detail, balances, and policy mutation", async () => {
    const context = { params: Promise.resolve({ id: "agent_demo_01" }) }

    await expectUnauthorized(
      await agentDetailGet(request("/api/agents/agent_demo_01"), context)
    )
    await expectUnauthorized(
      await agentBalancesGet(
        request("/api/agents/agent_demo_01/balances"),
        context
      )
    )
    await expectUnauthorized(
      await agentDetailPatch(
        request("/api/agents/agent_demo_01", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dailyLimitMinor: "600000" }),
        }),
        context
      )
    )
  })

  it("protects pause and resume controls", async () => {
    const context = { params: Promise.resolve({ id: "agent_demo_01" }) }

    await expectUnauthorized(
      await agentPausePost(
        request("/api/agents/agent_demo_01/pause", { method: "POST" }),
        context
      )
    )
    await expectUnauthorized(
      await agentResumePost(
        request("/api/agents/agent_demo_01/resume", { method: "POST" }),
        context
      )
    )
  })

  it("protects all money-moving routes before parsing financial payloads", async () => {
    const context = { params: Promise.resolve({ id: "agent_demo_01" }) }

    await expectUnauthorized(
      await agentFundPost(
        request("/api/agents/agent_demo_01/fund", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assetSymbol: "USDC",
            amountRaw: "1000000",
            idempotencyKey: "fund_test_0001",
          }),
        }),
        context
      )
    )

    await expectUnauthorized(
      await agentFundPreparePut(
        request("/api/agents/agent_demo_01/fund", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assetSymbol: "USDC",
            amountRaw: "1000000",
          }),
        }),
        context
      )
    )

    await expectUnauthorized(
      await agentWithdrawPost(
        request("/api/agents/agent_demo_01/withdraw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assetSymbol: "USDC",
            amountRaw: "1000000",
            destinationAddress: "0x0000000000000000000000000000000000000001",
            idempotencyKey: "withdraw_test_0001",
          }),
        }),
        context
      )
    )

    await expectUnauthorized(
      await agentPurchasesPost(
        request("/api/agents/agent_demo_01/purchases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchantUrl: "https://merchant.example",
            resourceUrl: "https://merchant.example/resource",
            idempotencyKey: "purchase_test_0001",
          }),
        }),
        context
      )
    )
  })

  it("protects activity and purchase evidence from cross-user reads", async () => {
    await expectUnauthorized(await activityGet(request("/api/activity")))

    await expectUnauthorized(
      await purchasesDetailGet(request("/api/purchases/pur_01"), {
        params: Promise.resolve({ id: "pur_01" }),
      })
    )

    await expectUnauthorized(
      await purchaseReceiptGet(request("/api/purchases/pur_01/receipt"), {
        params: Promise.resolve({ id: "pur_01" }),
      })
    )
  })
})
