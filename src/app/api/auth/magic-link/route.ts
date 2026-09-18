import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 })
    }

    const authEnvironmentId = process.env.PORTAL_AUTH_ENVIRONMENT_ID
    const fromEmail = process.env.PORTAL_AUTH_FROM_EMAIL
    const templateId = process.env.PORTAL_AUTH_TEMPLATE_ID

    if (!authEnvironmentId || !fromEmail || !templateId) {
      return NextResponse.json(
        { error: "PORTAL_AUTH_NOT_CONFIGURED" },
        { status: 503 }
      )
    }

    const origin = new URL(req.url).origin
    const redirectUrl = `${origin}/auth/callback`

    const response = await fetch(
      "https://api.portalhq.io/api/v3/auth/magic-links",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-portal-auth-environment-id": authEnvironmentId,
        },
        body: JSON.stringify({
          email,
          redirectUrl,
          fromEmail,
          templateId,
          isAccountAbstracted: false,
        }),
        cache: "no-store",
      }
    )

    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      console.error("Portal magic link request failed", response.status, detail)

      if (response.status === 429) {
        return NextResponse.json(
          { error: "MAGIC_LINK_RATE_LIMITED" },
          { status: 429 }
        )
      }

      return NextResponse.json(
        { error: "PORTAL_MAGIC_LINK_FAILED" },
        { status: 502 }
      )
    }

    return NextResponse.json({ sent: true })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "PORTAL_MAGIC_LINK_FAILED",
      },
      { status: 400 }
    )
  }
}
