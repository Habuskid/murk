"use client"

import React, { FormEvent, useState } from "react"
import { useAuth, useSignIn, useSignUp } from "@clerk/nextjs"

type AuthMode = "sign-in" | "sign-up"

function clerkErrorMessage(error: unknown, fallback: string): string {
  const maybe = error as {
    errors?: Array<{ message?: string; longMessage?: string; code?: string }>
    message?: string
  }

  return (
    maybe?.errors?.[0]?.longMessage ||
    maybe?.errors?.[0]?.message ||
    maybe?.message ||
    fallback
  )
}

function clerkErrorCode(error: unknown): string | undefined {
  const maybe = error as {
    errors?: Array<{ code?: string }>
  }
  return maybe?.errors?.[0]?.code
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()
  const { signIn, fetchStatus: signInStatus } = useSignIn()
  const { signUp, fetchStatus: signUpStatus } = useSignUp()

  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [submittedEmail, setSubmittedEmail] = useState("")
  const [codeSent, setCodeSent] = useState(false)
  const [mode, setMode] = useState<AuthMode>("sign-in")
  const [error, setError] = useState<string | null>(null)

  const isSubmitting =
    signInStatus === "fetching" || signUpStatus === "fetching"

  if (!isLoaded) {
    return (
      <main className="flex min-h-[calc(100dvh-3rem)] items-center justify-center py-8">
        <div className="rounded-2xl border border-[#E8E8E5] bg-white px-5 py-4 text-sm text-[#767676]">
          Loading secure session...
        </div>
      </main>
    )
  }

  if (isSignedIn) {
    return <>{children}</>
  }

  const sendCode = async (event: FormEvent) => {
    event.preventDefault()
    const normalized = email.trim().toLowerCase()
    if (!normalized) return

    setError(null)

    try {
      const result = await signIn.emailCode.sendCode({
        emailAddress: normalized,
      })

      if (result.error) {
        throw result.error
      }

      setMode("sign-in")
      setSubmittedEmail(normalized)
      setOtp("")
      setCodeSent(true)
      return
    } catch (signInError) {
      const code = clerkErrorCode(signInError)

      if (
        code !== "form_identifier_not_found" &&
        code !== "identifier_not_found"
      ) {
        setError(
          clerkErrorMessage(signInError, "Could not send the verification code.")
        )
        return
      }
    }

    try {
      const created = await signUp.create({
        emailAddress: normalized,
      })

      if (created.error) {
        throw created.error
      }

      const sent = await signUp.verifications.sendEmailCode()
      if (sent.error) {
        throw sent.error
      }

      setMode("sign-up")
      setSubmittedEmail(normalized)
      setOtp("")
      setCodeSent(true)
    } catch (signUpError) {
      setError(
        clerkErrorMessage(signUpError, "Could not create the account.")
      )
    }
  }

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault()
    if (otp.length !== 6) return

    setError(null)

    try {
      if (mode === "sign-in") {
        const verified = await signIn.emailCode.verifyCode({ code: otp })
        if (verified.error) {
          throw verified.error
        }

        if (signIn.status !== "complete") {
          throw new Error("SIGN_IN_NOT_COMPLETE")
        }

        const finalized = await signIn.finalize()
        if (finalized.error) {
          throw finalized.error
        }
        return
      }

      const verified = await signUp.verifications.verifyEmailCode({ code: otp })
      if (verified.error) {
        throw verified.error
      }

      if (signUp.status !== "complete") {
        throw new Error("SIGN_UP_NOT_COMPLETE")
      }

      const finalized = await signUp.finalize()
      if (finalized.error) {
        throw finalized.error
      }
    } catch (verifyError) {
      setError(
        clerkErrorMessage(verifyError, "The verification code could not be verified.")
      )
    }
  }

  const reset = async () => {
    setError(null)
    setCodeSent(false)
    setOtp("")
    setSubmittedEmail("")
    await signIn.reset().catch(() => undefined)
    await signUp.reset().catch(() => undefined)
  }

  return (
    <main className="flex min-h-[calc(100dvh-3rem)] items-center justify-center py-8">
      <section className="w-full rounded-[30px] border border-[#E8E8E5] bg-white p-6 card-elevation sm:p-8">
        <div className="mb-8">
          <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#171717] text-sm font-black tracking-tight text-white">
            M
          </div>

          <h1 className="text-[28px] font-extrabold tracking-[-0.03em] text-[#111111]">
            {codeSent ? "Check your email" : "Welcome to Murk"}
          </h1>

          <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#767676]">
            {codeSent
              ? `Enter the 6-digit code sent to ${submittedEmail}.`
              : "Give your agents spending authority without giving up control."}
          </p>
        </div>

        {codeSent ? (
          <form onSubmit={verifyCode} className="space-y-4">
            <div>
              <label
                htmlFor="otp"
                className="mb-2 block text-xs font-semibold text-[#767676]"
              >
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
              className="flex h-[52px] w-full items-center justify-center rounded-2xl bg-[#2F9CF4] px-4 text-sm font-bold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Verifying..." : "Verify"}
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void reset()}
              className="w-full py-2 text-xs font-semibold text-[#767676] transition hover:text-[#111111]"
            >
              Use a different email
            </button>
          </form>
        ) : (
          <form onSubmit={sendCode} className="space-y-4">
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
              {isSubmitting ? "Sending code..." : "Continue"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-[11px] leading-relaxed text-[#9A9A9A]">
          Email secures your Murk account. Portal secures your embedded Celo wallet.
        </p>
      </section>
    </main>
  )
}
