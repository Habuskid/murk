import { chromium, expect } from "@playwright/test"
import { mkdir } from "node:fs/promises"

const baseUrl = process.env.UI_BASE_URL || "http://127.0.0.1:3000"
const outputDir = "artifacts/ui"
await mkdir(outputDir, { recursive: true })

const browser = await chromium.launch()

const cases = [
  { name: "mobile-narrow-home", width: 320, height: 740, path: "/ui-sandbox", kind: "app" },
  { name: "mobile-home", width: 390, height: 844, path: "/ui-sandbox", kind: "app" },
  { name: "mobile-paused", width: 390, height: 844, path: "/ui-sandbox", kind: "paused" },
  { name: "mobile-agent", width: 390, height: 844, path: "/ui-sandbox", kind: "app-agent" },
  { name: "mobile-activity", width: 390, height: 844, path: "/ui-sandbox", kind: "app-activity" },
  { name: "mobile-empty-activity", width: 390, height: 844, path: "/ui-sandbox?activity=empty", kind: "empty-activity" },
  { name: "mobile-policy", width: 390, height: 844, path: "/ui-sandbox", kind: "app-policy" },
  { name: "mobile-purchase-settled", width: 390, height: 844, path: "/ui-sandbox", kind: "purchase-approved" },
  { name: "mobile-purchase-blocked", width: 390, height: 844, path: "/ui-sandbox", kind: "purchase-blocked" },
  { name: "mobile-identity-unregistered", width: 390, height: 844, path: "/ui-sandbox", kind: "identity", identityState: "unregistered" },
  { name: "mobile-identity-needs-binding", width: 390, height: 844, path: "/ui-sandbox", kind: "identity", identityState: "binding" },
  { name: "mobile-identity-verified", width: 390, height: 844, path: "/ui-sandbox", kind: "identity", identityState: "verified" },
  { name: "tablet-home", width: 768, height: 1024, path: "/ui-sandbox", kind: "app" },
  { name: "desktop-home", width: 1280, height: 900, path: "/ui-sandbox", kind: "app" },
  { name: "auth-loading", width: 320, height: 740, path: "/ui-sandbox/auth?state=loading", kind: "auth-loading" },
  { name: "auth-mobile", width: 320, height: 740, path: "/ui-sandbox/auth", kind: "auth-flow" },
  { name: "auth-desktop", width: 1280, height: 900, path: "/ui-sandbox/auth", kind: "auth-static" },
  { name: "onboarding-mobile", width: 320, height: 740, path: "/ui-sandbox/onboarding", kind: "onboarding" },
  { name: "onboarding-desktop", width: 1280, height: 900, path: "/ui-sandbox/onboarding", kind: "onboarding" },
]

const expectedOwner = "0x1111111111111111111111111111111111111111"
const expectedAgentWallet = "0x4Fb3d9A9f92C330E705d9a8777e7419eCA9B19A2"
const settledTx =
  "0x6c7a33b94ba4e7321180c275c330668fd03f3fdc0f40fe69993c028dce0a1211"

function identityFixture(state = "unregistered") {
  if (state === "verified") {
    return {
      registered: true,
      agentId: "42",
      owner: expectedOwner,
      registeredWallet: expectedAgentWallet,
      expectedOwner,
      expectedAgentWallet,
      ownerMatches: true,
      walletBound: true,
    }
  }

  if (state === "binding") {
    return {
      registered: true,
      agentId: "42",
      owner: expectedOwner,
      registeredWallet: expectedOwner,
      expectedOwner,
      expectedAgentWallet,
      ownerMatches: true,
      walletBound: false,
    }
  }

  return {
    registered: false,
    agentId: null,
    owner: null,
    registeredWallet: null,
    expectedOwner,
    expectedAgentWallet,
    ownerMatches: false,
    walletBound: false,
  }
}

