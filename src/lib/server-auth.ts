import { createHash } from "node:crypto"
import { PrivyClient } from "@privy-io/node"
import { NextRequest } from "next/server"
import { repository, AgentRecord, UserRecord } from "@/db/repository"

export type AuthenticatedOwner = {
  userId: string
  providerUserId: string
  walletAddress?: `0x${string}`
}

let privyClient: PrivyClient | null = null

function getPrivyClient(): PrivyClient {
  if (privyClient) return privyClient

  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID
  const appSecret = process.env.PRIVY_APP_SECRET

  if (!appId || !appSecret) {
    throw new Error("PRIVY_AUTH_NOT_CONFIGURED")
  }

  privyClient = new PrivyClient({
    appId,
    appSecret,
  })

  return privyClient
}

function extractAccessToken(req: NextRequest): string {
  const header = req.headers.get("authorization")
  if (header?.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length).trim()
    if (token) return token
  }

  const cookieToken = req.cookies.get("privy-token")?.value
  if (cookieToken) return cookieToken

  throw new Error("AUTHORIZATION_REQUIRED")
}

function userIdForProvider(providerUserId: string): string {
  const digest = createHash("sha256")
    .update(providerUserId)
    .digest("hex")
    .slice(0, 24)

  return `usr_${digest}`
}

export async function requireAuthenticatedOwner(
  req: NextRequest
): Promise<AuthenticatedOwner> {
  const accessToken = extractAccessToken(req)

  let claims
  try {
    claims = await getPrivyClient().utils().auth().verifyAccessToken(accessToken)
  } catch {
    throw new Error("AUTHORIZATION_REQUIRED")
  }

  const privyUserId = claims.user_id
  if (!privyUserId) {
    throw new Error("AUTHORIZATION_REQUIRED")
  }

  const providerUserId = `privy_${privyUserId}`
  let user = await repository.findUserByProviderId(providerUserId)

  if (!user) {
    const now = new Date()
    user = {
      id: userIdForProvider(providerUserId),
      providerUserId,
      email: "",
      createdAt: now,
      updatedAt: now,
    } satisfies UserRecord
    await repository.saveUser(user)
  }

  const wallet = await repository.findUserWallet(user.id)

  return {
    userId: user.id,
    providerUserId,
    walletAddress: wallet?.address,
  }
}

export function authErrorResponse(error: unknown): {
  status: number
  body: { error: string }
} {
  const message =
    error instanceof Error ? error.message : "AUTHENTICATION_FAILED"

  if (message === "AUTHORIZATION_REQUIRED") {
    return { status: 401, body: { error: message } }
  }

  if (message === "AGENT_NOT_FOUND") {
    return { status: 404, body: { error: "Agent not found" } }
  }

  if (message === "PRIVY_WALLET_NOT_READY") {
    return { status: 409, body: { error: message } }
  }

  if (message === "PRIVY_AUTH_NOT_CONFIGURED") {
    return { status: 503, body: { error: message } }
  }

  return { status: 500, body: { error: message } }
}

export async function requireOwnedAgent(
  req: NextRequest,
  agentId: string
): Promise<{ owner: AuthenticatedOwner; agent: AgentRecord }> {
  const owner = await requireAuthenticatedOwner(req)
  const agent = await repository.findAgentById(agentId, owner.userId)

  if (!agent) {
    throw new Error("AGENT_NOT_FOUND")
  }

  return { owner, agent }
}
