import { notFound } from "next/navigation"
import { UiSandbox } from "@/components/UiSandbox"

export const dynamic = "force-dynamic"

export default async function UiSandboxPage({
  searchParams,
}: {
  searchParams: Promise<{ activity?: string }>
}) {
  if (process.env.UI_SANDBOX_MODE !== "true") {
    notFound()
  }

  const params = await searchParams

  return <UiSandbox emptyActivity={params.activity === "empty"} />
}