function purchaseFixture(blocked) {
  const receipt = {
    purchaseId: blocked ? "pur_sandbox_blocked" : "pur_sandbox_settled",
    agentName: "Research Agent",
    merchantUrl: "https://agent402.tools",
    resourceUrl: "https://agent402.tools/api/answer?q=what%20is%20celo",
    settlementAsset: "USDC",
    settlementAmountRaw: "1000000",
    settlementAmountFormatted: "1.00",
    accountingCurrency: "NGN",
    accountingValueMinor: "162000",
    accountingValueFormatted: "1,620.00",
    rateSource: "open.er-api.com",
    rateTimestamp: "2026-09-18T12:00:00.000Z",
    rateNumerator: "1620000000",
    rateDenominator: "1000000",
    policyDecision: blocked ? "BLOCKED" : "APPROVED",
    reasonCodes: blocked ? ["PER_PURCHASE_LIMIT_EXCEEDED"] : [],
    humanReadableReasons: blocked ? ["Per-purchase limit exceeded"] : [],
    network: "Celo Mainnet (42220)",
    chainId: 42220,
    txHash: blocked ? null : settledTx,
    resourceDeliveryStatus: blocked ? "NOT_REQUESTED" : "DELIVERED",
    remainingMandateMinor: blocked ? "500000" : "338000",
    remainingMandateFormatted: blocked ? "5,000.00" : "3,380.00",
    createdAt: "2026-09-18T12:00:00.000Z",
  }

  return {
    purchaseId: receipt.purchaseId,
    state: blocked ? "POLICY_BLOCKED" : "COMPLETED",
    receipt,
    deliveredResource: blocked ? undefined : { answer: "Celo is an EVM L2." },
    steps: blocked
      ? [
          { step: "CREATED", timestamp: receipt.createdAt, detail: "Created" },
          { step: "PAYMENT_REQUIRED", timestamp: receipt.createdAt, detail: "402" },
          { step: "ASSET_SELECTED", timestamp: receipt.createdAt, detail: "USDC" },
          { step: "RATE_RESOLVED", timestamp: receipt.createdAt, detail: "NGN" },
          { step: "POLICY_BLOCKED", timestamp: receipt.createdAt, detail: "Blocked" },
        ]
      : [
          { step: "CREATED", timestamp: receipt.createdAt, detail: "Created" },
          { step: "PAYMENT_REQUIRED", timestamp: receipt.createdAt, detail: "402" },
          { step: "ASSET_SELECTED", timestamp: receipt.createdAt, detail: "USDC" },
          { step: "RATE_RESOLVED", timestamp: receipt.createdAt, detail: "NGN" },
          { step: "POLICY_APPROVED", timestamp: receipt.createdAt, detail: "Approved" },
          { step: "SPEND_RESERVED", timestamp: receipt.createdAt, detail: "Reserved" },
          { step: "PAYMENT_SETTLED", timestamp: receipt.createdAt, detail: "Settled" },
          { step: "RESOURCE_RECEIVED", timestamp: receipt.createdAt, detail: "Delivered" },
          { step: "COMPLETED", timestamp: receipt.createdAt, detail: "Completed" },
        ],
  }
}

async function installFixtures(page, testCase) {
  await page.route("**/api/agents/sandbox_agent/erc8004", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ error: "UI_SANDBOX_NON_MUTATING" }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(identityFixture(testCase.identityState)),
    })
  })

  if (
    testCase.kind === "purchase-approved" ||
    testCase.kind === "purchase-blocked"
  ) {
    await page.route("**/api/agents/sandbox_agent/purchases", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(
          purchaseFixture(testCase.kind === "purchase-blocked")
        ),
      })
    })
  }
}

async function assertNoHorizontalOverflow(page, name) {
  const layout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    pageWidth: document.documentElement.scrollWidth,
  }))

  if (layout.pageWidth > layout.viewportWidth + 1) {
    throw new Error(
      `Horizontal overflow in ${name}: page=${layout.pageWidth}px viewport=${layout.viewportWidth}px`
    )
  }
}

async function assertNavigation(page, width) {
  const nav = page.getByRole("navigation", { name: "Primary navigation" })
  await expect(nav).toBeVisible()

  for (const label of ["Home", "Agent", "Activity", "Policy"]) {
    await expect(
      page.getByRole("button", { name: label, exact: true })
    ).toBeVisible()
  }

  const position = await nav.evaluate(
    (element) => window.getComputedStyle(element).position
  )

  if (width >= 768 && position === "fixed") {
    throw new Error("Tablet/desktop navigation must remain in document flow")
  }

  if (width < 768 && position !== "fixed") {
    throw new Error("Mobile navigation must remain fixed to the viewport")
  }
}

async function exerciseHomeControls(page, name) {
  const hide = page.getByRole("button", { name: "Hide authority", exact: true })
  await expect(hide).toBeVisible()
  await hide.click()
  await expect(
    page.getByRole("button", { name: "Show authority", exact: true })
  ).toBeVisible()
  await page.getByRole("button", { name: "Show authority", exact: true }).click()

  await page.getByRole("button", { name: /Over limit/ }).click()
  await expect(
    page.getByRole("button", { name: "Test policy block", exact: true })
  ).toBeVisible()
  await page.getByRole("button", { name: /Allowed/ }).click()
  await expect(
    page.getByRole("button", { name: "Run live purchase", exact: true })
  ).toBeVisible()

  await page.getByRole("button", { name: "Add funds", exact: true }).click()
  await expect(page.getByText("Add from Portal wallet", { exact: true })).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Confirm add funds", exact: true })
  ).toBeVisible()
  await assertNoHorizontalOverflow(page, `${name}:fund-panel`)

  await page.getByRole("button", { name: "Return funds", exact: true }).click()
  await expect(
    page.getByText("Return to your Portal wallet", { exact: true })
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Confirm return", exact: true })
  ).toBeVisible()
  await assertNoHorizontalOverflow(page, `${name}:return-panel`)

  await page.getByRole("button", { name: "Return funds", exact: true }).click()
}

