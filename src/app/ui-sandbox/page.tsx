import { notFound } from "next/navigation"
import { UiSandbox } from "@/components/UiSandbox"

export const dynamic = "force-dynamic"

export default function UiSandboxPage() {
  if (process.env.UI_SANDBOX_MODE !== "true") {
    notFound()
  }

  return <UiSandbox />
}
