"use server"

import { and, desc, eq } from "drizzle-orm"
import { z } from "zod"

import { auth } from "@/auth"
import { db, conversationShares, recordShares } from "@/lib/db"
import { shareAuthorNameFor } from "@/lib/data/conversation-shares"
import type { ShareKind } from "@/lib/share/paths"
import type { ShareResult as Result } from "@/lib/share/types"
import { logError } from "@/lib/ai/telemetry"

// Ayarlar → Paylaşılan bağlantılar: tüm türler tek listede. Kaynaklar ayrı
// okunur; biri hata verirse diğerleri yine listelenir.

const SOURCE_LIMIT = 500

export type SharedLinkSource = "conversations" | "records"

export type SharedLink = {
  kind: ShareKind
  id: string
  title: string
  token: string
  anonymous: boolean
  hideImages: boolean
  sharedAt: string
}

export type SharedLinkList = {
  links: SharedLink[]
  /** Paylaşılan sayfada görünecek ad; pencere önizler. */
  authorName: string | null
  /** Okunamayan kaynaklar; pencere yalnız onlar için hata gösterir. */
  failed: SharedLinkSource[]
  /** Bir kaynak tavanı aştı: en yeni bağlantılar listelendi. */
  truncated: boolean
}

const scopeSchema = z.enum(["all", "conversation", "basket", "receipt"])
export type SharedLinkScope = z.infer<typeof scopeSchema>

async function conversationLinks(userId: string) {
  const rows = await db
    .select({
      id: conversationShares.conversationId,
      title: conversationShares.title,
      token: conversationShares.token,
      anonymous: conversationShares.anonymous,
      hideImages: conversationShares.hideImages,
      updatedAt: conversationShares.updatedAt,
    })
    .from(conversationShares)
    .where(eq(conversationShares.userId, userId))
    .orderBy(desc(conversationShares.updatedAt))
    .limit(SOURCE_LIMIT + 1)
  return {
    truncated: rows.length > SOURCE_LIMIT,
    links: rows.slice(0, SOURCE_LIMIT).map(
      (r): SharedLink => ({
        kind: "conversation",
        id: r.id,
        title: r.title,
        token: r.token,
        anonymous: r.anonymous,
        hideImages: r.hideImages,
        sharedAt: r.updatedAt.toISOString(),
      })
    ),
  }
}

async function recordLinks(userId: string) {
  const rows = await db
    .select({
      kind: recordShares.kind,
      basketId: recordShares.basketId,
      receiptId: recordShares.receiptId,
      title: recordShares.title,
      token: recordShares.token,
      anonymous: recordShares.anonymous,
      hideImages: recordShares.hideImages,
      updatedAt: recordShares.updatedAt,
    })
    .from(recordShares)
    .where(eq(recordShares.userId, userId))
    .orderBy(desc(recordShares.updatedAt))
    .limit(SOURCE_LIMIT + 1)
  return {
    truncated: rows.length > SOURCE_LIMIT,
    links: rows.slice(0, SOURCE_LIMIT).flatMap((r): SharedLink[] => {
      const id = r.kind === "basket" ? r.basketId : r.receiptId
      return id
        ? [
            {
              kind: r.kind,
              id,
              title: r.title,
              token: r.token,
              anonymous: r.anonymous,
              hideImages: r.hideImages,
              sharedAt: r.updatedAt.toISOString(),
            },
          ]
        : []
    }),
  }
}

export async function listSharedLinks(): Promise<
  Result<{ list: SharedLinkList }>
> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { ok: false, error: "unauthorized" }

  const sources: SharedLinkSource[] = ["conversations", "records"]
  const [authorName, results] = await Promise.all([
    shareAuthorNameFor(userId).catch(() => null),
    Promise.allSettled([conversationLinks(userId), recordLinks(userId)]),
  ])
  const list: SharedLinkList = {
    links: [],
    authorName,
    failed: [],
    truncated: false,
  }
  results.forEach((res, i) => {
    if (res.status === "fulfilled") {
      list.links.push(...res.value.links)
      list.truncated ||= res.value.truncated
    } else {
      logError(`[listSharedLinks] ${sources[i]} failed`, res.reason)
      list.failed.push(sources[i])
    }
  })
  list.links.sort((a, b) => b.sharedAt.localeCompare(a.sharedAt))
  return { ok: true, list }
}

/**
 * Kapsamdaki tüm bağlantıları kapatır. Hız limiti yok: erişimi geri almak
 * her zaman mümkün olmalı.
 */
export async function unshareSharedLinks(
  scope: SharedLinkScope
): Promise<Result<{ deleted: number }>> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { ok: false, error: "unauthorized" }
  const parsed = scopeSchema.safeParse(scope)
  if (!parsed.success) return { ok: false, error: "not_found" }
  const target = parsed.data

  const tasks: Promise<number>[] = []
  if (target === "all" || target === "conversation") {
    tasks.push(
      db
        .delete(conversationShares)
        .where(eq(conversationShares.userId, userId))
        .returning({ id: conversationShares.id })
        .then((rows) => rows.length)
    )
  }
  if (target !== "conversation") {
    tasks.push(
      db
        .delete(recordShares)
        .where(
          target === "all"
            ? eq(recordShares.userId, userId)
            : and(eq(recordShares.userId, userId), eq(recordShares.kind, target))
        )
        .returning({ id: recordShares.id })
        .then((rows) => rows.length)
    )
  }

  const results = await Promise.allSettled(tasks)
  let deleted = 0
  let failed = false
  for (const res of results) {
    if (res.status === "fulfilled") deleted += res.value
    else {
      failed = true
      logError("[unshareSharedLinks] failed", res.reason)
    }
  }
  return failed ? { ok: false, error: "failed" } : { ok: true, deleted }
}
