import { chromium, expect } from "@playwright/test"
import { mkdir } from "node:fs/promises"

const baseUrl = process.env.UI_BASE_URL || "http://127.0.0.1:3000"
const outputDir = "artifacts/ui"
await mkdir(outputDir, { recursive: true })

const browser = await chromium.launch()

const cases = [
  { name: "mobile-narrow-home", width: 320, height: 740, path: "/ui-sandbox" },
  { name: "mobile-home", width: 390, height: 844, path: "/ui-sandbox" },
  { name: "mobile-agent", width: 390, height: 844, path: "/ui-sandbox" },
  { name: "mobile-activity", width: 390, height: 844, path: "/ui-sandbox" },
  { name: "mobile-policy", width: 390, height: 844, path: "/ui-sandbox" },
  { name: "tablet-home", width: 768, height: 1024, path: "/ui-sandbox" },
  { name: "desktop-home", width: 1280, height: 900, path: "/ui-sandbox" },
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
  await assertNoHorizontalOverflow(page, `${name}:fund-panel`)

  await page.getByRole("button", { name: "Return funds", exact: true }).click()
  await expect(
    page.getByText("Return to your Portal wallet", { exact: true })
  ).toBeVisible()
  await assertNoHorizontalOverflow(page, `${name}:return-panel`)

  await page.getByRole("button", { name: "Return funds", exact: true }).click()
}

for (const testCase of cases) {
  const context = await browser.newContext({
    viewport: { width: testCase.width, height: testCase.height },
    deviceScaleFactor: 1,
  })

  const page = await context.newPage()
  await page.goto(baseUrl + testCase.path, { waitUntil: "networkidle" })

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

  await assertNoHorizontalOverflow(page, testCase.name)

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

  await page.screenshot({
    path: `${outputDir}/${testCase.name}.png`,
    fullPage: true,
  })

  await context.close()
}

await browser.close()
