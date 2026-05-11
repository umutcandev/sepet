import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const user = {
    name: session.user.name ?? "Kullanıcı",
    email: session.user.email ?? "",
    avatar: session.user.image ?? "",
  }

  return <DashboardShell user={user}>{children}</DashboardShell>
}
