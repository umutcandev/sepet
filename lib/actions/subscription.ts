"use server"

import { eq } from "drizzle-orm"

import { auth } from "@/auth"
import { db, users } from "@/lib/db"
import type { BillingInterval } from "@/lib/polar/client"

export type SubscriptionInfo = {
  plan: "free" | "pro"
  status: string | null
  interval: BillingInterval | null
  currentPeriodEnd: string | null // ISO; Date'ler client component'e serialize edilemez
  cancelAtPeriodEnd: boolean
  hasCustomer: boolean
}

/**
 * Abonelik paneli için tek okuma: kullanıcının plan + Polar abonelik durumu.
 * Giriş yoksa null (UI auth gate'i zaten gösterir).
 */
export async function getSubscription(): Promise<SubscriptionInfo | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const [row] = await db
    .select({
      plan: users.plan,
      status: users.subscriptionStatus,
      interval: users.subscriptionInterval,
      currentPeriodEnd: users.subscriptionCurrentPeriodEnd,
      cancelAtPeriodEnd: users.subscriptionCancelAtPeriodEnd,
      polarCustomerId: users.polarCustomerId,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  if (!row) return null

  return {
    plan: row.plan,
    status: row.status,
    interval: row.interval,
    currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    hasCustomer: Boolean(row.polarCustomerId),
  }
}
