import { NextRequest, NextResponse } from "next/server"
import { requireAuthenticatedOwner, authErrorResponse } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const owner = await requireAuthenticatedOwner(req)
    const custodianApiKey = process.env.PORTAL_CUSTODIAN_API_KEY

    if (!custodianApiKey) {
      return NextResponse.json(
        { error: "PORTAL_CUSTODIAN_API_KEY_NOT_CONFIGURED" },
        { status: 503 }
      )
    }

    const otpResponse = await fetch(
      `https://api.portalhq.io/api/v1/custodians/clients/${encodeURIComponent(
        owner.portalClientId
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

    if (!otpResponse.ok) {
      const detail = await otpResponse.text().catch(() => "")
      console.error("Portal Web OTP request failed", otpResponse.status, detail)
      return NextResponse.json(
        { error: "PORTAL_WEB_OTP_FAILED" },
        { status: 502 }
      )
    }

    const payload = await otpResponse.json()
    const otp = payload?.otp

    if (typeof otp !== "string" || otp.length === 0) {
      return NextResponse.json(
        { error: "PORTAL_WEB_OTP_INVALID_RESPONSE" },
        { status: 502 }
      )
    }

    const response = NextResponse.redirect(
      `https://web.portalhq.io/clients/token/validate?otp=${encodeURIComponent(
        otp
      )}`
    )
    response.headers.set(
      "Access-Control-Allow-Origin",
      "https://web.portalhq.io"
    )
    response.headers.set("Access-Control-Allow-Credentials", "true")
    return response
  } catch (error) {
    const mapped = authErrorResponse(error)
    return NextResponse.json(mapped.body, { status: mapped.status })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "https://web.portalhq.io",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
