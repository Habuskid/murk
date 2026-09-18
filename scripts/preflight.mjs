const mode = process.argv[2] || "deploy"

if (!["deploy", "staging", "demo"].includes(mode)) {
  console.error('Usage: node scripts/preflight.mjs <deploy|staging|demo>')
  process.exit(2)
}

const errors = []
const warnings = []

function value(name) {
  return (process.env[name] || "").trim()
}

function requireValue(name) {
  const v = value(name)
  if (!v) errors.push(`${name} is required`)
  return v
}

function rejectPlaceholder(name, raw) {
  if (!raw) return

  const normalized = raw.toLowerCase()
  const forbiddenFragments = [
    "placeholder",
    "ui-sandbox",
    "example.com",
    "changeme",
    "replace-me",
    "replace_me",
    "test-secret",
  ]

  if (forbiddenFragments.some((fragment) => normalized.includes(fragment))) {
    errors.push(`${name} contains a test/example placeholder`)
  }
}

function requireHttpsUrl(name, options = {}) {
  const raw = requireValue(name)
  if (!raw) return null

  try {
    const url = new URL(raw)
    if (url.protocol !== "https:") {
      errors.push(`${name} must use https`)
    }
    if (options.disallowLocalhost && ["localhost", "127.0.0.1"].includes(url.hostname)) {
      errors.push(`${name} must not point to localhost`)
    }
    return url
  } catch {
    errors.push(`${name} must be a valid URL`)
    return null
  }
}

const networkMode = requireValue("NEXT_PUBLIC_MURK_NETWORK")
if (networkMode && !["testnet", "mainnet"].includes(networkMode)) {
  errors.push("NEXT_PUBLIC_MURK_NETWORK must be testnet or mainnet")
}

if (mode === "staging" && networkMode && networkMode !== "testnet") {
  errors.push("Murk staging must use NEXT_PUBLIC_MURK_NETWORK=testnet")
}

if (
  (mode === "deploy" || mode === "demo") &&
  networkMode &&
  networkMode !== "mainnet"
) {
  errors.push(`Murk ${mode} must use NEXT_PUBLIC_MURK_NETWORK=mainnet`)
}

const expectedChainId = networkMode === "mainnet" ? "42220" : "11142220"
const chainId = value("CELO_CHAIN_ID")
const publicChainId = value("NEXT_PUBLIC_CELO_CHAIN_ID")

if (chainId && chainId !== expectedChainId) {
  errors.push(`CELO_CHAIN_ID conflicts with NEXT_PUBLIC_MURK_NETWORK=${networkMode}`)
}

if (publicChainId && publicChainId !== expectedChainId) {
  errors.push(`NEXT_PUBLIC_CELO_CHAIN_ID conflicts with NEXT_PUBLIC_MURK_NETWORK=${networkMode}`)
}

const rpcUrl = requireHttpsUrl("CELO_RPC_URL", { disallowLocalhost: true })
const publicRpcUrl = requireHttpsUrl("NEXT_PUBLIC_CELO_RPC_URL", {
  disallowLocalhost: true,
})

for (const [name, url] of [
  ["CELO_RPC_URL", rpcUrl],
  ["NEXT_PUBLIC_CELO_RPC_URL", publicRpcUrl],
]) {
  if (!url) continue

  const isSepoliaHost = url.hostname.includes("sepolia")
  if (networkMode === "testnet" && !isSepoliaHost) {
    errors.push(`${name} must point to Celo Sepolia in testnet mode`)
  }
  if (networkMode === "mainnet" && isSepoliaHost) {
    errors.push(`${name} must not point to Celo Sepolia in mainnet mode`)
  }
}
requireHttpsUrl("EXCHANGE_RATE_API_URL", { disallowLocalhost: true })

