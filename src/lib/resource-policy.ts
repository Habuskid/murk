import { isIP } from "node:net"

const PRIVATE_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata",
])

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "")
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number)
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return true
  }

  const [a, b] = parts

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  )
}

function isPublicIpv6(address: string): boolean {
  const normalized = address.toLowerCase()
  const first = Number.parseInt(normalized.split(":")[0] || "0", 16)

  // Current global-unicast allocation is 2000::/3. Keep the runtime
  // conservative for a server-side fetch surface.
  if (!Number.isFinite(first) || first < 0x2000 || first > 0x3fff) {
    return false
  }

  // Documentation range.
  if (normalized.startsWith("2001:db8:") || normalized === "2001:db8::") {
    return false
  }

  return true
}

function assertPublicExternalUrl(url: URL): void {
  if (url.username || url.password) {
    throw new Error("X402_RESOURCE_CREDENTIALS_NOT_ALLOWED")
  }

  const hostname = normalizeHostname(url.hostname)

  if (
    PRIVATE_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("X402_RESOURCE_PRIVATE_HOST_NOT_ALLOWED")
  }

  const ipVersion = isIP(hostname)
  if (ipVersion === 4 && isPrivateIpv4(hostname)) {
    throw new Error("X402_RESOURCE_PRIVATE_HOST_NOT_ALLOWED")
  }
  if (ipVersion === 6 && !isPublicIpv6(hostname)) {
    throw new Error("X402_RESOURCE_PRIVATE_HOST_NOT_ALLOWED")
  }

  if (url.protocol !== "https:") {
    throw new Error("X402_RESOURCE_HTTPS_REQUIRED")
  }

  if (url.hash) {
    throw new Error("X402_RESOURCE_FRAGMENT_NOT_ALLOWED")
  }
}

function normalizeConfiguredUrl(value: string): string {
  const url = new URL(value)
  url.hash = ""
  return url.toString()
}

function configuredResourceUrls(): Set<string> {
  const values = [
    process.env.NEXT_PUBLIC_X402_RESOURCE_URL,
    process.env.NEXT_PUBLIC_X402_BLOCKED_RESOURCE_URL,
  ]

  return new Set(
    values
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value))
      .map(normalizeConfiguredUrl)
  )
}

function isAllowedLocalFixture(resource: URL): boolean {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.ENABLE_LOCAL_X402_FIXTURE !== "true"
  ) {
    return false
  }

  const hostname = normalizeHostname(resource.hostname)
  const localHost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"

  return localHost && resource.pathname.startsWith("/api/merchant/")
}

export function assertAllowedX402Purchase(input: {
  merchantUrl: string
  resourceUrl: string
}): {
  merchantOrigin: string
  resourceUrl: string
} {
  const merchant = new URL(input.merchantUrl)
  const resource = new URL(input.resourceUrl)

  if (merchant.origin !== resource.origin) {
    throw new Error("X402_MERCHANT_RESOURCE_ORIGIN_MISMATCH")
  }

  if (merchant.pathname !== "/" || merchant.search || merchant.hash) {
    throw new Error("X402_MERCHANT_URL_MUST_BE_ORIGIN")
  }

  if (isAllowedLocalFixture(resource)) {
    return {
      merchantOrigin: merchant.origin,
      resourceUrl: resource.toString(),
    }
  }

  assertPublicExternalUrl(resource)
  assertPublicExternalUrl(merchant)

  const allowed = configuredResourceUrls()
  if (allowed.size === 0) {
    throw new Error("X402_RESOURCE_NOT_CONFIGURED")
  }

  const normalizedResource = normalizeConfiguredUrl(resource.toString())
  if (!allowed.has(normalizedResource)) {
    throw new Error("X402_RESOURCE_NOT_ALLOWED")
  }

  return {
    merchantOrigin: merchant.origin,
    resourceUrl: normalizedResource,
  }
}
