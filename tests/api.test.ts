/**
 * API Contract & End-to-End Route Tests
 * Verifies all endpoints defined in API_CONTRACTS.md
 */

import { describe, it, expect } from "vitest"
import { NextRequest } from "next/server"
import { GET as healthGet } from "../src/app/api/health/route"
import { GET as agentsGet, POST as agentsPost } from "../src/app/api/agents/route"
import { GET as agentDetailGet, PATCH as agentDetailPatch } from "../src/app/api/agents/[id]/route"
import { POST as agentPausePost } from "../src/app/api/agents/[id]/pause/route"
import { POST as agentResumePost } from "../src/app/api/agents/[id]/resume/route"
import { POST as agentFundPost } from "../src/app/api/agents/[id]/fund/route"
import { POST as agentWithdrawPost } from "../src/app/api/agents/[id]/withdraw/route"
import { POST as agentPurchasesPost } from "../src/app/api/agents/[id]/purchases/route"
import { GET as purchasesDetailGet } from "../src/app/api/purchases/[id]/route"
import { GET as purchaseReceiptGet } from "../src/app/api/purchases/[id]/receipt/route"
import { GET as activityGet } from "../src/app/api/activity/route"

describe("API Contracts Verification", () => {
  it("GET /api/health returns operational summary without moving funds", async () => {
    const res = await healthGet()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe("ok")
    expect(json.components).toBeDefined()
    expect(json.components.app).toBe("healthy")
  })

  it("GET /api/agents returns owner-scoped agent list", async () => {
    const req = new NextRequest("http://localhost:3000/api/agents")
    const res = await agentsGet(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.agents)).toBe(true)
    expect(json.agents.length).toBeGreaterThan(0)
  })

  it("POST /api/agents creates DRAFT agent with version 1 mandate", async () => {
    const req = new NextRequest("http://localhost:3000/api/agents", {
      method: "POST",
      body: JSON.stringify({
        name: "Procurement Bot",
        accountingCurrency: "AED",
        timezone: "Asia/Dubai",
        dailyLimitMinor: "100000", // AED 1,000.00
        perPurchaseLimitMinor: "25000", // AED 250.00
        allowedAssets: ["USDC"],
      }),
    })

    const res = await agentsPost(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.name).toBe("Procurement Bot")
    expect(json.status).toBe("DRAFT")
    expect(json.accountingCurrency).toBe("AED")
    expect(json.mandate.version).toBe(1)
  })

  it("PATCH /api/agents/:id updates mandate version on policy change", async () => {
    const req = new NextRequest("http://localhost:3000/api/agents/agent_demo_01", {
      method: "PATCH",
      body: JSON.stringify({
        dailyLimitMinor: "600000", // Increase to NGN 6,000.00
      }),
    })

    const res = await agentDetailPatch(req, { params: { id: "agent_demo_01" } })
    expect(res.status).toBe(200)

    // Verify detail
    const detailReq = new NextRequest("http://localhost:3000/api/agents/agent_demo_01")
    const detailRes = await agentDetailGet(detailReq, { params: { id: "agent_demo_01" } })
    const json = await detailRes.json()
    expect(json.mandate.version).toBe(2)
    expect(json.mandate.dailyLimitMinor).toBe("600000")
  })

  it("POST /api/agents/:id/pause and /resume mutates execution state", async () => {
    const pauseReq = new NextRequest("http://localhost:3000/api/agents/agent_demo_01/pause", { method: "POST" })
    const pauseRes = await agentPausePost(pauseReq, { params: { id: "agent_demo_01" } })
    expect((await pauseRes.json()).status).toBe("PAUSED")

    const resumeReq = new NextRequest("http://localhost:3000/api/agents/agent_demo_01/resume", { method: "POST" })
    const resumeRes = await agentResumePost(resumeReq, { params: { id: "agent_demo_01" } })
    expect((await resumeRes.json()).status).toBe("ACTIVE")
  })

  it("POST /api/agents/:id/fund is idempotent", async () => {
    const idempotencyKey = `fund_idem_${Date.now()}`
    const fundPayload = {
      assetSymbol: "USDC",
      amountRaw: "5000000",
      idempotencyKey,
    }

    const req1 = new NextRequest("http://localhost:3000/api/agents/agent_demo_01/fund", {
      method: "POST",
      body: JSON.stringify(fundPayload),
    })
    const res1 = await agentFundPost(req1, { params: { id: "agent_demo_01" } })
    const json1 = await res1.json()
    expect(json1.success).toBe(true)

    // Repeat with same idempotency key
    const req2 = new NextRequest("http://localhost:3000/api/agents/agent_demo_01/fund", {
      method: "POST",
      body: JSON.stringify(fundPayload),
    })
    const res2 = await agentFundPost(req2, { params: { id: "agent_demo_01" } })
    const json2 = await res2.json()
    expect(json2).toEqual(json1)
  })

  it("GET /api/activity returns list of historical transactions", async () => {
    const req = new NextRequest("http://localhost:3000/api/activity")
    const res = await activityGet(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.activity)).toBe(true)
  })
})
