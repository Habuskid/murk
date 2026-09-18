import { chromium } from "@playwright/test"
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

  if (testCase.name.includes("agent")) {
    await page.getByRole("button", { name: "Agent", exact: true }).click()
  }

  if (testCase.name.includes("activity")) {
    await page.getByRole("button", { name: "Activity", exact: true }).click()
  }

  if (testCase.name.includes("policy")) {
    await page.getByRole("button", { name: "Policy", exact: true }).click()
  }

  await page.screenshot({
    path: `${outputDir}/${testCase.name}.png`,
    fullPage: true,
  })

  await context.close()
}

await browser.close()
