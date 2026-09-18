"use client"

import type { FormEvent, ReactNode } from "react"
import { useEffect, useState } from "react"
import { MurkLogoIcon, ShieldCheckIcon, WalletIcon } from "@/components/Icons"

type AuthState = "loading" | "signed-out" | "signed-in"

type AuthGateProps = {
  children: ReactNode
  sandboxState?: "loading" | "signed-out" | "link-sent" | "signed-in"
  sandboxEmail?: string
}

export function AuthGate({
  children,
  sandboxState,
  sandboxEmail = "builder@example.com",
}: AuthGateProps) {
  const [authState, setAuthState] = useState<AuthState>(
    sandboxState === "signed-in"
      ? "signed-in"
      : sandboxState === "signed-out" || sandboxState === "link-sent"
        ? "signed-out"
        : "loading"
  )
  const [email, setEmail] = useState("")
  const [submittedEmail, setSubmittedEmail] = useState(
    sandboxState === "link-sent" ? sandboxEmail : ""
  )
  const [linkSent, setLinkSent] = useState(sandboxState === "link-sent")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (sandboxState) return

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
  }, [sandboxState])

  if (authState === "loading") {
    return (
      <main className="flex min-h-[calc(100dvh-3rem)] items-center justify-center py-8">
        <div className="flex items-center gap-3 text-sm text-text-secondary">
          <MurkLogoIcon className="h-9 w-9" />
          <div>
            <div className="font-semibold text-text-primary">Opening Murk</div>
            <div className="mt-0.5 text-xs">Checking your secure session…</div>
          </div>
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

    if (sandboxState) {
      setSubmittedEmail(normalized)
      setLinkSent(true)
      return
    }

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
    <main className="flex min-h-[calc(100dvh-3rem)] items-center py-8">
      <div className="mx-auto grid w-full max-w-[900px] gap-7 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12">
        <section className="px-1">
          <div className="flex items-center gap-3">
            <MurkLogoIcon className="h-10 w-10" />
            <div>
              <div className="text-[13px] font-bold tracking-[0.08em] text-text-primary">
                MURK
              </div>
              <div className="mt-0.5 text-xs text-text-secondary">
                Spending authority for agents
              </div>
            </div>
          </div>

          <h1 className="mt-7 max-w-[520px] text-[34px] font-semibold leading-[1.08] tracking-[-0.045em] text-text-primary sm:text-[42px]">
            Control how your agent spends.
          </h1>

          <p className="mt-4 max-w-[520px] text-sm leading-6 text-text-secondary">
            Set limits in the currency you use. Murk checks them before the
            agent signs a Celo payment.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:max-w-[520px] lg:grid-cols-1">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <ShieldCheckIcon className="h-4 w-4" strokeWidth={1.9} />
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">
                  Policy before signing
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                  Daily and per-purchase limits are checked before funds move.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface-inset text-text-primary">
                <WalletIcon className="h-4 w-4" strokeWidth={1.9} />
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">
                  Separate execution wallet
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                  The agent only holds the funds you deliberately delegate.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[22px] border border-border bg-surface p-5 sm:p-6">
          {linkSent ? (
            <>
              <div className="text-xs font-medium text-text-secondary">
                Email sign-in
              </div>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-text-primary">
                Check your inbox
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                Open the secure sign-in link sent to:
              </p>

              <div className="mt-4 rounded-[14px] border border-border bg-surface-inset px-4 py-3 font-mono text-xs text-text-primary">
                {submittedEmail}
              </div>

              <p className="mt-4 text-xs leading-relaxed text-text-secondary">
                After verification, Portal returns you to Murk and restores your
                embedded wallet session.
              </p>

              <button
                type="button"
                onClick={() => {
                  setLinkSent(false)
                  setSubmittedEmail("")
                  setError(null)
                }}
                className="mt-5 h-11 w-full rounded-xl border border-border bg-surface text-xs font-semibold text-text-primary transition hover:bg-surface-inset"
              >
                Use another email
              </button>
            </>
          ) : (
            <>
              <div className="text-xs font-medium text-text-secondary">
                Email sign-in
              </div>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-text-primary">
                Sign in to Murk
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                No password. We’ll send one secure link to your email.
              </p>

              <form onSubmit={sendMagicLink} className="mt-5">
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-medium text-text-secondary"
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
                  className="h-12 w-full rounded-xl border border-border bg-surface-inset px-3.5 text-sm font-medium text-text-primary outline-none transition placeholder:text-text-tertiary focus:border-accent focus:bg-surface"
                />

                {error && (
                  <div className="mt-3 rounded-xl bg-danger-soft px-3.5 py-3 text-xs text-danger">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !email.trim()}
                  className="mt-3 flex h-12 w-full items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {isSubmitting ? "Sending…" : "Send sign-in link"}
                </button>
              </form>

              <p className="mt-4 text-[11px] leading-relaxed text-text-secondary">
                Portal secures both your Murk session and embedded Celo wallet.
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
