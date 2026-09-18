import { chromium, expect } from "@playwright/test"
import { mkdir } from "node:fs/promises"

const baseUrl = process.env.UI_BASE_URL || "http://127.0.0.1:3000"
const outputDir = "artifacts/ui"
await mkdir(outputDir, { recursive: true })

const browser = await chromium.launch()

const cases = [
  { name: "mobile-home", width: 390, height: 844, path: "/ui-sandbox" },
  { name: "mobile-agent", width: 390, height: 844, path: "/ui-sandbox" },
  { name: "mobile-activity", width: 390, height: 844, path: "/ui-sandbox" },
  { name: "mobile-policy", width: 390, height: 844, path: "/ui-sandbox" },
  { name: "desktop-home", width: 1280, height: 900, path: "/ui-sandbox" },
]

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
  }

  if (testCase.name.includes("activity")) {
    await page.getByRole("button", { name: "Activity", exact: true }).click()
    await expect(page.getByText("Recent decisions", { exact: true })).toBeVisible()
  }

  if (testCase.name.includes("policy")) {
    await page.getByRole("button", { name: "Policy", exact: true }).click()
    await expect(page.getByText("Spending limits", { exact: true })).toBeVisible()
  }

  const layout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    pageWidth: document.documentElement.scrollWidth,
  }))

  if (layout.pageWidth > layout.viewportWidth + 1) {
    throw new Error(
      `Horizontal overflow in ${testCase.name}: page=${layout.pageWidth}px viewport=${layout.viewportWidth}px`
    )
  }

  if (testCase.width >= 768) {
    const position = await nav.evaluate(
      (element) => window.getComputedStyle(element).position
    )

    if (position === "fixed") {
      throw new Error("Desktop navigation must remain in document flow")
    }
  }

  await page.screenshot({
    path: `${outputDir}/${testCase.name}.png`,
    fullPage: true,
  })

  await context.close()
}

await browser.close()