const databaseUrl = requireValue("DATABASE_URL")
if (databaseUrl) {
  try {
    const db = new URL(databaseUrl)
    if (!["postgres:", "postgresql:"].includes(db.protocol)) {
      errors.push("DATABASE_URL must be PostgreSQL")
    }
    if (["localhost", "127.0.0.1"].includes(db.hostname)) {
      errors.push("DATABASE_URL must not use a local database for deployment")
    }
  } catch {
    errors.push("DATABASE_URL must be a valid PostgreSQL URL")
  }
}

const portalEnvironmentId = requireValue("PORTAL_AUTH_ENVIRONMENT_ID")
const portalFromEmail = requireValue("PORTAL_AUTH_FROM_EMAIL")
const portalTemplateId = requireValue("PORTAL_AUTH_TEMPLATE_ID")
const portalCustodianKey = requireValue("PORTAL_CUSTODIAN_API_KEY")

rejectPlaceholder("PORTAL_AUTH_ENVIRONMENT_ID", portalEnvironmentId)
rejectPlaceholder("PORTAL_AUTH_FROM_EMAIL", portalFromEmail)
rejectPlaceholder("PORTAL_AUTH_TEMPLATE_ID", portalTemplateId)
rejectPlaceholder("PORTAL_CUSTODIAN_API_KEY", portalCustodianKey)

const sessionSecret = requireValue("MURK_SESSION_SECRET")
if (sessionSecret && sessionSecret.length < 32) {
  errors.push("MURK_SESSION_SECRET must be at least 32 characters")
}
rejectPlaceholder("MURK_SESSION_SECRET", sessionSecret)

const masterSecret = requireValue("AGENT_WALLET_MASTER_SECRET")
if (masterSecret && !/^(?:0x)?[a-fA-F0-9]{64}$/.test(masterSecret)) {
  errors.push("AGENT_WALLET_MASTER_SECRET must be exactly 32 random bytes encoded as hex")
}

if (masterSecret) {
  const normalizedMaster = masterSecret.replace(/^0x/, "").toLowerCase()

  if (/^(.)\1{63}$/.test(normalizedMaster)) {
    errors.push("AGENT_WALLET_MASTER_SECRET must not use a repeated-character test key")
  }

  if (
    normalizedMaster ===
    "1111111111111111111111111111111111111111111111111111111111111111"
  ) {
    errors.push("AGENT_WALLET_MASTER_SECRET must not use the UI sandbox key")
  }
}

const appOrigin = requireHttpsUrl("PUBLIC_APP_ORIGIN", {
  disallowLocalhost: true,
})
rejectPlaceholder("PUBLIC_APP_ORIGIN", value("PUBLIC_APP_ORIGIN"))

const liveResource =
  mode === "staging" && !value("NEXT_PUBLIC_X402_RESOURCE_URL")
    ? null
    : requireHttpsUrl("NEXT_PUBLIC_X402_RESOURCE_URL", {
        disallowLocalhost: true,
      })
const probeResource =
  mode === "staging" && !value("X402_PROBE_RESOURCE_URL")
    ? null
    : requireHttpsUrl("X402_PROBE_RESOURCE_URL", {
        disallowLocalhost: true,
      })

if (mode === "staging" && !liveResource) {
  warnings.push(
    "NEXT_PUBLIC_X402_RESOURCE_URL is unset. This does not block Sepolia deployment; use the guarded testnet x402 engineering resource for settlement verification, but do not treat it as independent merchant evidence."
  )
}

if (mode === "staging" && !probeResource) {
  warnings.push(
    "X402_PROBE_RESOURCE_URL is unset. CI still runs the read-only Sepolia infrastructure smoke; configure an independent merchant before claiming external x402 evidence."
  )
}

if (appOrigin && liveResource && appOrigin.hostname === liveResource.hostname) {
  errors.push("NEXT_PUBLIC_X402_RESOURCE_URL must be an independent merchant, not Murk itself")
}
if (appOrigin && probeResource && appOrigin.hostname === probeResource.hostname) {
  errors.push("X402_PROBE_RESOURCE_URL must be an independent merchant, not Murk itself")
}

