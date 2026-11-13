"use client"

import * as React from "react"
import {
  RiChat3Line,
  RiCloseLine,
  RiDeleteBinLine,
  RiExternalLinkLine,
  RiFileCopyLine,
  RiReceiptLine,
  RiSearchLine,
  RiShoppingBasketLine,
  type RemixiconComponentType,
} from "@remixicon/react"

import { toast } from "@/components/ui/sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control"
import { Skeleton } from "@/components/ui/skeleton"
import { unshareConversation } from "@/lib/actions/conversation-shares"
import { unshareRecord } from "@/lib/actions/record-shares"
import {
  listSharedLinks,
  unshareSharedLinks,
  type SharedLink,
  type SharedLinkList,
  type SharedLinkScope,
} from "@/lib/actions/shared-links"
import { copyText } from "@/lib/copy"
import { sharePath, type ShareKind } from "@/lib/share/paths"
import { forgetShare, forgetShares } from "@/lib/share/share-index"
import { cn } from "@/lib/utils"

const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" })

const KIND: Record<
  ShareKind,
  { label: string; noun: string; icon: RemixiconComponentType }
> = {
  conversation: { label: "Sohbet", noun: "sohbet", icon: RiChat3Line },
  basket: { label: "Sepet", noun: "sepet", icon: RiShoppingBasketLine },
  receipt: { label: "Fiş", noun: "fiş", icon: RiReceiptLine },
}

const CONFIRM: Record<SharedLinkScope, { title: string; body: string }> = {
  all: {
    title: "Tüm bağlantılar kaldırılsın mı?",
    body: "Paylaştığın sohbet, sepet ve fişlerin bağlantıları çalışmaz olur. Sohbet, sepet ve fişlerin silinmez; istersen yeni bir bağlantıyla yeniden paylaşabilirsin.",
  },
  conversation: {
    title: "Tüm sohbet bağlantıları kaldırılsın mı?",
    body: "Paylaştığın sohbetlerin bağlantıları çalışmaz olur. Sohbetlerin silinmez; istersen yeni bir bağlantıyla yeniden paylaşabilirsin.",
  },
  basket: {
    title: "Tüm sepet bağlantıları kaldırılsın mı?",
    body: "Paylaştığın sepetlerin bağlantıları çalışmaz olur. Sepetlerin silinmez; istersen yeni bir bağlantıyla yeniden paylaşabilirsin.",
  },
  receipt: {
    title: "Tüm fiş bağlantıları kaldırılsın mı?",
    body: "Paylaştığın fişlerin bağlantıları çalışmaz olur. Fişlerin silinmez; istersen yeni bir bağlantıyla yeniden paylaşabilirsin.",
  },
}

const FILTERS: SharedLinkScope[] = ["all", "conversation", "basket", "receipt"]

// Taşan kenar overlay ile söner; mask Chrome/Windows'ta yazıyı titretiyor.
const FADE =
  "pointer-events-none absolute inset-x-0 h-6 from-popover to-transparent transition-opacity duration-150 ease-out-soft"

const EMPTY_LIST: SharedLinkList = {
  links: [],
  authorName: null,
  failed: [],
  truncated: false,
}

const PREFETCH_TTL = 15_000
// Hızlı yanıtta skeleton hiç görünmesin, yanıp sönmesin.
const SKELETON_DELAY = 300

function keyOf(link: SharedLink): string {
  return `${link.kind}:${link.id}`
}

function shareUrl(link: SharedLink): string {
  return `${window.location.origin}${sharePath(link.kind, link.token)}`
}

function revokeLink(link: SharedLink) {
  return link.kind === "conversation"
    ? unshareConversation(link.id)
    : unshareRecord({ kind: link.kind, recordId: link.id })
}

/**
 * Ayarlar → Gizlilik → Paylaşılan bağlantılar. Herkese açık her bağlantı
 * (sohbet, sepet, fiş) tek yerde; türe göre süzülür, başlıkta aranır.
 */
