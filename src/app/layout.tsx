import type { Metadata, Viewport } from "next"
import "./globals.css"
import { MurkPortalProvider } from "@/components/MurkPortalProvider"

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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="flex min-h-[100dvh] flex-col items-center justify-start antialiased">
        <MurkPortalProvider>
          <div className="flex min-h-[100dvh] w-full max-w-md flex-col px-4 py-6 md:max-w-lg">
            {children}
          </div>
        </MurkPortalProvider>
      </body>
    </html>
  )
}
