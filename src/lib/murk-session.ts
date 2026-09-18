import { createHmac, timingSafeEqual } from "node:crypto"

export const MURK_SESSION_COOKIE = "murk_session"

export type MurkSession = {
  endUserId: string
  clientId: string
  issuedAt: number
  expiresAt: number
}

const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 7

function getSessionSecret(): string {
  const secret = process.env.MURK_SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error("MURK_SESSION_SECRET_NOT_CONFIGURED")
  }
  return secret
}

function signPayload(payload: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url")
}

export function createMurkSessionToken(input: {
  endUserId: string
  clientId: string
}): string {
  const issuedAt = Math.floor(Date.now() / 1000)
  const session: MurkSession = {
    endUserId: input.endUserId,
    clientId: input.clientId,
    issuedAt,
    expiresAt: issuedAt + SESSION_LIFETIME_SECONDS,
  }

  const payload = Buffer.from(JSON.stringify(session)).toString("base64url")
  const signature = signPayload(payload)
  return `${payload}.${signature}`
}

export function verifyMurkSessionToken(token: string): MurkSession {
  const [payload, signature] = token.split(".")
  if (!payload || !signature) {
    throw new Error("INVALID_SESSION")
  }

  const expected = signPayload(payload)
  const signatureBytes = Buffer.from(signature)
  const expectedBytes = Buffer.from(expected)

  if (
    signatureBytes.length !== expectedBytes.length ||
    !timingSafeEqual(signatureBytes, expectedBytes)
  ) {
    throw new Error("INVALID_SESSION")
  }

  let session: MurkSession
  try {
    session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as MurkSession
  } catch {
    throw new Error("INVALID_SESSION")
  }

  if (
    !session.endUserId ||
    !session.clientId ||
    !Number.isInteger(session.expiresAt) ||
    session.expiresAt <= Math.floor(Date.now() / 1000)
  ) {
    throw new Error("INVALID_OR_EXPIRED_SESSION")
  }

  return session
}

export const MURK_SESSION_MAX_AGE = SESSION_LIFETIME_SECONDS
