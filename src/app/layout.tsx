import type { Metadata, Viewport } from "next"
import { IBM_Plex_Mono, Manrope } from "next/font/google"
import "./globals.css"
import { MurkPortalProvider } from "@/components/MurkPortalProvider"

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"],
})

export const metadata: Metadata = {
  title: "Murk | Spending Authority for Autonomous Agents",
  description:
    "Define financial authority in your local accounting currency. Let agents safely spend stablecoins inside that authority.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#F3F4F1",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${manrope.variable} ${ibmPlexMono.variable}`}>
      <body className="min-h-[100dvh] bg-background font-sans text-text-primary antialiased">
        <MurkPortalProvider>
          <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1040px] flex-col px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
            {children}
          </div>
        </MurkPortalProvider>
      </body>
    </html>
  )
}
