import type { Metadata } from "next"

import { AuthPageShell } from "@/components/auth/auth-page-shell"
import { VerifyEmailCard } from "./verify-email-card"

export const metadata: Metadata = {
  title: "E-posta doğrulama",
  robots: { index: false, follow: false },
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  return (
    <AuthPageShell>
      <VerifyEmailCard token={typeof token === "string" ? token : null} />
    </AuthPageShell>
  )
}
