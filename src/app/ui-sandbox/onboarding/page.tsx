import { notFound } from "next/navigation"
import { OnboardingSandbox } from "@/components/OnboardingSandbox"

export const dynamic = "force-dynamic"

export default function OnboardingSandboxPage() {
  if (process.env.UI_SANDBOX_MODE !== "true") {
    notFound()
  }

  return <OnboardingSandbox />
}
