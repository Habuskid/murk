"use client"

import React, { FormEvent, useState } from "react"
import {
  useIsSignedIn,
  useSignInWithEmail,
  useVerifyEmailOTP,
} from "@coinbase/cdp-hooks"

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useIsSignedIn()
  const { signInWithEmail } = useSignInWithEmail()
  const { verifyEmailOTP } = useVerifyEmailOTP()

  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [flowId, setFlowId] = useState<string | null>(null)
  const [submittedEmail, setSubmittedEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isSignedIn) {
    return <>{children}</>
  }

  const sendCode = async (event: FormEvent) => {
    event.preventDefault()
    const normalized = email.trim().toLowerCase()
    if (!normalized) return

    setIsSubmitting(true)
    setError(null)
    try {
      const result = await signInWithEmail({ email: normalized })
      setSubmittedEmail(normalized)
      setFlowId(result.flowId)
      setOtp("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the code.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault()
    if (!flowId || otp.length !== 6) return

    setIsSubmitting(true)
    setError(null)
    try {
      await verifyEmailOTP({ flowId, otp })
    } catch (err) {
      setError(err instanceof Error ? err.message : "The code could not be verified.")
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
            {flowId ? "Check your email" : "Welcome to Murk"}
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#767676]">
            {flowId
              ? `Enter the 6-digit code sent to ${submittedEmail}.`
              : "Give your agents spending authority without giving up control."}
          </p>
        </div>

        {flowId ? (
          <form onSubmit={verifyCode} className="space-y-4">
            <div>
              <label htmlFor="otp" className="mb-2 block text-xs font-semibold text-[#767676]">
                Verification code
              </label>
              <input
                id="otp"
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                autoFocus
                className="h-14 w-full rounded-2xl border border-[#E8E8E5] bg-[#F7F7F5] px-4 text-center text-xl font-bold tracking-[0.35em] text-[#111111] outline-none transition focus:border-[#2F9CF4] focus:bg-white"
                placeholder="000000"
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-xs text-danger">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || otp.length !== 6}
              className="flex h-13 w-full items-center justify-center rounded-2xl bg-[#2F9CF4] px-4 py-3.5 text-sm font-bold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Verifying..." : "Verify"}
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setFlowId(null)
                setOtp("")
                setError(null)
              }}
              className="w-full py-2 text-xs font-semibold text-[#767676] transition hover:text-[#111111]"
            >
              Use a different email
            </button>
          </form>
        ) : (
          <form onSubmit={sendCode} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-xs font-semibold text-[#767676]">
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
              className="flex h-13 w-full items-center justify-center rounded-2xl bg-[#2F9CF4] px-4 py-3.5 text-sm font-bold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Sending code..." : "Continue"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-[11px] leading-relaxed text-[#9A9A9A]">
          No browser wallet or seed phrase is required to get started.
        </p>
      </section>
    </main>
  )
}