export function SharedLinksDialog() {
  const [open, setOpen] = React.useState(false)
  const [list, setList] = React.useState<SharedLinkList | null>(null)
  const [filter, setFilter] = React.useState<SharedLinkScope>("all")
  const [query, setQuery] = React.useState("")
  const [pending, setPending] = React.useState<ReadonlySet<string>>(
    () => new Set()
  )
  const [confirmAll, setConfirmAll] = React.useState(false)
  const [clearing, setClearing] = React.useState(false)
  // Açılışta bağlantı varsa araç çubuğu sonuncusu silinse de yerinde kalır.
  const [hadLinks, setHadLinks] = React.useState(false)
  const [fade, setFade] = React.useState({ top: false, bottom: false })
  const [slow, setSlow] = React.useState(false)
  const request = React.useRef(0)
  const prefetched = React.useRef<{
    at: number
    promise: ReturnType<typeof listSharedLinks>
  } | null>(null)
  const listRef = React.useRef<HTMLUListElement>(null)
  const searchRef = React.useRef<HTMLInputElement>(null)
  const scrollRef = React.useRef<HTMLDivElement | null>(null)

  const updateFade = React.useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const top = el.scrollTop > 1
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1
    setFade((f) => (f.top === top && f.bottom === bottom ? f : { top, bottom }))
  }, [])

  // Portal içeriği geç bağlandığı için effect yerine ref: filtre, silme ya da
  // pencere boyu kaydırılan yüksekliği değiştirince kenar solmaları güncellenir.
  const observeScroll = React.useCallback(
    (el: HTMLDivElement | null) => {
      scrollRef.current = el
      if (!el) return
      const observer = new ResizeObserver(updateFade)
      observer.observe(el)
      if (el.firstElementChild) observer.observe(el.firstElementChild)
      return () => {
        observer.disconnect()
        scrollRef.current = null
      }
    },
    [updateFade]
  )

  // "Yönet"e yönelince istek başlar; açılış taze ön yüklemeyi kullanır.
  const prefetch = React.useCallback(() => {
    const p = prefetched.current
    if (p && Date.now() - p.at < PREFETCH_TTL) return
    const promise = listSharedLinks()
    promise.catch(() => {}) // açılmazsa yakalanmamış hata kalmasın
    prefetched.current = { at: Date.now(), promise }
  }, [])

  const load = React.useCallback((usePrefetch = false) => {
    const id = ++request.current
    const p = prefetched.current
    prefetched.current = null
    setList(null)
    setSlow(false)
    const timer = window.setTimeout(() => {
      if (id === request.current) setSlow(true)
    }, SKELETON_DELAY)
    const promise =
      usePrefetch && p && Date.now() - p.at < PREFETCH_TTL
        ? p.promise
        : listSharedLinks()
    promise
      .finally(() => window.clearTimeout(timer))
      .then((res) => {
        if (id !== request.current) return
        setList(
          res.ok
            ? res.list
            : { ...EMPTY_LIST, failed: ["conversations", "records"] }
        )
        if (res.ok && res.list.links.length > 0) setHadLinks(true)
      })
      .catch(() => {
        if (id === request.current) {
          setList({ ...EMPTY_LIST, failed: ["conversations", "records"] })
        }
      })
  }, [])
  // Pencere kapanınca yoldaki yanıt yok sayılır.
  const cancelLoad = React.useCallback(() => {
    request.current++
  }, [])

  React.useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- her açılışta liste sunucudan tazelenir
    setQuery("")
    load(true)
    return cancelLoad
  }, [open, load, cancelLoad])

  const links = list?.links ?? []
  const needle = query.trim().toLocaleLowerCase("tr-TR")
  const visible = links.filter(
    (link) =>
      (filter === "all" || link.kind === filter) &&
      (!needle || link.title.toLocaleLowerCase("tr-TR").includes(needle))
  )
  const scopeCount =
    filter === "all"
      ? links.length
      : links.filter((link) => link.kind === filter).length
  // Araç çubuğu yüklenirken de durur, liste alanı sabit yükseklikte: ortalanan
  // pencere süzerken yeniden ortalanıp segmentin zeminini havada kaydırmasın.
  const loading = list === null
  const showToolbar = loading || hadLinks || links.length > 0
  const status =
    loading || links.length === 0
      ? ""
      : needle
        ? `${visible.length} sonuç`
        : `${visible.length} bağlantı`

  // Yeni süzgeç ya da arama listenin başından gösterilir.
  function changeFilter(next: SharedLinkScope) {
    setFilter(next)
    scrollRef.current?.scrollTo({ top: 0 })
  }

  function changeQuery(next: string) {
    setQuery(next)
    scrollRef.current?.scrollTo({ top: 0 })
  }

  function clearSearch() {
    changeQuery("")
    searchRef.current?.focus()
  }

  // Odaktaki satır silinince odak komşu satırın kaldır butonuna geçer.
  function focusNeighbor(key: string) {
    const buttons = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>("[data-revoke]") ?? []
    )
    const i = buttons.findIndex((b) => b.dataset.revoke === key)
    if (i < 0 || buttons[i] !== document.activeElement) return
    ;(buttons[i + 1] ?? buttons[i - 1] ?? searchRef.current)?.focus()
  }

  async function revoke(link: SharedLink) {
    const key = keyOf(link)
    if (pending.has(key)) return
    setPending((p) => new Set(p).add(key))
    try {
      const res = await revokeLink(link)
      if (!res.ok) throw new Error(res.error)
      forgetShare(link.kind, link.id)
      focusNeighbor(key)
      setList((l) =>
        l ? { ...l, links: l.links.filter((i) => keyOf(i) !== key) } : l
      )
      toast.success("Bağlantı kaldırıldı.")
    } catch {
      toast.error("Bağlantı kaldırılamadı. Lütfen tekrar dene.")
    } finally {
      setPending((p) => {
        const next = new Set(p)
        next.delete(key)
        return next
      })
    }
  }

  async function revokeAll() {
    const scope = filter
    setClearing(true)
    try {
      const res = await unshareSharedLinks(scope)
      if (!res.ok) throw new Error(res.error)
      forgetShares(scope)
      setConfirmAll(false)
      toast.success(
        res.deleted > 0
          ? `${res.deleted} bağlantı kaldırıldı.`
          : "Kaldırılacak bağlantı yok."
      )
      // Tavanı aşan listede görünmeyenler de silindi; yenisi sunucudan.
      if (list?.truncated) load()
      else
        setList((l) =>
          l
            ? {
                ...l,
                links: l.links.filter(
                  (i) => scope !== "all" && i.kind !== scope
                ),
              }
            : l
        )
    } catch {
      // Bir kısmı silinmiş olabilir: liste sunucudan tazelenir.
      toast.error("Bağlantılar kaldırılamadı. Lütfen tekrar dene.")
      load()
    } finally {
      setClearing(false)
    }
  }

  async function copy(link: SharedLink) {
    if (await copyText(shareUrl(link))) {
      toast.success("Bağlantı kopyalandı.")
    } else {
      toast.error("Bağlantı kopyalanamadı.")
    }
  }

  const failedText =
    list && list.failed.length > 0
      ? list.failed.length > 1
        ? "Paylaşılan bağlantılar yüklenemedi."
        : list.failed[0] === "conversations"
          ? "Sohbet bağlantıları yüklenemedi."
          : "Sepet ve fiş bağlantıları yüklenemedi."
      : null

  const emptyState =
    visible.length > 0 ? null : links.length === 0 ? (
      failedText ? null : (
        <EmptyState
          title="Paylaştığın bir sohbet, sepet ya da fiş yok."
          hint="Bir sohbeti, sepeti ya da fişi paylaştığında bağlantısı burada listelenir."
        />
      )
    ) : needle ? (
      <EmptyState title={`“${query.trim()}” için bağlantı yok.`}>
        <Button
          variant="outline"
          size="sm"
          onClick={clearSearch}
          className="mt-2"
        >
          Aramayı temizle
        </Button>
      </EmptyState>
    ) : filter !== "all" ? (
      <EmptyState title={`Paylaştığın bir ${KIND[filter].noun} yok.`} />
    ) : null

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onPointerEnter={prefetch}
        onPointerDown={prefetch}
        onFocus={prefetch}
        onClick={() => {
          setHadLinks(false)
          setOpen(true)
        }}
      >
        Yönet
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Paylaşılan bağlantılar</DialogTitle>
            <DialogDescription>
              Bağlantısı olan herkesin görebildiği sohbet, sepet ve fişlerin.
              Kaldırdığın bağlantı anında çalışmaz olur.
            </DialogDescription>
          </DialogHeader>

          {showToolbar ? (
            <div className="grid gap-2">
              <SegmentedControl
                aria-label="Bağlantı türü"
                size="sm"
                value={filter}
                onValueChange={changeFilter}
                className="w-full"
              >
                {FILTERS.map((value) => (
                  <SegmentedControlItem
                    key={value}
                    value={value}
                    disabled={loading}
                  >
                    {value === "all" ? "Tümü" : KIND[value].label}
                  </SegmentedControlItem>
                ))}
              </SegmentedControl>
              <div className="relative">
                <RiSearchLine
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  ref={searchRef}
                  type="search"
                  inputMode="search"
                  value={query}
                  onChange={(e) => changeQuery(e.target.value)}
                  placeholder="Başlıkta ara…"
                  aria-label="Paylaşılan bağlantılarda ara"
                  maxLength={100}
                  disabled={loading}
                  className="h-9 pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
                />
                {query ? (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={clearSearch}
                    aria-label="Aramayı temizle"
                    className="absolute top-1/2 right-2 -translate-y-1/2"
                  >
                    <RiCloseLine />
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Kenardan kenara liste; alt kenarı footer şeridinin üst çizgisi. */}
          <div
            className={cn(
              "-mx-4 -mb-4 flex flex-col border-t",
              showToolbar && "h-[max(6rem,min(24rem,calc(100dvh_-_18rem)))]"
            )}
          >
            {/* Kaydırılan alanın dışında: hata, liste kaysa da görünür kalır. */}
            {failedText ? (
              <div
                role="alert"
                className="flex shrink-0 items-center gap-2 border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground"
              >
                <span className="flex-1">{failedText}</span>
                <Button variant="outline" size="xs" onClick={() => load()}>
                  Tekrar dene
                </Button>
              </div>
            ) : null}
            <div className="relative flex min-h-0 flex-1 flex-col">
              {/* scroll-py: klavye odağı satırı solmanın altında bırakmasın. */}
              <div
                ref={observeScroll}
                onScroll={updateFade}
                className="cn-scrollbar-thin min-h-0 flex-1 scroll-py-6 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain"
              >
                <div className="flex min-h-full flex-col">
                  {loading ? (
                    <div aria-busy="true" className="divide-y">
                      {slow
                        ? [0, 1, 2].map((i) => <LinkRowSkeleton key={i} />)
                        : null}
                    </div>
                  ) : visible.length > 0 ? (
                    <ul ref={listRef} className="divide-y">
                      {visible.map((link) => (
                        <LinkRow
                          key={keyOf(link)}
                          link={link}
                          busy={pending.has(keyOf(link))}
                          onCopy={() => void copy(link)}
                          onRevoke={() => void revoke(link)}
                        />
                      ))}
                    </ul>
                  ) : (
                    emptyState
                  )}
                  {list?.truncated ? (
                    <p className="mt-auto border-t px-4 py-2 text-center text-xs text-muted-foreground">
                      Yalnızca en yeni bağlantılar listeleniyor.
                    </p>
                  ) : null}
                </div>
              </div>
              <div
                aria-hidden
                className={cn(
                  FADE,
                  "top-0 bg-gradient-to-b",
                  !fade.top && "opacity-0"
                )}
              />
              <div
                aria-hidden
                className={cn(
                  FADE,
                  "bottom-0 bg-gradient-to-t",
                  !fade.bottom && "opacity-0"
                )}
              />
            </div>
          </div>

          <DialogFooter className="flex-row items-center justify-between sm:justify-between">
            <p
              role="status"
              className="flex min-h-7 items-center text-xs text-muted-foreground tabular-nums"
            >
              {status}
            </p>
            {/* Aramada gizli: toplu kaldırma süzülen sonuçları değil türün tamamını siler. */}
            {needle ? null : (
              <Button
                variant="destructive"
                size="sm"
                disabled={loading || scopeCount === 0}
                onClick={() => setConfirmAll(true)}
              >
                Tümünü kaldır
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmAll}
        onOpenChange={(o) => !clearing && setConfirmAll(o)}
      >
        <AlertDialogContent
          onCloseAutoFocus={(e) => {
            // Hepsi silindiyse dönülecek "Tümünü kaldır" artık pasif.
            if (scopeCount > 0) return
            e.preventDefault()
            searchRef.current?.focus()
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{CONFIRM[filter].title}</AlertDialogTitle>
            <AlertDialogDescription>
              {CONFIRM[filter].body}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={clearing}
              onClick={(e) => {
                e.preventDefault()
                void revokeAll()
              }}
            >
              {clearing
                ? "Kaldırılıyor…"
                : list?.truncated
                  ? "Tümünü kaldır"
                  : `${scopeCount} bağlantıyı kaldır`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function EmptyState({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children?: React.ReactNode
}) {
  return (
    <div className="m-auto grid justify-items-center gap-1 px-4 py-8 text-center text-sm text-balance">
      <p className="font-medium">{title}</p>
      {hint ? <p className="text-muted-foreground">{hint}</p> : null}
      {children}
    </div>
  )
}

function LinkRowSkeleton() {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5">
      <Skeleton className="size-4 shrink-0 rounded" />
      <div className="grid flex-1 gap-1.5">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="size-8 rounded-md" />
      <Skeleton className="size-8 rounded-md" />
    </div>
  )
}

function LinkRow({
  link,
  busy,
  onCopy,
  onRevoke,
}: {
  link: SharedLink
  busy: boolean
  onCopy: () => void
  onRevoke: () => void
}) {
  const { label, icon: Icon } = KIND[link.kind]
  return (
    <li className="flex items-center gap-2 px-4 py-2.5">
      <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <div className="grid min-w-0 flex-1 gap-0.5">
        <a
          href={shareUrl(link)}
          target="_blank"
          rel="noopener noreferrer"
          title={link.title}
          className="flex w-fit max-w-full min-w-0 items-center gap-1 text-sm font-medium underline-offset-2 hover:underline"
        >
          <span className="sr-only">{label}: </span>
          <span className="truncate">{link.title}</span>
          <RiExternalLinkLine
            aria-hidden
            className="size-3.5 shrink-0 text-muted-foreground"
          />
          <span className="sr-only"> (yeni sekmede açılır)</span>
        </a>
        <span className="flex h-5 items-center gap-1.5 text-xs text-muted-foreground">
          {dateFormat.format(new Date(link.sharedAt))}
          {link.anonymous ? <Badge variant="secondary">Anonim</Badge> : null}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`${link.title} bağlantısını kopyala`}
        onClick={onCopy}
      >
        <RiFileCopyLine />
      </Button>
      {/* `disabled` yerine aria-disabled: istek sürerken odak butonda kalır. */}
      <Button
        variant="destructive"
        size="icon-sm"
        data-revoke={keyOf(link)}
        aria-label={`${link.title} bağlantısını kaldır`}
        aria-disabled={busy || undefined}
        onClick={onRevoke}
        className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
      >
        <RiDeleteBinLine />
      </Button>
    </li>
  )
}
