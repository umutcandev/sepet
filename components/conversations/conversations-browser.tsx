"use client"

import * as React from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import {
  ArrowRightIcon,
  CheckSquareIcon,
  ListFilterIcon,
  MessagesSquareIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  StarIcon,
  StarOffIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import type { ConversationListItem } from "@/components/assistant/assistant-conversations-group"
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
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useMediaQuery } from "@/hooks/use-media-query"
import {
  CONVERSATION_SORTS,
  type ConversationSort,
  DEFAULT_CONVERSATION_SORT,
} from "@/lib/conversation-sort"
import {
  deleteConversation,
  deleteConversations,
  listConversationsPaginated,
  renameConversation,
  searchConversations,
  setConversationStarred,
} from "@/lib/actions/conversations"
import { formatConversationDate } from "@/lib/conversation-date"
import { assistantConversations } from "@/lib/stores/assistant-conversations"
import { cn } from "@/lib/utils"

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

type Props = {
  initial: ConversationListItem[]
  initialHasMore: boolean
}

export function ConversationsBrowser({ initial, initialHasMore }: Props) {
  // Sayfanın tam listesi (server'dan). Tüm mutasyonlar burada + arama
  // sonuçlarında + sidebar store'unda eşzamanlı uygulanır.
  const [items, setItems] = React.useState<ConversationListItem[]>(initial)

  // ── Infinite scroll state ──
  const [hasMore, setHasMore] = React.useState(initialHasMore)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const loadingRef = React.useRef(false)
  const sentinelRef = React.useRef<HTMLDivElement>(null)

  // ── Sıralama ── Sunucu tarafında uygulanır (infinite scroll ile tutarlı).
  // initial veri DEFAULT_CONVERSATION_SORT ile geldiği için ilk render'da
  // tekrar yükleme yapılmaz. `listGen`, sıralama değişiminde uçuştaki eski
  // sayfa isteklerini geçersiz kılan kuşak (generation) sayacıdır.
  const [sort, setSort] = React.useState<ConversationSort>(
    DEFAULT_CONVERSATION_SORT,
  )
  const listGen = React.useRef(0)

  // Arama: boş sorgu → null (tam listeyi göster). Doluysa server sonuçları.
  const [query, setQuery] = React.useState("")
  const debouncedQuery = useDebounced(query, 300)
  const [searchResults, setSearchResults] = React.useState<
    ConversationListItem[] | null
  >(null)
  const [searchLoading, setSearchLoading] = React.useState(false)
  const reqId = React.useRef(0)

  // Seçim modu (toplu işlem).
  const [selecting, setSelecting] = React.useState(false)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())

  // Diyalog hedefleri.
  const [renameTarget, setRenameTarget] =
    React.useState<ConversationListItem | null>(null)
  const [singleDeleteTarget, setSingleDeleteTarget] =
    React.useState<ConversationListItem | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false)
  const [deletePending, setDeletePending] = React.useState(false)

  const displayed = searchResults ?? items
  const isSearchActive = debouncedQuery.trim().length > 0

  // ── Infinite scroll: sonraki sayfayı yükle ──
  // Guard olarak ref kullanılır; loadingMore state'i yalnızca spinner UI'ı
  // içindir. Böylece loadMore callback'i yükleme durumu değişimlerinde
  // yeniden oluşmaz ve observer döngüye girmez.
  const loadMore = React.useCallback(async () => {
    if (loadingRef.current || !hasMore) return
    loadingRef.current = true
    setLoadingMore(true)
    const gen = listGen.current
    try {
      const { items: next, hasMore: more } = await listConversationsPaginated(
        items.length,
        sort,
      )
      // Sıralama bu sırada değiştiyse eski sayfayı yok say.
      if (listGen.current !== gen) return
      setItems((prev) => {
        // Dedupe: silme/ekleme sonrası offset kayması olabilir.
        const existingIds = new Set(prev.map((c) => c.id))
        const fresh = next.filter((c: ConversationListItem) => !existingIds.has(c.id))
        return [...prev, ...fresh]
      })
      setHasMore(more)
    } catch {
      if (listGen.current === gen) toast.error("Sohbetler yüklenemedi.")
    } finally {
      if (listGen.current === gen) {
        loadingRef.current = false
        setLoadingMore(false)
      }
    }
  }, [hasMore, items.length, sort])

  // IntersectionObserver: sentinel görünür olunca sonraki sayfayı yükle.
  // Arama aktifken infinite scroll devre dışı.
  React.useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore || isSearchActive) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore()
      },
      { rootMargin: "200px" },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, isSearchActive, loadMore])

  // ── Sıralama değişimi ── Ana listeyi sıfırdan, yeni sıralamayla yükle.
  // Sadece görünür satırları sıralamak infinite scroll ile yanlış olurdu;
  // bu yüzden sunucudan ilk sayfayı yeniden çekiyoruz. İlk render atlanır
  // (initial veri zaten DEFAULT_CONVERSATION_SORT ile geldi).
  const didMountSort = React.useRef(false)
  React.useEffect(() => {
    if (!didMountSort.current) {
      didMountSort.current = true
      return
    }
    const gen = ++listGen.current
    loadingRef.current = true
    setLoadingMore(true)
    listConversationsPaginated(0, sort)
      .then(({ items: fresh, hasMore: more }) => {
        if (listGen.current !== gen) return
        setItems(fresh)
        setHasMore(more)
      })
      .catch(() => {
        if (listGen.current === gen) toast.error("Sohbetler yüklenemedi.")
      })
      .finally(() => {
        if (listGen.current === gen) {
          loadingRef.current = false
          setLoadingMore(false)
        }
      })
  }, [sort])

  // ── Arama efekti ── stale yanıtları reqId ile ele (son istek kazanır).
  // Sıralama da bağımlılıktır: arama açıkken sıralama değişince sonuçlar
  // yeni sırayla yeniden çekilir (arama paginate edilmez, tek seferde gelir).
  React.useEffect(() => {
    const q = debouncedQuery.trim()
    if (!q) return

    const id = ++reqId.current
    searchConversations(q, sort)
      .then((res) => {
        if (reqId.current !== id) return
        setSearchResults(res)
        setSearchLoading(false)
      })
      .catch(() => {
        if (reqId.current !== id) return
        setSearchResults([])
        setSearchLoading(false)
        toast.error("Arama başarısız oldu.")
      })
  }, [debouncedQuery, sort])

  // ── Mutasyon yardımcıları ── items + searchResults + sidebar store senkron.
  const applyRemove = React.useCallback((ids: string[]) => {
    const idSet = new Set(ids)
    setItems((prev) => prev.filter((c) => !idSet.has(c.id)))
    setSearchResults((prev) =>
      prev ? prev.filter((c) => !idSet.has(c.id)) : prev,
    )
    for (const id of ids) assistantConversations.remove(id)
  }, [])

  const applyStar = React.useCallback((id: string, starred: boolean) => {
    const map = (c: ConversationListItem) =>
      c.id === id ? { ...c, starred } : c
    setItems((prev) => prev.map(map))
    setSearchResults((prev) => (prev ? prev.map(map) : prev))
    assistantConversations.setStarred(id, starred)
  }, [])

  const applyRename = React.useCallback((id: string, title: string) => {
    const map = (c: ConversationListItem) =>
      c.id === id ? { ...c, title } : c
    setItems((prev) => prev.map(map))
    setSearchResults((prev) => (prev ? prev.map(map) : prev))
    assistantConversations.setTitle(id, title)
  }, [])

  // ── Seçim ──
  const displayedIds = React.useMemo(
    () => displayed.map((c) => c.id),
    [displayed],
  )
  const allDisplayedSelected =
    displayedIds.length > 0 && displayedIds.every((id) => selected.has(id))

  const toggleSelect = React.useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const enterSelect = React.useCallback((id?: string) => {
    setSelecting(true)
    if (id) setSelected(new Set([id]))
  }, [])

  const exitSelect = React.useCallback(() => {
    setSelecting(false)
    setSelected(new Set())
  }, [])

  const toggleSelectAll = React.useCallback(() => {
    setSelected((prev) => {
      const allSelected =
        displayedIds.length > 0 && displayedIds.every((id) => prev.has(id))
      if (allSelected) {
        // Görünenlerin seçimini kaldır (arama dışı seçimler korunur).
        const next = new Set(prev)
        for (const id of displayedIds) next.delete(id)
        return next
      }
      return new Set([...prev, ...displayedIds])
    })
  }, [displayedIds])

  // ── Yıldız ──
  const handleStar = React.useCallback(
    async (c: ConversationListItem) => {
      const next = !c.starred
      applyStar(c.id, next)
      try {
        await setConversationStarred(c.id, next)
      } catch {
        applyStar(c.id, !next)
        toast.error("İşlem başarısız oldu, tekrar dene.")
      }
    },
    [applyStar],
  )

  // ── Yeniden adlandır ──
  const [renameValue, setRenameValue] = React.useState("")
  const [renamePending, setRenamePending] = React.useState(false)
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRenameValue(renameTarget?.title ?? "")
  }, [renameTarget])

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!renameTarget) return
    const trimmed = renameValue.trim()
    if (!trimmed) return
    setRenamePending(true)
    try {
      await renameConversation(renameTarget.id, trimmed)
      applyRename(renameTarget.id, trimmed)
      setRenameTarget(null)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Sohbet yeniden adlandırılamadı.",
      )
    } finally {
      setRenamePending(false)
    }
  }

  // ── Tekil silme ──
  const handleSingleDelete = async () => {
    if (!singleDeleteTarget) return
    setDeletePending(true)
    try {
      await deleteConversation(singleDeleteTarget.id)
      applyRemove([singleDeleteTarget.id])
      setSingleDeleteTarget(null)
      toast.success("Sohbet silindi.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sohbet silinemedi.")
    } finally {
      setDeletePending(false)
    }
  }

  // ── Toplu silme ── server-first (güvenli): önce sil, sonra UI'dan kaldır.
  const handleBulkDelete = async () => {
    const ids = Array.from(selected)
    if (ids.length === 0) {
      setBulkDeleteOpen(false)
      return
    }
    setDeletePending(true)
    try {
      const { deleted } = await deleteConversations(ids)
      applyRemove(ids)
      exitSelect()
      setBulkDeleteOpen(false)
      toast.success(
        deleted === 1 ? "1 sohbet silindi." : `${deleted} sohbet silindi.`,
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sohbetler silinemedi.")
    } finally {
      setDeletePending(false)
    }
  }

  const selectedCount = selected.size

  // Mobilde (sm altı) seçim modundayken üst bar dar kalıyor; başlığı gizleyip
  // aksiyon butonlarına tüm satırı bırakıyoruz. Desktop'ta başlık korunur.
  const isMobile = useMediaQuery("(max-width: 639px)")
  const showTitle = !(selecting && isMobile)

  // ── Boş durum: hiç sohbet yok ──
  if (items.length === 0 && !isSearchActive) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-12 text-center">
        <div className="rounded-full bg-secondary p-3 text-primary">
          <MessagesSquareIcon className="size-5" />
        </div>
        <h2 className="text-base font-medium">Henüz sohbetin yok</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Asistan ile bir sohbet başlat; geçmiş sohbetlerin burada listelenir.
        </p>
        <Button asChild className="mt-2">
          <Link href="/asistan">
            <PlusIcon className="size-4" />
            Yeni Sohbet
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Üst bar: başlık solda, aksiyonlar sağda. Mobilde seçim modunda başlık
          fade ile gizlenir, aksiyonlar tüm satırı kullanır. */}
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <AnimatePresence initial={false} mode="popLayout">
          {showTitle ? (
            <motion.h1
              key="sohbetler-title"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="text-2xl font-semibold tracking-tight"
            >
              Sohbetler
            </motion.h1>
          ) : null}
        </AnimatePresence>
        {selecting ? (
          <div className="flex w-full items-center justify-between gap-1.5 sm:w-auto sm:justify-end">
            <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
              {selectedCount} seçildi
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                disabled={displayedIds.length === 0}
              >
                {allDisplayedSelected ? "Seçimi Kaldır" : "Tümünü Seç"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleteOpen(true)}
                disabled={selectedCount === 0}
              >
                Sil
              </Button>
              <Button variant="ghost" size="sm" onClick={exitSelect}>
                Vazgeç
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => enterSelect()}
              disabled={displayed.length === 0}
            >
              Sohbetleri Seç
            </Button>
            <Button asChild size="sm">
              <Link href="/asistan">
                <PlusIcon className="size-3.5" />
                Yeni Sohbet
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Arama kutusu + sıralama */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            inputMode="search"
            value={query}
            onChange={(e) => {
              const val = e.target.value
              setQuery(val)
              if (!val.trim()) {
                reqId.current++
                setSearchResults(null)
                setSearchLoading(false)
              } else {
                setSearchLoading(true)
              }
            }}
            placeholder="Sohbetlerde ara…"
            aria-label="Sohbetlerde ara"
            maxLength={100}
            className="h-9 pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
          />
          <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center">
            {searchLoading ? (
              <Spinner className="size-4 text-muted-foreground" />
            ) : query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("")
                  reqId.current++
                  setSearchResults(null)
                  setSearchLoading(false)
                }}
                aria-label="Aramayı temizle"
                className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            ) : null}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Sırala"
              className="size-9 shrink-0 text-muted-foreground"
            >
              <ListFilterIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            <DropdownMenuLabel>Sırala</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={sort}
              onValueChange={(v) => setSort(v as ConversationSort)}
            >
              {CONVERSATION_SORTS.map((opt) => (
                <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                  <span className="flex items-center gap-1">
                    {opt.prefix}
                    <ArrowRightIcon
                      className="size-3.5 text-muted-foreground"
                      aria-hidden
                    />
                    {opt.suffix}
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Liste / sonuç durumları */}
      {displayed.length === 0 ? (
        isSearchActive ? (
          <div className="rounded-xl border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              “{debouncedQuery.trim()}”
            </span>{" "}
            için sonuç bulunamadı.
          </div>
        ) : null
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <ul className="divide-y">
            {displayed.map((c) => {
              const isSelected = selected.has(c.id)
              const date = formatConversationDate(c.updatedAt)
              return (
                <li key={c.id}>
                  {selecting ? (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleSelect(c.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          toggleSelect(c.id)
                        }
                      }}
                      aria-pressed={isSelected}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-secondary/50",
                        isSelected && "bg-secondary/40",
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        tabIndex={-1}
                        aria-hidden
                        className="pointer-events-none"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {c.title}
                      </span>
                      {c.starred ? (
                        <StarIcon className="size-3.5 shrink-0 fill-current text-amber-500" />
                      ) : null}
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {date}
                      </span>
                    </div>
                  ) : (
                    <div className="group relative flex items-center gap-2 pr-2 transition-colors hover:bg-secondary/50">
                      <Link
                        href={`/asistan/${c.id}`}
                        className="flex min-w-0 flex-1 items-center gap-2 py-2 pl-4"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {c.title}
                        </span>
                        {c.starred ? (
                          <StarIcon className="size-3.5 shrink-0 fill-current text-amber-500" />
                        ) : null}
                      </Link>
                      <div className="flex shrink-0 items-center pr-1">
                        <span className="text-xs text-muted-foreground tabular-nums transition-opacity group-focus-within:opacity-0 group-hover:opacity-0 group-has-[[aria-expanded=true]]:opacity-0">
                          {date}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              aria-label="Sohbet eylemleri"
                              className="absolute right-2 text-muted-foreground opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 aria-expanded:opacity-100"
                            >
                              <MoreHorizontalIcon className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-44">
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault()
                                enterSelect(c.id)
                              }}
                            >
                              <CheckSquareIcon className="mr-2 size-4" />
                              Seç
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault()
                                void handleStar(c)
                              }}
                            >
                              {c.starred ? (
                                <>
                                  <StarOffIcon className="mr-2 size-4" />
                                  Favorilerden çıkar
                                </>
                              ) : (
                                <>
                                  <StarIcon className="mr-2 size-4" />
                                  Favorilere ekle
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault()
                                setRenameTarget(c)
                              }}
                            >
                              <PencilIcon className="mr-2 size-4" />
                              Yeniden adlandır
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={(e) => {
                                e.preventDefault()
                                setSingleDeleteTarget(c)
                              }}
                            >
                              <Trash2Icon className="mr-2 size-4" />
                              Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          {/* Infinite scroll sentinel — görünür olunca sonraki sayfa yüklenir */}
          {hasMore && !isSearchActive ? (
            <div ref={sentinelRef} className="flex justify-center py-4">
              {loadingMore ? (
                <Spinner className="size-5 text-muted-foreground" />
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {/* Yeniden adlandırma diyaloğu */}
      <Dialog
        open={!!renameTarget}
        onOpenChange={(o) => !o && setRenameTarget(null)}
      >
        <DialogContent>
          <form onSubmit={handleRenameSubmit}>
            <DialogHeader>
              <DialogTitle>Sohbeti yeniden adlandır</DialogTitle>
              <DialogDescription>
                Bu sohbet için yeni bir başlık gir.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                maxLength={100}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameTarget(null)}
              >
                Vazgeç
              </Button>
              <Button type="submit" disabled={renamePending || !renameValue.trim()}>
                {renamePending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tekil silme onayı */}
      <AlertDialog
        open={!!singleDeleteTarget}
        onOpenChange={(o) => {
          if (!o && !deletePending) setSingleDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sohbet silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              “{singleDeleteTarget?.title}” başlıklı sohbet ve tüm mesajları
              kalıcı olarak silinecek.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleSingleDelete()
              }}
              disabled={deletePending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePending ? "Siliniyor..." : "Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toplu silme onayı */}
      <AlertDialog
        open={bulkDeleteOpen}
        onOpenChange={(o) => {
          if (!o && !deletePending) setBulkDeleteOpen(false)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedCount === 1
                ? "Sohbet silinsin mi?"
                : `${selectedCount} sohbet silinsin mi?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedCount === 1
                ? "Seçili sohbet ve tüm mesajları kalıcı olarak silinecek."
                : `Seçili ${selectedCount} sohbet ve tüm mesajları kalıcı olarak silinecek.`}{" "}
              Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleBulkDelete()
              }}
              disabled={deletePending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePending ? (
                <>
                  <Spinner className="size-3.5" />
                  Siliniyor...
                </>
              ) : (
                `${selectedCount} sohbeti sil`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
