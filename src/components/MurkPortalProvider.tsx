"use client"

import Portal from "@portal-hq/web"
import { PUBLIC_CELO_CAIP2_NETWORK, PUBLIC_CELO_RPC_URL } from "@/lib/celo-public"
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

async function hasMurkSession(): Promise<boolean> {
  const response = await fetch("/api/auth/me", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  })
  return response.ok
}

export function MurkPortalProvider({ children }: { children: React.ReactNode }) {
  const [portal, setPortal] = useState<Portal | null>(null)
  const [walletAddress, setWalletAddress] = useState<`0x${string}` | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initializePortal = useCallback(async () => {
    setError(null)

    const authenticated = await hasMurkSession().catch(() => false)
    if (!authenticated) {
      setPortal(null)
      setWalletAddress(null)
      setIsReady(false)
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      const instance = new Portal({
        authUrl: `${window.location.origin}/api/portal/authenticate`,
        rpcConfig: {
          [PUBLIC_CELO_CAIP2_NETWORK]: PUBLIC_CELO_RPC_URL,
        },
      })

      await new Promise<void>((resolve, reject) => {
        let settled = false

        const unsubscribeError = instance.onInitializationError((reason) => {
          if (settled) return
          settled = true
          unsubscribeError?.()
          reject(new Error(reason || "PORTAL_INITIALIZATION_FAILED"))
        })

        instance.onReady(async () => {
          if (settled) return

          try {
            const exists = await instance.doesWalletExist()
            if (!exists) {
              await instance.createWallet()
            }

            const address = (await instance.getEip155Address()) as `0x${string}`
            await registerWalletAddress(address)

            settled = true
            setPortal(instance)
            setWalletAddress(address)
            setIsReady(true)
            resolve()
          } catch (cause) {
            settled = true
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
      setError(
        cause instanceof Error ? cause.message : "Portal wallet unavailable"
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

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
