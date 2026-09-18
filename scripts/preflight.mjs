const mode = process.argv[2] || "deploy"

if (!["deploy", "demo"].includes(mode)) {
  console.error('Usage: node scripts/preflight.mjs <deploy|demo>')
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

const chainId = requireValue("CELO_CHAIN_ID")
if (chainId && chainId !== "42220") {
  errors.push("CELO_CHAIN_ID must be 42220 for the locked mainnet build")
}

requireHttpsUrl("CELO_RPC_URL", { disallowLocalhost: true })
requireHttpsUrl("NEXT_PUBLIC_CELO_RPC_URL", { disallowLocalhost: true })
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

requireValue("PORTAL_AUTH_ENVIRONMENT_ID")
requireValue("PORTAL_AUTH_FROM_EMAIL")
requireValue("PORTAL_AUTH_TEMPLATE_ID")
requireValue("PORTAL_CUSTODIAN_API_KEY")

const sessionSecret = requireValue("MURK_SESSION_SECRET")
if (sessionSecret && sessionSecret.length < 32) {
  errors.push("MURK_SESSION_SECRET must be at least 32 characters")
}

const masterSecret = requireValue("AGENT_WALLET_MASTER_SECRET")
if (masterSecret && !/^(?:0x)?[a-fA-F0-9]{64}$/.test(masterSecret)) {
  errors.push("AGENT_WALLET_MASTER_SECRET must be exactly 32 random bytes encoded as hex")
}

const appOrigin = requireHttpsUrl("PUBLIC_APP_ORIGIN", {
  disallowLocalhost: true,
})

const liveResource = requireHttpsUrl("NEXT_PUBLIC_X402_RESOURCE_URL", {
  disallowLocalhost: true,
})
const probeResource = requireHttpsUrl("X402_PROBE_RESOURCE_URL", {
  disallowLocalhost: true,
})

if (appOrigin && liveResource && appOrigin.hostname === liveResource.hostname) {
  errors.push("NEXT_PUBLIC_X402_RESOURCE_URL must be an independent merchant, not Murk itself")
}
if (appOrigin && probeResource && appOrigin.hostname === probeResource.hostname) {
  errors.push("X402_PROBE_RESOURCE_URL must be an independent merchant, not Murk itself")
}

if (value("ENABLE_LOCAL_X402_FIXTURE").toLowerCase() === "true") {
  errors.push("ENABLE_LOCAL_X402_FIXTURE must be false/unset for deployment")
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

  requireHttpsUrl("NEXT_PUBLIC_X402_BLOCKED_RESOURCE_URL", {
    disallowLocalhost: true,
  })

  requireValue("PORTAL_USER_WALLET_VERIFIED_ADDRESS")
  requireValue("PORTAL_USER_WALLET_EVIDENCE_REFERENCE")

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
