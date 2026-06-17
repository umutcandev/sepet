"use client"

import * as React from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import {
  ArrowRightIcon,
  CheckSquareIcon,
  ListFilterIcon,
  MoreHorizontalIcon,
  SearchIcon,
  ShoppingBasketIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

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
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { MarketCell } from "@/components/market-cell"
import { useMediaQuery } from "@/hooks/use-media-query"
import {
  BASKET_SORTS,
  type BasketSort,
  DEFAULT_BASKET_SORT,
} from "@/lib/basket-sort"
import {
  type BasketListItem,
  deleteBasket,
  deleteBaskets,
  listBasketsPaginated,
  searchBaskets,
} from "@/lib/actions/baskets"
import { cn } from "@/lib/utils"

const tl = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 2,
})

const dateFmt = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

type Props = {
  initial: BasketListItem[]
  initialHasMore: boolean
}

export function BasketsBrowser({ initial, initialHasMore }: Props) {
  const [items, setItems] = React.useState<BasketListItem[]>(initial)

  // ── Infinite scroll state ──
  const [hasMore, setHasMore] = React.useState(initialHasMore)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const loadingRef = React.useRef(false)
  const sentinelRef = React.useRef<HTMLDivElement>(null)

  // ── Sıralama ── Sunucu tarafında uygulanır (infinite scroll ile tutarlı).
  const [sort, setSort] = React.useState<BasketSort>(DEFAULT_BASKET_SORT)
  const listGen = React.useRef(0)

  // Arama: boş sorgu → null (tam listeyi göster). Doluysa server sonuçları.
  const [query, setQuery] = React.useState("")
  const debouncedQuery = useDebounced(query, 300)
  const [searchResults, setSearchResults] = React.useState<
    BasketListItem[] | null
  >(null)
  const [searchLoading, setSearchLoading] = React.useState(false)
  const reqId = React.useRef(0)

  // Seçim modu (toplu işlem).
  const [selecting, setSelecting] = React.useState(false)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())

  // Diyalog hedefleri.
  const [singleDeleteTarget, setSingleDeleteTarget] =
    React.useState<BasketListItem | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false)
  const [deletePending, setDeletePending] = React.useState(false)

  const displayed = searchResults ?? items
  const isSearchActive = debouncedQuery.trim().length > 0
  const isEmpty = items.length === 0 && !isSearchActive

  // ── Infinite scroll: sonraki sayfayı yükle ──
  const loadMore = React.useCallback(async () => {
    if (loadingRef.current || !hasMore) return
    loadingRef.current = true
    setLoadingMore(true)
    const gen = listGen.current
    try {
      const { items: next, hasMore: more } = await listBasketsPaginated(
        items.length,
        sort,
      )
      if (listGen.current !== gen) return
      setItems((prev) => {
        const existingIds = new Set(prev.map((c) => c.id))
        const fresh = next.filter((c) => !existingIds.has(c.id))
        return [...prev, ...fresh]
      })
      setHasMore(more)
    } catch {
      if (listGen.current === gen) toast.error("Sepetler yüklenemedi.")
    } finally {
      if (listGen.current === gen) {
        loadingRef.current = false
        setLoadingMore(false)
      }
    }
  }, [hasMore, items.length, sort])

  // IntersectionObserver: sentinel görünür olunca sonraki sayfayı yükle.
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
  const didMountSort = React.useRef(false)
  React.useEffect(() => {
    if (!didMountSort.current) {
      didMountSort.current = true
      return
    }
    const gen = ++listGen.current
    loadingRef.current = true
    setLoadingMore(true)
    listBasketsPaginated(0, sort)
      .then(({ items: fresh, hasMore: more }) => {
        if (listGen.current !== gen) return
        setItems(fresh)
        setHasMore(more)
      })
      .catch(() => {
        if (listGen.current === gen) toast.error("Sepetler yüklenemedi.")
      })
      .finally(() => {
        if (listGen.current === gen) {
          loadingRef.current = false
          setLoadingMore(false)
        }
      })
  }, [sort])

  // ── Arama efekti ── stale yanıtları reqId ile ele (son istek kazanır).
  React.useEffect(() => {
    const q = debouncedQuery.trim()
    if (!q) return

    const id = ++reqId.current
    searchBaskets(q, sort)
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

  // Silme sonrası yüklü liste boşaldıysa ama sunucuda daha fazlası varsa ilk
  // sayfayı yeniden yükle — sentinel görünmediği için liste aksi halde takılır.
  const reloadFirstPage = React.useCallback(() => {
    const gen = ++listGen.current
    loadingRef.current = true
    setLoadingMore(true)
    listBasketsPaginated(0, sort)
      .then(({ items: fresh, hasMore: more }) => {
        if (listGen.current !== gen) return
        setItems(fresh)
        setHasMore(more)
      })
      .catch(() => {
        if (listGen.current === gen) toast.error("Sepetler yüklenemedi.")
      })
      .finally(() => {
        if (listGen.current === gen) {
          loadingRef.current = false
          setLoadingMore(false)
        }
      })
  }, [sort])

  // ── Mutasyon yardımcısı ── items + searchResults senkron.
  const applyRemove = React.useCallback((ids: string[]) => {
    const idSet = new Set(ids)
    setItems((prev) => prev.filter((c) => !idSet.has(c.id)))
    setSearchResults((prev) =>
      prev ? prev.filter((c) => !idSet.has(c.id)) : prev,
    )
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
        const next = new Set(prev)
        for (const id of displayedIds) next.delete(id)
        return next
      }
      return new Set([...prev, ...displayedIds])
    })
  }, [displayedIds])

  // ── Tekil silme ──
  const handleSingleDelete = async () => {
    if (!singleDeleteTarget) return
    setDeletePending(true)
    try {
      await deleteBasket(singleDeleteTarget.id)
      applyRemove([singleDeleteTarget.id])
      setSingleDeleteTarget(null)
      toast.success("Sepet silindi.")
      if (!isSearchActive && hasMore && items.length <= 1) reloadFirstPage()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sepet silinemedi.")
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
      const { deleted } = await deleteBaskets(ids)
      const idSet = new Set(ids)
      const remaining = items.filter((c) => !idSet.has(c.id))
      applyRemove(ids)
      exitSelect()
      setBulkDeleteOpen(false)
      toast.success(
        deleted === 1 ? "1 sepet silindi." : `${deleted} sepet silindi.`,
      )
      if (!isSearchActive && hasMore && remaining.length === 0) reloadFirstPage()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sepetler silinemedi.")
    } finally {
      setDeletePending(false)
    }
  }

  const selectedCount = selected.size

  // Mobilde seçim modundayken üst bar dar kalıyor; başlığı gizleyip aksiyonlara
  // tüm satırı bırakıyoruz. Desktop'ta başlık korunur.
  const isMobile = useMediaQuery("(max-width: 639px)")
  const showHeading = !(selecting && isMobile)

  return (
    <div className="space-y-5">
      {/* Başlık + aksiyonlar */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <AnimatePresence initial={false} mode="popLayout">
            {showHeading ? (
              <motion.h1
                key="sepetlerim-title"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="text-2xl font-semibold tracking-tight"
              >
                Sepetlerim
              </motion.h1>
            ) : null}
          </AnimatePresence>
          {isEmpty ? null : selecting ? (
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => enterSelect()}
              disabled={displayed.length === 0}
            >
              Sepetleri Seç
            </Button>
          )}
        </div>
        {showHeading ? (
          <p className="text-sm text-muted-foreground">
            Asistana yazdığın alışveriş listelerinden oluşturduğun sepetleri
            buradan takip et.
          </p>
        ) : null}
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-12 text-center">
          <div className="rounded-full bg-secondary p-3 text-primary">
            <ShoppingBasketIcon className="size-5" />
          </div>
          <h2 className="text-base font-medium">Henüz sepet oluşturmadın</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Asistana alışveriş listeni yaz. Kalemleri onayladığında 6 markette en
            ucuzunu bulup buraya kaydedelim.
          </p>
          <Button asChild className="mt-2">
            <Link href="/asistan">Asistan&apos;a git</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Arama + sıralama */}
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
                placeholder="Sepetlerde ara…"
                aria-label="Sepetlerde ara"
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
                  onValueChange={(v) => setSort(v as BasketSort)}
                >
                  {BASKET_SORTS.map((opt) => (
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
              <Table className="[&_tr>*:first-child]:pl-4 [&_tr>*:last-child]:pr-4">
                <TableHeader>
                  <TableRow className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {selecting ? <TableHead className="w-10" /> : null}
                    <TableHead className="min-w-[100px]">Tarih</TableHead>
                    <TableHead className="min-w-[160px]">Sepet adı</TableHead>
                    <TableHead className="min-w-[140px]">En iyi market</TableHead>
                    <TableHead className="w-28 text-right">Toplam</TableHead>
                    <TableHead className="w-28 text-right">
                      2 market tasarrufu
                    </TableHead>
                    {selecting ? null : <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayed.map((b) => {
                    const isSelected = selected.has(b.id)
                    const twoMarket = b.twoMarketSavingsTL
                      ? Number(b.twoMarketSavingsTL)
                      : 0
                    if (selecting) {
                      return (
                        <TableRow
                          key={b.id}
                          tabIndex={0}
                          onClick={() => toggleSelect(b.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              toggleSelect(b.id)
                            }
                          }}
                          aria-pressed={isSelected}
                          className={cn(
                            "cursor-pointer",
                            isSelected && "bg-secondary/40",
                          )}
                        >
                          <TableCell className="w-10">
                            <Checkbox
                              checked={isSelected}
                              tabIndex={-1}
                              aria-hidden
                              className="pointer-events-none"
                            />
                          </TableCell>
                          <TableCell>
                            {dateFmt.format(new Date(b.createdAt))}
                          </TableCell>
                          <TableCell className="font-medium">{b.name}</TableCell>
                          <TableCell>
                            <MarketCell
                              name={b.bestSingleMarket}
                              size="sm"
                              clickable={false}
                            />
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {b.bestSingleTotal
                              ? tl.format(Number(b.bestSingleTotal))
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {twoMarket > 0 ? (
                              <Badge
                                variant="outline"
                                className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400"
                              >
                                {tl.format(twoMarket)}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    }
                    return (
                      <TableRow
                        key={b.id}
                        className="cursor-pointer hover:bg-secondary/50"
                      >
                        <TableCell>
                          <Link
                            href={`/sepetlerim/${b.id}`}
                            className="block"
                          >
                            {dateFmt.format(new Date(b.createdAt))}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/sepetlerim/${b.id}`}
                            className="block font-medium"
                          >
                            {b.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/sepetlerim/${b.id}`}
                            className="block"
                          >
                            <MarketCell
                              name={b.bestSingleMarket}
                              size="sm"
                              clickable={false}
                            />
                          </Link>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <Link
                            href={`/sepetlerim/${b.id}`}
                            className="block"
                          >
                            {b.bestSingleTotal
                              ? tl.format(Number(b.bestSingleTotal))
                              : "—"}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <Link
                            href={`/sepetlerim/${b.id}`}
                            className="block"
                          >
                            {twoMarket > 0 ? (
                              <Badge
                                variant="outline"
                                className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400"
                              >
                                {tl.format(twoMarket)}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                aria-label="Sepet eylemleri"
                                className="text-muted-foreground"
                              >
                                <MoreHorizontalIcon className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-40">
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault()
                                  enterSelect(b.id)
                                }}
                              >
                                <CheckSquareIcon className="mr-2 size-4" />
                                Seç
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={(e) => {
                                  e.preventDefault()
                                  setSingleDeleteTarget(b)
                                }}
                              >
                                <Trash2Icon className="mr-2 size-4" />
                                Sil
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              {/* Infinite scroll sentinel */}
              {hasMore && !isSearchActive ? (
                <div ref={sentinelRef} className="flex justify-center py-4">
                  {loadingMore ? (
                    <Spinner className="size-5 text-muted-foreground" />
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </>
      )}

      {/* Tekil silme onayı */}
      <AlertDialog
        open={!!singleDeleteTarget}
        onOpenChange={(o) => {
          if (!o && !deletePending) setSingleDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sepet silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              “{singleDeleteTarget?.name}” adlı sepet ve içindeki kalemler
              kalıcı olarak silinecek. Bu işlem geri alınamaz.
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
                ? "Sepet silinsin mi?"
                : `${selectedCount} sepet silinsin mi?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedCount === 1
                ? "Seçili sepet ve içindeki kalemler kalıcı olarak silinecek."
                : `Seçili ${selectedCount} sepet ve içindeki kalemler kalıcı olarak silinecek.`}{" "}
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
                `${selectedCount} sepeti sil`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
