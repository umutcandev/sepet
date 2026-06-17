"use server"

import { auth } from "@/auth"
import { getUsage, type UsageSnapshot } from "@/lib/usage/usage"

/**
 * Kullanım sekmesi için anlık kullanım görüntüsünü döndürür. Dialog açıldığında
 * istemciden çağrılır; giriş yoksa null döner (UI auth gate'i zaten gösterir).
 */
export async function getUsageSnapshot(): Promise<UsageSnapshot | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  return getUsage(session.user.id)
}
