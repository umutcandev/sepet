import { auth } from "@/auth"

export type CurrentUser = {
  id: string
  name: string
  email: string
  avatar: string
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth()
  if (!session?.user) return null
  return {
    id: session.user.id,
    name: session.user.name ?? "Kullanıcı",
    email: session.user.email ?? "",
    avatar: session.user.image ?? "",
  }
}
