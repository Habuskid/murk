import { mkdir, writeFile } from "node:fs/promises"

const originRaw = (process.env.PUBLIC_APP_ORIGIN || "").trim()
if (!originRaw) {
  console.error("PUBLIC_APP_ORIGIN is required")
  process.exit(1)
}

let origin
try {
  origin = new URL(originRaw)
} catch {
  console.error("PUBLIC_APP_ORIGIN must be a valid URL")
  process.exit(1)
}

if (origin.protocol !== "https:" || ["localhost", "127.0.0.1"].includes(origin.hostname)) {
  console.error("AskBots requires a publicly reachable HTTPS PUBLIC_APP_ORIGIN")
  process.exit(1)
}

const budgetRaw = (process.env.ASKBOTS_REVIEW_BUDGET || "5").trim()
if (!/^\d+$/.test(budgetRaw) || Number(budgetRaw) < 1 || Number(budgetRaw) > 20) {
  console.error("ASKBOTS_REVIEW_BUDGET must be a whole number from 1 to 20")
  process.exit(1)
}

const round = (process.env.ASKBOTS_ROUND || "1").trim()
if (!["1", "2"].includes(round)) {
  console.error("ASKBOTS_ROUND must be 1 or 2")
  process.exit(1)
}

const submission = {
  name: `Murk Review Round ${round}`,
  propertyType: "website",
  propertyUrl: origin.origin,
  budget: Number(budgetRaw),
  skillFilters: [],
  locationFilters: [],
  questions: [
    {
      id: "authority_clarity",
      text: "Can you clearly understand that Murk lets a person budget in a local accounting currency while the agent may settle machine purchases in a stablecoin? Point to any wording or screen that makes this confusing.",
      type: "freeform",
    },
    {
      id: "policy_understanding",
      text: "From the main screen, can you tell the difference between daily authority, per-purchase authority, spent amount, and remaining authority? Name any ambiguous label or number.",
      type: "freeform",
    },
    {
      id: "purchase_evidence",
      text: "Review the live purchase-test surface. Is it clear what Murk checks before payment and what evidence is shown after settlement? Identify any missing or misleading state.",
      type: "freeform",
    },
    {
      id: "blocked_safety",
      text: "Review the over-limit path. Is it clear that the request is blocked before signing and that zero funds moved? Identify any place where a user could wrongly think a payment happened.",
      type: "freeform",
    },
    {
      id: "wallet_custody",
      text: "Can you distinguish the human Portal wallet from the isolated agent execution wallet, including how funds are added and returned? Identify any custody language that is unclear.",
      type: "freeform",
    },
    {
      id: "mobile_flow",
      text: "Use the product at a narrow mobile width. Report any dead end, hidden control, horizontal overflow, clipped content, or action that is hard to discover.",
      type: "freeform",
    },
    {
      id: "confidence",
      text: "How confident would you be allowing this product to control a small autonomous spending budget after reviewing the visible safeguards and evidence?",
      type: "rating",
    },
  ],
}

await mkdir(".generated/askbots", { recursive: true })
await writeFile(
  ".generated/askbots/submission.json",
  JSON.stringify(submission, null, 2) + "\n",
  "utf8"
)

console.log(
  `Prepared AskBots round ${round}: ${submission.budget} responses at ${submission.propertyUrl}`
)
console.log("Dry-run with: npx askbots submit --file .generated/askbots/submission.json")
console.log("Nothing in this script spends funds.")
