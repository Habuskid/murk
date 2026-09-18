import { NextRequest, NextResponse } from "next/server"
import { authErrorResponse, requireAuthenticatedOwner } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const owner = await requireAuthenticatedOwner(req)

    const custodianApiKey = process.env.PORTAL_CUSTODIAN_API_KEY
    const portalClientId = process.env.PORTAL_DEMO_CLIENT_ID
    const allowedClerkUserId = process.env.PORTAL_DEMO_CLERK_USER_ID

    if (!custodianApiKey || !portalClientId || !allowedClerkUserId) {
      return NextResponse.json(
        { error: "PORTAL_DEMO_CLIENT_NOT_CONFIGURED" },
        { status: 503 }
      )
    }

    if (owner.providerUserId !== allowedClerkUserId) {
      return NextResponse.json(
        { error: "PORTAL_CLIENT_NOT_PROVISIONED_FOR_USER" },
        { status: 409 }
      )
    }

    const response = await fetch(
      `https://api.portalhq.io/api/v1/custodians/clients/${encodeURIComponent(
        portalClientId
      )}/web-otp`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${custodianApiKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    )

    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      console.error("Portal Web OTP request failed", response.status, detail)
      return NextResponse.json(
        { error: "PORTAL_WEB_OTP_FAILED" },
        { status: 502 }
      )
    }

    const payload = await response.json()
    const authToken = payload.otp

    if (typeof authToken !== "string" || authToken.length === 0) {
      return NextResponse.json(
        { error: "PORTAL_WEB_OTP_INVALID_RESPONSE" },
        { status: 502 }
      )
    }

    return NextResponse.json({
      authToken,
      clientId: portalClientId,
    })
  } catch (error) {
    const mapped = authErrorResponse(error)
    return NextResponse.json(mapped.body, { status: mapped.status })
  }
}
