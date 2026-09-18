import { NextRequest, NextResponse } from "next/server"
import {
  createMurkSessionToken,
  MURK_SESSION_COOKIE,
  MURK_SESSION_MAX_AGE,
} from "@/lib/murk-session"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")
  const authEnvironmentId = process.env.PORTAL_AUTH_ENVIRONMENT_ID

  if (!token || !authEnvironmentId) {
    return NextResponse.redirect(
      new URL("/?authError=PORTAL_AUTH_CALLBACK_INVALID", req.url)
    )
  }

  try {
    const exchange = await fetch(
      "https://api.portalhq.io/api/v3/auth/magic-links/validations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-portal-auth-environment-id": authEnvironmentId,
        },
        body: JSON.stringify({ token }),
        cache: "no-store",
      }
    )

    if (!exchange.ok) {
      const detail = await exchange.text().catch(() => "")
      console.error("Portal token exchange failed", exchange.status, detail)
      return NextResponse.redirect(
        new URL("/?authError=PORTAL_AUTH_EXCHANGE_FAILED", req.url)
      )
    }

    const exchangeJson = await exchange.json()
    const data = exchangeJson?.data
    const endUserId = data?.endUserId
    const clientId = data?.clientId
    const clientSessionToken = data?.clientSessionToken

    if (
      typeof endUserId !== "string" ||
      typeof clientId !== "string" ||
      typeof clientSessionToken !== "string"
    ) {
      const code = data?.userJwt
        ? "PORTAL_2FA_REQUIRED"
        : "PORTAL_AUTH_RESPONSE_INVALID"
      return NextResponse.redirect(new URL(`/?authError=${code}`, req.url))
    }

    const clientResponse = await fetch(
      "https://api.portalhq.io/api/v3/clients/me",
      {
        headers: {
          Authorization: `Bearer ${clientSessionToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    )

    if (!clientResponse.ok) {
      return NextResponse.redirect(
        new URL("/?authError=PORTAL_SESSION_VALIDATION_FAILED", req.url)
      )
    }

    const sessionToken = createMurkSessionToken({
      endUserId,
      clientId,
    })

    const response = NextResponse.redirect(new URL("/", req.url))
    response.cookies.set({
      name: MURK_SESSION_COOKIE,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: MURK_SESSION_MAX_AGE,
    })

    return response
  } catch (error) {
    console.error("Portal auth callback failed", error)
    return NextResponse.redirect(
      new URL("/?authError=PORTAL_AUTH_CALLBACK_FAILED", req.url)
    )
  }
}
