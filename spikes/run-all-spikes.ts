/**
 * Phase 0: Master Spike Runner
 * Executes all 5 spikes sequentially and prints comprehensive summary.
 */

import { runSpikeA } from "./spike-a-user-wallet"
import { runSpikeB } from "./spike-b-agent-wallet"
import { runSpikeC } from "./spike-c-x402-purchase"
import { runSpikeD } from "./spike-d-multi-asset"
import { runSpikeE } from "./spike-e-rate-provider"

async function main() {
  console.log("=================================================");
  console.log("   MURK: PHASE 0 (SPIKE) VERIFICATION RUNNER     ");
  console.log("=================================================\n");

  const results: Record<string, boolean> = {}

  // Spike A
  const a = await runSpikeA()
  results["Spike A (User Embedded Wallet)"] = a.success

  // Spike B
  const b = await runSpikeB()
  results["Spike B (Server Agent Wallet)"] = b.success

  // Spike C
  const c = await runSpikeC()
  results["Spike C (Real x402 Protocol)"] = c.success

  // Spike D
  const d = await runSpikeD()
  results["Spike D (Multi-Asset Reality)"] = d.success

  // Spike E
  const e = await runSpikeE()
  results["Spike E (Rate Provider)"] = e.success

  console.log("=================================================");
  console.log("               SPIKE GATE SUMMARY                ");
  console.log("=================================================");
  let allPassed = true
  for (const [name, passed] of Object.entries(results)) {
    console.log(`${name.padEnd(35)} : ${passed ? "✅ PASSED" : "❌ FAILED"}`)
    if (!passed) allPassed = false
  }
  console.log("=================================================");
  console.log(`OVERALL SPIKE EXIT GATE: ${allPassed ? "✅ READY FOR PHASE 1 (CORE)" : "❌ BLOCKED"}\n`);

  if (!allPassed) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("Spike runner error:", err)
  process.exit(1)
})
