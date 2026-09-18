"use client"

import React, { FormEvent, useEffect, useState } from "react"

type AuthState = "loading" | "signed-out" | "signed-in"

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>("loading")
  const [email, setEmail] = useState("")
  const [submittedEmail, setSubmittedEmail] = useState("")
  const [linkSent, setLinkSent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "same-origin",
          cache: "no-store",
        })

        if (cancelled) return
        setAuthState(response.ok ? "signed-in" : "signed-out")
      } catch {
        if (!cancelled) {
          setAuthState("signed-out")
        }
      }
    }

    void loadSession()

    return () => {
      cancelled = true
    }
  }, [])

  if (authState === "loading") {
    return (
      <main className="flex min-h-[calc(100dvh-3rem)] items-center justify-center py-8">
        <div className="rounded-2xl border border-[#E8E8E5] bg-white px-5 py-4 text-sm text-[#767676]">
          Loading secure session...
        </div>
      </main>
    )
  }

  if (authState === "signed-in") {
    return <>{children}</>
  }

  const sendMagicLink = async (event: FormEvent) => {
    event.preventDefault()

    const normalized = email.trim().toLowerCase()
    if (!normalized) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      })

      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(
          body.error === "MAGIC_LINK_RATE_LIMITED"
            ? "A sign-in link was already sent. Check your inbox or try again shortly."
            : body.error || "Could not send the sign-in link."
        )
      }

      setSubmittedEmail(normalized)
      setLinkSent(true)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not send the sign-in link."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-[calc(100dvh-3rem)] items-center justify-center py-8">
      <section className="w-full rounded-[30px] border border-[#E8E8E5] bg-white p-6 card-elevation sm:p-8">
        <div className="mb-8">
          <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#171717] text-sm font-black tracking-tight text-white">
            M
          </div>

          <h1 className="text-[28px] font-extrabold tracking-[-0.03em] text-[#111111]">
            {linkSent ? "Check your email" : "Welcome to Murk"}
          </h1>

          <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#767676]">
            {linkSent
              ? `Open the secure sign-in link sent to ${submittedEmail}.`
              : "Give your agents spending authority without giving up control."}
          </p>
        </div>

        {linkSent ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#E8E8E5] bg-[#F7F7F5] px-4 py-4 text-sm text-[#111111]">
              Portal will return you to Murk after the email link is verified.
            </div>

            <button
              type="button"
              onClick={() => {
                setLinkSent(false)
                setSubmittedEmail("")
                setError(null)
              }}
              className="w-full py-2 text-xs font-semibold text-[#767676] transition hover:text-[#111111]"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={sendMagicLink} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-xs font-semibold text-[#767676]"
              >
                Email address
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                inputMode="email"
                required
                placeholder="you@example.com"
                className="h-14 w-full rounded-2xl border border-[#E8E8E5] bg-[#F7F7F5] px-4 text-sm font-medium text-[#111111] outline-none transition placeholder:text-[#A2A2A2] focus:border-[#2F9CF4] focus:bg-white"
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-xs text-danger">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !email.trim()}
              className="flex h-[52px] w-full items-center justify-center rounded-2xl bg-[#2F9CF4] px-4 text-sm font-bold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Sending link..." : "Continue"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-[11px] leading-relaxed text-[#9A9A9A]">
          Portal secures both your Murk sign-in and embedded Celo wallet.
        </p>
      </section>
    </main>
  )
}
