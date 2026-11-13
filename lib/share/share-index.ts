import { listSharedLinks } from "@/lib/actions/shared-links"
import type { ShareKind } from "@/lib/share/paths"
import type { ShareInfo, ShareStatus } from "@/lib/share/types"

// Bu sekmede bilinen paylaşımlar: oturum başında bir kez yüklenir, pencerelerin
// işlemleriyle güncellenir. Pencere buradan anında açılır, arkada tazelenir.

type Key = `${ShareKind}:${string}`

const shares = new Map<Key, ShareInfo | null>()
let authorName: string | null | undefined
// Liste tam geldiyse listede olmayan kayıt paylaşılmamıştır.
let complete = false
let generation = 0
let loading: Promise<void> | null = null

const keyOf = (kind: ShareKind, id: string): Key => `${kind}:${id}`

export function preloadShareIndex(): Promise<void> {
  loading ??= (async () => {
    const gen = generation
    const res = await listSharedLinks()
    if (!res.ok || gen !== generation) return
    const { list } = res
    for (const l of list.links) {
      const key = keyOf(l.kind, l.id)
      // Bu arada pencerede yapılan değişiklik listeden yenidir.
      if (!shares.has(key)) {
        shares.set(key, {
          token: l.token,
          anonymous: l.anonymous,
          hideImages: l.hideImages,
        })
      }
    }
    authorName ??= list.authorName
    complete = !list.truncated && list.failed.length === 0
  })().catch(() => {
    loading = null
  })
  return loading
}

export function knownShareStatus(
  kind: ShareKind,
  id: string
): ShareStatus | undefined {
  if (authorName === undefined) return undefined
  const key = keyOf(kind, id)
  if (shares.has(key)) return { authorName, share: shares.get(key) ?? null }
  return complete ? { authorName, share: null } : undefined
}

export function rememberShareStatus(
  kind: ShareKind,
  id: string,
  status: ShareStatus
) {
  shares.set(keyOf(kind, id), status.share)
  authorName = status.authorName
}

export function forgetShare(kind: ShareKind, id: string) {
  shares.set(keyOf(kind, id), null)
}

/** Toplu kaldırma: kapsamdaki her kayıt artık paylaşılmamış. */
export function forgetShares(scope: ShareKind | "all") {
  generation++
  for (const key of shares.keys()) {
    if (scope === "all" || key.startsWith(`${scope}:`)) shares.set(key, null)
  }
  if (scope === "all") complete = true
}
