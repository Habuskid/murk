import { NextRequest } from "next/server"
import { CdpClient } from "@coinbase/cdp-sdk"
import { repository, UserRecord, WalletRecord } from "@/db/repository"

let cdpClient: CdpClient | null = null

function getServerCdpClient(): CdpClient {
  const apiKeyId = process.env.CDP_API_KEY_ID
  const apiKeySecret = process.env.CDP_API_KEY_SECRET

  if (!apiKeyId || !apiKeySecret) {
    throw new Error("CDP_SERVER_AUTH_NOT_CONFIGURED")
  }

  if (!cdpClient) {
    cdpClient = new CdpClient({
      apiKeyId,
      apiKeySecret,
    })
  }

  return cdpClient
}

function extractBearerToken(req: NextRequest): string {
  const header = req.headers.get("authorization")
  if (!header?.startsWith("Bearer ")) {
    throw new Error("AUTHORIZATION_REQUIRED")
  }

  const token = header.slice("Bearer ".length).trim()
  if (!token) {
    throw new Error("AUTHORIZATION_REQUIRED")
  }

  return token
}

function extractEmail(authenticationMethods: unknown): string | undefined {
  if (!Array.isArray(authenticationMethods)) return undefined

  for (const method of authenticationMethods) {
    if (
      method &&
      typeof method === "object" &&
      typeof (method as { email?: unknown }).email === "string"
    ) {
      return (method as { email: string }).email.trim().toLowerCase()
    }
  }

  return undefined
}

export type AuthenticatedOwner = {
  userId: string
  providerUserId: string
  email?: string
  walletAddress?: `0x${string}`
}

export async function requireAuthenticatedOwner(
  req: NextRequest
): Promise<AuthenticatedOwner> {
  const accessToken = extractBearerToken(req)

  let endUser
  try {
    endUser = await getServerCdpClient().endUser.validateAccessToken({
      accessToken,
    })
  } catch {
    throw new Error("INVALID_OR_EXPIRED_ACCESS_TOKEN")
  }

  const providerUserId = endUser.userId
  if (!providerUserId) {
    throw new Error("CDP_USER_ID_MISSING")
  }

  const email = extractEmail(endUser.authenticationMethods)
  const walletAddress = endUser.evmAccountObjects?.[0]?.address as
    | `0x${string}`
    | undefined

  let user = repository.findUserByProviderId(providerUserId)
  if (!user) {
    const now = new Date()
    user = {
      id: `usr_${providerUserId}`,
      providerUserId,
      email: email || "",
      createdAt: now,
      updatedAt: now,
    } satisfies UserRecord
    repository.saveUser(user)
  } else if (email && user.email !== email) {
    user.email = email
    user.updatedAt = new Date()
    repository.saveUser(user)
  }

  if (walletAddress) {
    repository.upsertUserWallet({
      id: `wal_user_${providerUserId}`,
      userId: user.id,
      type: "USER",
      address: walletAddress,
      provider: "CDP_EMBEDDED_WALLET",
      chainId: 42220,
      createdAt: new Date(),
    } satisfies WalletRecord)
  }

  return {
    userId: user.id,
    providerUserId,
    email,
    walletAddress,
  }
}

export function authErrorResponse(error: unknown): {
  status: number
  body: { error: string }
} {
  const message = error instanceof Error ? error.message : "AUTHENTICATION_FAILED"

  if (
    message === "AUTHORIZATION_REQUIRED" ||
    message === "INVALID_OR_EXPIRED_ACCESS_TOKEN"
  ) {
    return { status: 401, body: { error: message } }
  }

  if (message === "CDP_SERVER_AUTH_NOT_CONFIGURED") {
    return { status: 503, body: { error: message } }
  }

  return { status: 500, body: { error: message } }
}
