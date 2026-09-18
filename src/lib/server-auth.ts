import { auth, currentUser } from "@clerk/nextjs/server"
import { NextRequest } from "next/server"
import { repository, AgentRecord, UserRecord } from "@/db/repository"

export type AuthenticatedOwner = {
  userId: string
  providerUserId: string
  email?: string
  walletAddress?: `0x${string}`
}

export async function requireAuthenticatedOwner(
  _req?: NextRequest
): Promise<AuthenticatedOwner> {
  let clerkUserId: string | null = null

  try {
    const session = await auth()
    clerkUserId = session.userId
  } catch {
    throw new Error("AUTHORIZATION_REQUIRED")
  }

  if (!clerkUserId) {
    throw new Error("AUTHORIZATION_REQUIRED")
  }

  const clerkUser = await currentUser().catch(() => null)
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() || undefined

  let user = repository.findUserByProviderId(clerkUserId)

  if (!user) {
    const now = new Date()
    user = {
      id: `usr_${clerkUserId}`,
      providerUserId: clerkUserId,
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

  const wallet = repository.findUserWallet(user.id)

  return {
    userId: user.id,
    providerUserId: clerkUserId,
    email,
    walletAddress: wallet?.address,
  }
}

export function authErrorResponse(error: unknown): {
  status: number
  body: { error: string }
} {
  const message = error instanceof Error ? error.message : "AUTHENTICATION_FAILED"

  if (message === "AUTHORIZATION_REQUIRED") {
    return { status: 401, body: { error: message } }
  }

  if (message === "AGENT_NOT_FOUND") {
    return { status: 404, body: { error: "Agent not found" } }
  }

  if (message === "PORTAL_WALLET_NOT_READY") {
    return { status: 409, body: { error: message } }
  }

  return { status: 500, body: { error: message } }
}

export async function requireOwnedAgent(
  req: NextRequest,
  agentId: string
): Promise<{ owner: AuthenticatedOwner; agent: AgentRecord }> {
  const owner = await requireAuthenticatedOwner(req)
  const agent = repository.findAgentById(agentId, owner.userId)

  if (!agent) {
    throw new Error("AGENT_NOT_FOUND")
  }

  return { owner, agent }
}
