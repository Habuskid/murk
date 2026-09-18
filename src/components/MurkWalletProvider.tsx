"use client"

import {
  PrivyProvider,
  usePrivy,
  useWallets,
} from "@privy-io/react-auth"
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  CELO_CHAIN,
  CELO_CHAIN_ID,
  CELO_NETWORK_LABEL,
} from "@/config/celo-network"
import { authedFetch } from "@/lib/authed-fetch"

type PreparedWalletTransaction = {
  from?: `0x${string}`
  to: `0x${string}`
  data?: `0x${string}`
  value?: string
}

type MurkWalletContextValue = {
  walletAddress: `0x${string}` | null
  isReady: boolean
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
  login: () => void
  logout: () => Promise<void>
  sendTransaction: (
    transaction: PreparedWalletTransaction,
    memo?: string
  ) => Promise<`0x${string}`>
}

const MurkWalletContext = createContext<MurkWalletContextValue | null>(null)

function isTxHash(value: unknown): value is `0x${string}` {
  return (
    typeof value === "string" &&
    /^0x[a-fA-F0-9]{64}$/.test(value)
  )
}

function MurkWalletBridge({ children }: { children: React.ReactNode }) {
  const {
    ready: privyReady,
    authenticated,
    login,
    logout: privyLogout,
  } = usePrivy()
  const { wallets, ready: walletsReady } = useWallets()
  const [error, setError] = useState<string | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const registeredAddressRef = useRef<string | null>(null)

  const wallet =
    wallets.find((candidate) => candidate.walletClientType === "privy") ??
    null
  const walletAddress = wallet?.address as `0x${string}` | undefined

  useEffect(() => {
    if (
      !privyReady ||
      !walletsReady ||
      !authenticated ||
      !wallet ||
      !walletAddress ||
      registeredAddressRef.current?.toLowerCase() === walletAddress.toLowerCase()
    ) {
      return
    }

    const activeWallet = wallet
    const activeAddress = walletAddress
    let cancelled = false

    async function registerWallet() {
      setIsRegistering(true)
      setError(null)

      try {
        await activeWallet.switchChain(CELO_CHAIN_ID)

        const response = await authedFetch("/api/wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: activeAddress }),
        })
        const body = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(body.error || "Could not register Privy wallet")
        }

        if (!cancelled) {
          registeredAddressRef.current = activeAddress
        }
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Privy wallet initialization failed"
          )
        }
      } finally {
        if (!cancelled) setIsRegistering(false)
      }
    }

    void registerWallet()

    return () => {
      cancelled = true
    }
  }, [
    authenticated,
    privyReady,
    wallet,
    walletAddress,
    walletsReady,
  ])

  const sendTransaction = useCallback(
    async (
      transaction: PreparedWalletTransaction,
      _memo?: string
    ): Promise<`0x${string}`> => {
      if (!wallet || !walletAddress || !authenticated) {
        throw new Error("PRIVY_WALLET_NOT_READY")
      }

      await wallet.switchChain(CELO_CHAIN_ID)
      const provider = await wallet.getEthereumProvider()

      // Privy documents standard EVM transaction forwarding. Murk deliberately
      // uses native CELO gas for human-signed transactions instead of passing
      // Celo's CIP-64 feeCurrency extension through the embedded-wallet provider.
      const result = await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: walletAddress,
            to: transaction.to,
            ...(transaction.data ? { data: transaction.data } : {}),
            ...(transaction.value ? { value: transaction.value } : {}),
          },
        ],
      })

      if (!isTxHash(result)) {
        throw new Error("PRIVY_TRANSACTION_HASH_MISSING")
      }

      return result
    },
    [authenticated, wallet, walletAddress]
  )

  const logout = useCallback(async () => {
    registeredAddressRef.current = null
    setError(null)
    await privyLogout()
  }, [privyLogout])

  const value = useMemo<MurkWalletContextValue>(
    () => ({
      walletAddress: walletAddress ?? null,
      isReady:
        Boolean(privyReady) &&
        Boolean(walletsReady) &&
        Boolean(authenticated) &&
        Boolean(walletAddress) &&
        !isRegistering &&
        !error,
      isLoading: !privyReady || (authenticated && (!walletsReady || isRegistering)),
      isAuthenticated: authenticated,
      error,
      login,
      logout,
      sendTransaction,
    }),
    [
      authenticated,
      error,
      isRegistering,
      login,
      privyReady,
      sendTransaction,
      logout,
      walletAddress,
      walletsReady,
    ]
  )

  return (
    <MurkWalletContext.Provider value={value}>
      {children}
    </MurkWalletContext.Provider>
  )
}

export function MurkWalletProvider({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID

  if (!appId) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center px-4">
        <div className="max-w-md rounded-[22px] border border-border bg-surface p-6 text-sm text-text-secondary">
          <div className="font-semibold text-text-primary">
            Murk authentication is not configured
          </div>
          <p className="mt-2 leading-6">
            Add NEXT_PUBLIC_PRIVY_APP_ID to this deployment and redeploy.
          </p>
        </div>
      </main>
    )
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email", "wallet"],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "all-users",
          },
        },
        defaultChain: CELO_CHAIN,
        supportedChains: [CELO_CHAIN],
        appearance: {
          theme: "light",
          accentColor: "#2563EB",
        },
      }}
    >
      <MurkWalletBridge>{children}</MurkWalletBridge>
    </PrivyProvider>
  )
}

export function useMurkWallet(): MurkWalletContextValue {
  const context = useContext(MurkWalletContext)
  if (!context) {
    throw new Error("useMurkWallet must be used inside MurkWalletProvider")
  }
  return context
}
