import { chromium, expect } from "@playwright/test"
import { mkdir } from "node:fs/promises"

const baseUrl = process.env.UI_BASE_URL || "http://127.0.0.1:3000"
const outputDir = "artifacts/ui"
await mkdir(outputDir, { recursive: true })

const browser = await chromium.launch()

const cases = [
  { name: "mobile-narrow-home", width: 320, height: 740, path: "/ui-sandbox", kind: "app" },
  { name: "mobile-home", width: 390, height: 844, path: "/ui-sandbox", kind: "app" },
  { name: "mobile-agent", width: 390, height: 844, path: "/ui-sandbox", kind: "app" },
  { name: "mobile-activity", width: 390, height: 844, path: "/ui-sandbox", kind: "app" },
  { name: "mobile-policy", width: 390, height: 844, path: "/ui-sandbox", kind: "app" },
  { name: "tablet-home", width: 768, height: 1024, path: "/ui-sandbox", kind: "app" },
  { name: "desktop-home", width: 1280, height: 900, path: "/ui-sandbox", kind: "app" },
  { name: "auth-mobile", width: 320, height: 740, path: "/ui-sandbox/auth", kind: "auth-flow" },
  { name: "auth-desktop", width: 1280, height: 900, path: "/ui-sandbox/auth", kind: "auth-static" },
  { name: "onboarding-mobile", width: 320, height: 740, path: "/ui-sandbox/onboarding", kind: "onboarding" },
  { name: "onboarding-desktop", width: 1280, height: 900, path: "/ui-sandbox/onboarding", kind: "onboarding" },
]

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
  const nav = page.getByRole("navigation", { name: "Primary navigation" })
  await expect(nav).toBeVisible()

  for (const label of ["Home", "Agent", "Activity", "Policy"]) {
    await expect(
      page.getByRole("button", { name: label, exact: true })
    ).toBeVisible()
  }

  if (testCase.name.includes("agent")) {
    await page.getByRole("button", { name: "Agent", exact: true }).click()
    await expect(page.getByText("Execution agent", { exact: true })).toBeVisible()
  } else if (testCase.name.includes("activity")) {
    await page.getByRole("button", { name: "Activity", exact: true }).click()
    await expect(page.getByText("Recent decisions", { exact: true })).toBeVisible()
  } else if (testCase.name.includes("policy")) {
    await page.getByRole("button", { name: "Policy", exact: true }).click()
    await expect(page.getByText("Spending limits", { exact: true })).toBeVisible()
  } else {
    await exerciseHomeControls(page, testCase.name)
  }

  if (testCase.width >= 768) {
    const position = await nav.evaluate(
      (element) => window.getComputedStyle(element).position
    )

    if (position === "fixed") {
      throw new Error("Tablet/desktop navigation must remain in document flow")
    }
  } else {
    const position = await nav.evaluate(
      (element) => window.getComputedStyle(element).position
    )

    if (position !== "fixed") {
      throw new Error("Mobile navigation must remain fixed to the viewport")
    }
  }
}

async function exerciseAuth(page, kind) {
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
  await page.goto(baseUrl + testCase.path, { waitUntil: "networkidle" })

  if (testCase.kind === "app") {
    await exerciseApp(page, testCase)
  } else if (testCase.kind === "auth-flow" || testCase.kind === "auth-static") {
    await exerciseAuth(page, testCase.kind)
  } else if (testCase.kind === "onboarding") {
    await exerciseOnboarding(page)
  }

  await assertNoHorizontalOverflow(page, testCase.name)

  await page.screenshot({
    path: `${outputDir}/${testCase.name}.png`,
    fullPage: true,
  })

  await context.close()
}

await browser.close()
