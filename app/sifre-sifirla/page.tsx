import type { Metadata } from "next"

import { AuthPageShell } from "@/components/auth/auth-page-shell"
import { ResetPasswordCard } from "./reset-password-card"

export const metadata: Metadata = {
  title: "Şifre sıfırlama",
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
      <ResetPasswordCard token={typeof token === "string" ? token : null} />
    </AuthPageShell>
  )
}
