import { createHmac } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  createMurkSessionToken,
  verifyMurkSessionToken,
} from "../src/lib/murk-session"

const TEST_SECRET = "0123456789abcdef0123456789abcdef"

function signPayload(payload: string): string {
  return createHmac("sha256", TEST_SECRET)
    .update(payload)
    .digest("base64url")
}

function makeToken(session: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url")
  return `${payload}.${signPayload(payload)}`
}

describe("Murk signed session", () => {
  const originalSecret = process.env.MURK_SESSION_SECRET

  beforeEach(() => {
    process.env.MURK_SESSION_SECRET = TEST_SECRET
  })

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.MURK_SESSION_SECRET
    } else {
      process.env.MURK_SESSION_SECRET = originalSecret
    }
  })

  it("round-trips a valid signed session", () => {
    const token = createMurkSessionToken({
      endUserId: "portal_end_user_01",
      clientId: "portal_client_01",
    })

    const session = verifyMurkSessionToken(token)

    expect(session.endUserId).toBe("portal_end_user_01")
    expect(session.clientId).toBe("portal_client_01")
    expect(session.expiresAt).toBeGreaterThan(session.issuedAt)
  })

  it("rejects payload tampering", () => {
    const token = createMurkSessionToken({
      endUserId: "portal_end_user_01",
      clientId: "portal_client_01",
    })

    const [payload, signature] = token.split(".")
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    )
    decoded.clientId = "attacker_client"

    const tamperedPayload = Buffer.from(JSON.stringify(decoded)).toString(
      "base64url"
    )

    expect(() =>
      verifyMurkSessionToken(`${tamperedPayload}.${signature}`)
    ).toThrow("INVALID_SESSION")
  })

  it("rejects expired sessions even when correctly signed", () => {
    const now = Math.floor(Date.now() / 1000)
    const token = makeToken({
      endUserId: "portal_end_user_01",
      clientId: "portal_client_01",
      issuedAt: now - 120,
      expiresAt: now - 60,
    })

    expect(() => verifyMurkSessionToken(token)).toThrow(
      "INVALID_OR_EXPIRED_SESSION"
    )
  })

  it("rejects sessions issued implausibly far in the future", () => {
    const now = Math.floor(Date.now() / 1000)
    const token = makeToken({
      endUserId: "portal_end_user_01",
      clientId: "portal_client_01",
      issuedAt: now + 3600,
      expiresAt: now + 7200,
    })

    expect(() => verifyMurkSessionToken(token)).toThrow(
      "INVALID_OR_EXPIRED_SESSION"
    )
  })

  it("rejects non-canonical extra token segments", () => {
    const token = createMurkSessionToken({
      endUserId: "portal_end_user_01",
      clientId: "portal_client_01",
    })

    expect(() => verifyMurkSessionToken(`${token}.extra`)).toThrow(
      "INVALID_SESSION"
    )
  })

  it("fails closed when the server session secret is missing", () => {
    delete process.env.MURK_SESSION_SECRET

    expect(() =>
      createMurkSessionToken({
        endUserId: "portal_end_user_01",
        clientId: "portal_client_01",
      })
    ).toThrow("MURK_SESSION_SECRET_NOT_CONFIGURED")
  })
})