async function exerciseApp(page, testCase) {
  await assertNavigation(page, testCase.width)

  if (testCase.kind === "app-agent") {
    await page.getByRole("button", { name: "Agent", exact: true }).click()
    await expect(page.getByText("Execution agent", { exact: true })).toBeVisible()
    return
  }

  if (testCase.kind === "app-activity") {
    await page.getByRole("button", { name: "Activity", exact: true }).click()
    await expect(page.getByText("Recent decisions", { exact: true })).toBeVisible()
    return
  }

  if (testCase.kind === "app-policy") {
    await page.getByRole("button", { name: "Policy", exact: true }).click()
    await expect(page.getByText("Spending limits", { exact: true })).toBeVisible()
    return
  }

  if (testCase.kind === "empty-activity") {
    await page.getByRole("button", { name: "Activity", exact: true }).click()
    await expect(page.getByText("No activity yet", { exact: true })).toBeVisible()
    return
  }

  if (testCase.kind === "paused") {
    await page.getByRole("button", { name: "Pause", exact: true }).click()
    await expect(page.getByText("Paused", { exact: true })).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Resume", exact: true })
    ).toBeVisible()
    return
  }

  if (testCase.kind === "purchase-approved") {
    await page
      .getByRole("button", { name: "Run live purchase", exact: true })
      .click()
    await expect(page.getByText("Settled", { exact: true })).toBeVisible()
    await expect(page.getByText("NGN 1,620.00", { exact: true })).toBeVisible()
    await page.getByRole("button", { name: "View evidence", exact: true }).click()
    await expect(page.getByText("open.er-api.com", { exact: true })).toBeVisible()
    return
  }

  if (testCase.kind === "purchase-blocked") {
    await page.getByRole("button", { name: /Over limit/ }).click()
    await page
      .getByRole("button", { name: "Test policy block", exact: true })
      .click()
    await expect(
      page.getByText("Blocked before payment", { exact: true })
    ).toBeVisible()
    await expect(page.getByText("0 moved", { exact: true })).toBeVisible()
    return
  }

  if (testCase.kind === "identity") {
    await page.getByRole("button", { name: "Agent", exact: true }).click()

    if (testCase.identityState === "verified") {
      await expect(page.getByText("Verified", { exact: true })).toBeVisible()
      await expect(
        page.getByText(
          "The Portal wallet owns the identity and Murk's isolated execution wallet is verified onchain.",
          { exact: true }
        )
      ).toBeVisible()
      return
    }

    if (testCase.identityState === "binding") {
      await expect(page.getByText("Needs binding", { exact: true })).toBeVisible()
      await expect(
        page.getByRole("button", { name: "Bind execution wallet", exact: true })
      ).toBeVisible()
      return
    }

    await expect(page.getByText("Not registered", { exact: true })).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Register identity", exact: true })
    ).toBeVisible()
    return
  }

  await exerciseHomeControls(page, testCase.name)
}

async function exerciseAuth(page, kind) {
  if (kind === "auth-loading") {
    await expect(page.getByText("Opening Murk", { exact: true })).toBeVisible()
    await expect(
      page.getByText("Checking your secure session…", { exact: true })
    ).toBeVisible()
    return
  }

  await expect(
    page.getByRole("heading", { name: "Control how your agent spends.", exact: true })
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Sign in to Murk", exact: true })
  ).toBeVisible()

  if (kind === "auth-flow") {
    const input = page.getByLabel("Email address")
    await input.fill("builder@example.com")

    const submit = page.getByRole("button", {
      name: "Send sign-in link",
      exact: true,
    })
    await expect(submit).toBeEnabled()
    await submit.click()

    await expect(
      page.getByRole("heading", { name: "Check your inbox", exact: true })
    ).toBeVisible()
    await expect(page.getByText("builder@example.com", { exact: true })).toBeVisible()
  }
}

async function exerciseOnboarding(page) {
  await expect(
    page.getByRole("heading", { name: "Set the spending boundary", exact: true })
  ).toBeVisible()

  const name = page.getByLabel("Agent name")
  await name.fill("Ops Agent")

  await page.getByLabel("Accounting currency").selectOption("AED")
  await page.getByLabel("Daily authority").fill("200")
  await page.getByLabel("Per purchase").fill("50")

  await expect(page.getByText("Ops Agent", { exact: true })).toBeVisible()
  await expect(page.getByText("AED 200.00", { exact: true })).toBeVisible()
  await expect(page.getByText("AED 50.00", { exact: true })).toBeVisible()
}

for (const testCase of cases) {
  const context = await browser.newContext({
    viewport: { width: testCase.width, height: testCase.height },
    deviceScaleFactor: 1,
  })

  const page = await context.newPage()
  await installFixtures(page, testCase)
  await page.goto(baseUrl + testCase.path, { waitUntil: "networkidle" })

  if (
    testCase.kind === "auth-loading" ||
    testCase.kind === "auth-flow" ||
    testCase.kind === "auth-static"
  ) {
    await exerciseAuth(page, testCase.kind)
  } else if (testCase.kind === "onboarding") {
    await exerciseOnboarding(page)
  } else {
    await exerciseApp(page, testCase)
  }

  await assertNoHorizontalOverflow(page, testCase.name)

  await page.screenshot({
    path: `${outputDir}/${testCase.name}.png`,
    fullPage: true,
  })

  await context.close()
}

await browser.close()
