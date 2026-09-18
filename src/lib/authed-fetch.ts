"use client"

import { getAccessToken } from "@coinbase/cdp-core"

const MAX_TOKEN_ATTEMPTS = 4
const TOKEN_RETRY_MS = 200

async function getTokenWithRetry(): Promise<string | null> {
  for (let attempt = 0; attempt < MAX_TOKEN_ATTEMPTS; attempt++) {
    const token = await getAccessToken()
    if (token) return token
    if (attempt < MAX_TOKEN_ATTEMPTS - 1) {
      await new Promise((resolve) => setTimeout(resolve, TOKEN_RETRY_MS))
    }
  }
  return null
}

export async function authedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const accessToken = await getTokenWithRetry()
  if (!accessToken) {
    throw new Error("NOT_AUTHENTICATED")
  }

  const headers = new Headers(init?.headers)
  headers.set("Authorization", `Bearer ${accessToken}`)

  return fetch(input, {
    ...init,
    headers,
  })
}