if (value("ENABLE_LOCAL_X402_FIXTURE").toLowerCase() === "true") {
  errors.push("ENABLE_LOCAL_X402_FIXTURE must be false/unset for deployment")
}

if (mode === "staging") {
  const testnetMerchantEnabled =
    value("ENABLE_TESTNET_X402_MERCHANT").toLowerCase() === "true"

  if (testnetMerchantEnabled) {
    const x402ApiKey = requireValue("X402_API_KEY")
    rejectPlaceholder("X402_API_KEY", x402ApiKey)

    const sellerAddress = requireValue("TESTNET_X402_SELLER_ADDRESS")
    if (
      sellerAddress &&
      !/^0x[a-fA-F0-9]{40}$/.test(sellerAddress)
    ) {
      errors.push("TESTNET_X402_SELLER_ADDRESS must be a valid EVM address")
    }
  } else {
    warnings.push(
      "ENABLE_TESTNET_X402_MERCHANT is false/unset. Sepolia can deploy, but the real paid x402 engineering harness will remain disabled."
    )
  }
}

if (value("UI_SANDBOX_MODE").toLowerCase() === "true") {
  errors.push("UI_SANDBOX_MODE must be false/unset for deployment")
}

const facilitator = value("X402_FACILITATOR_URL")
if (facilitator) {
  try {
    const url = new URL(facilitator)
    if (url.protocol !== "https:") {
      errors.push("X402_FACILITATOR_URL must use https")
    }

    const isSepoliaFacilitator = url.hostname.includes("sepolia")
    if (networkMode === "testnet" && !isSepoliaFacilitator) {
      errors.push("X402_FACILITATOR_URL must use the Celo Sepolia facilitator in testnet mode")
    }
    if (networkMode === "mainnet" && isSepoliaFacilitator) {
      errors.push("X402_FACILITATOR_URL must use the mainnet facilitator in mainnet mode")
    }
  } catch {
    errors.push("X402_FACILITATOR_URL must be a valid URL")
  }
} else {
  warnings.push("X402_FACILITATOR_URL is unset; ensure the selected external merchant/facilitator flow does not require it")
}

if (mode === "demo") {
  const attributionCode = requireValue("CELO_ATTRIBUTION_CODE")
  if (attributionCode && !/^[a-z0-9_]{1,32}$/.test(attributionCode)) {
    errors.push("CELO_ATTRIBUTION_CODE must be the assigned lowercase program code")
  }

  const blockedResource = value("NEXT_PUBLIC_X402_BLOCKED_RESOURCE_URL")
  if (blockedResource) {
    requireHttpsUrl("NEXT_PUBLIC_X402_BLOCKED_RESOURCE_URL", {
      disallowLocalhost: true,
    })
  } else {
    warnings.push(
      "NEXT_PUBLIC_X402_BLOCKED_RESOURCE_URL is unset; the blocked demo must reuse the verified live resource after tightening the per-purchase policy below its accounting value"
    )
  }

  requireValue("PORTAL_USER_WALLET_VERIFIED_ADDRESS")
  requireValue("PORTAL_USER_WALLET_EVIDENCE_REFERENCE")
  requireValue("LIVE_AGENT_ID")

  if (value("PORTAL_USER_WALLET_BACKUP_VERIFIED") !== "true") {
    errors.push("PORTAL_USER_WALLET_BACKUP_VERIFIED must be true before demo lock")
  }
  if (value("PORTAL_USER_WALLET_EJECT_VERIFIED") !== "true") {
    errors.push("PORTAL_USER_WALLET_EJECT_VERIFIED must be true before claiming wallet portability")
  }
}

if (warnings.length) {
  console.warn("\nPreflight warnings:")
  for (const warning of warnings) console.warn(`- ${warning}`)
}

if (errors.length) {
  console.error(`\nMurk ${mode} preflight FAILED:`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`Murk ${mode} preflight PASSED`)
