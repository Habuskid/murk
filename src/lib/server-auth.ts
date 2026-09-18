import { NextRequest } from "next/server"
import { repository, AgentRecord, UserRecord } from "@/db/repository"
import {
  MURK_SESSION_COOKIE,
  verifyMurkSessionToken,
} from "@/lib/murk-session"

export type AuthenticatedOwner = {
  userId: string
  providerUserId: string
  walletAddress?: `0x${string}`
  portalClientId: string
}

export async function requireAuthenticatedOwner(
  req: NextRequest
): Promise<AuthenticatedOwner> {
  const token = req.cookies.get(MURK_SESSION_COOKIE)?.value
  if (!token) {
    throw new Error("AUTHORIZATION_REQUIRED")
  }

  let session
  try {
    session = verifyMurkSessionToken(token)
  } catch {
    throw new Error("AUTHORIZATION_REQUIRED")
  }

  const providerUserId = `portal_${session.endUserId}`
  let user = await repository.findUserByProviderId(providerUserId)

  if (!user) {
    const now = new Date()
    user = {
      id: `usr_${session.endUserId}`,
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
    portalClientId: session.clientId,
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

  if (message === "PORTAL_WALLET_NOT_READY") {
    return { status: 409, body: { error: message } }
  }

  if (message === "MURK_SESSION_SECRET_NOT_CONFIGURED") {
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
