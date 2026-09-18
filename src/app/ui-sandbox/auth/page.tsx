import { notFound } from "next/navigation"
import { AuthGate } from "@/components/AuthGate"

export const dynamic = "force-dynamic"

export default async function AuthSandboxPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>
}) {
  if (process.env.UI_SANDBOX_MODE !== "true") {
    notFound()
  }

  const params = await searchParams
  const sandboxState =
    params.state === "link-sent" ? "link-sent" : "signed-out"

  return (
    <AuthGate sandboxState={sandboxState} sandboxEmail="builder@example.com">
      <div />
    </AuthGate>
  )
}
