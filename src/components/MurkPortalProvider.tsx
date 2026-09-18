"use client"

import Portal from "@portal-hq/web"
import { useAuth } from "@clerk/nextjs"
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

type PortalWalletContextValue = {
  portal: Portal | null
  walletAddress: `0x${string}` | null
  isReady: boolean
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const PortalWalletContext = createContext<PortalWalletContextValue | null>(null)

async function registerWalletAddress(address: `0x${string}`) {
  const response = await fetch("/api/portal/wallet", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || "Could not register Portal wallet")
  }
}

export function MurkPortalProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth()
  const [portal, setPortal] = useState<Portal | null>(null)
  const [walletAddress, setWalletAddress] = useState<`0x${string}` | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initializePortal = useCallback(async () => {
    if (!isLoaded || !isSignedIn) {
      setPortal(null)
      setWalletAddress(null)
      setIsReady(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const sessionResponse = await fetch("/api/portal/session", {
        method: "POST",
        credentials: "same-origin",
      })
      const session = await sessionResponse.json()

      if (!sessionResponse.ok) {
        throw new Error(session.error || "Could not initialize Portal session")
      }

      const instance = new Portal({
        authToken: session.authToken,
        rpcConfig: {
          "eip155:42220":
            process.env.NEXT_PUBLIC_CELO_RPC_URL || "https://forno.celo.org",
        },
      })

      await new Promise<void>((resolve, reject) => {
        let settled = false

        instance.onReady(async () => {
          if (settled) return
          settled = true

          try {
            const exists = await instance.doesWalletExist()
            if (!exists) {
              await instance.createWallet()
            }

            const address = (await instance.getEip155Address()) as `0x${string}`
            await registerWalletAddress(address)

            setPortal(instance)
            setWalletAddress(address)
            setIsReady(true)
            resolve()
          } catch (cause) {
            reject(cause)
          }
        })

        window.setTimeout(() => {
          if (!settled) {
            settled = true
            reject(new Error("PORTAL_INITIALIZATION_TIMEOUT"))
          }
        }, 30000)
      })
    } catch (cause) {
      setPortal(null)
      setWalletAddress(null)
      setIsReady(false)
      setError(cause instanceof Error ? cause.message : "Portal wallet unavailable")
    } finally {
      setIsLoading(false)
    }
  }, [isLoaded, isSignedIn])

  useEffect(() => {
    void initializePortal()
  }, [initializePortal])

  const value = useMemo<PortalWalletContextValue>(
    () => ({
      portal,
      walletAddress,
      isReady,
      isLoading,
      error,
      refresh: initializePortal,
    }),
    [portal, walletAddress, isReady, isLoading, error, initializePortal]
  )

  return (
    <PortalWalletContext.Provider value={value}>
      {children}
    </PortalWalletContext.Provider>
  )
}

export function usePortalWallet(): PortalWalletContextValue {
  const context = useContext(PortalWalletContext)
  if (!context) {
    throw new Error("usePortalWallet must be used inside MurkPortalProvider")
  }
  return context
}
