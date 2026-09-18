"use client"

import type { ReactNode } from "react"
import { useMurkWallet } from "@/components/MurkWalletProvider"
import { MurkLogoIcon, ShieldCheckIcon, WalletIcon } from "@/components/Icons"

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
  const {
    isAuthenticated,
    isLoading,
    login,
    error,
  } = useMurkWallet()

  const sandboxSignedIn = sandboxState === "signed-in"
  const sandboxLoading = sandboxState === "loading"
  const sandboxLinkSent = sandboxState === "link-sent"

  if (sandboxState && sandboxSignedIn) {
    return <>{children}</>
  }

  if ((!sandboxState && isLoading) || sandboxLoading) {
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

  if (!sandboxState && isAuthenticated) {
    return <>{children}</>
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
          {sandboxLinkSent ? (
            <>
              <div className="text-xs font-medium text-text-secondary">
                Authentication preview
              </div>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-text-primary">
                Check your inbox
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                Sandbox preview for:
              </p>
              <div className="mt-4 rounded-[14px] border border-border bg-surface-inset px-4 py-3 font-mono text-xs text-text-primary">
                {sandboxEmail}
              </div>
            </>
          ) : (
            <>
              <div className="text-xs font-medium text-text-secondary">
                Secure access
              </div>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-text-primary">
                Enter Murk
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                Sign in with email or connect a wallet. Privy creates the
                embedded EVM wallet Murk uses as your human-owned wallet.
              </p>

              {error && (
                <div className="mt-4 rounded-xl bg-danger-soft px-3.5 py-3 text-xs text-danger">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  if (!sandboxState) login()
                }}
                className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-white transition active:scale-[0.99]"
              >
                Sign in or connect wallet
              </button>

              <p className="mt-4 text-[11px] leading-relaxed text-text-secondary">
                The human wallet and Murk execution wallet remain separate.
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
