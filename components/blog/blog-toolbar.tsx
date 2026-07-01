"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Command } from "cmdk"
import {
  CheckIcon,
  ChevronDownIcon,
  RssIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"

import { CATEGORIES, CATEGORY_LIST, type CategoryId } from "@/lib/blog/categories"
import { searchDocs, type Highlight, type SearchDoc } from "@/lib/blog/search"
import { cn } from "@/lib/utils"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Skeleton } from "@/components/ui/skeleton"

// Blog index araç çubuğu (Vercel blog esinli): solda kategori filtresi, sağda
// RSS'in solunda anlık arama. Arama tamamen istemcide (veri build-time) → tek
// harfte bile gecikmesiz. Mobilde kategoriler drawer'a, arama tam genişlik bir
// alana açılır.
export function BlogToolbar({
  active,
  docs,
}: {
  active?: CategoryId
  docs: SearchDoc[]
}) {
  const router = useRouter()
  const rootRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const [query, setQuery] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  // Mobilde arama ikonuna basılınca tam genişlik input'a açılır; kategori
  // tetikleyicisi gizlenir.
  const [searchOpen, setSearchOpen] = React.useState(false)

  const trimmed = query.trim()
  const showPanel = open && trimmed.length > 0
  const results = React.useMemo(() => searchDocs(docs, query), [docs, query])

  // Skeleton parlaması yalnız "aramaya yeni başlanırken" (boş → dolu) gösterilir;
  // sonraki tuşlarda sonuçlar canlı güncellenir (flicker yok, hızlı hissettirir).
  const loadingTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  React.useEffect(() => {
    return () => {
      if (loadingTimer.current) clearTimeout(loadingTimer.current)
    }
  }, [])

  function flashSkeleton() {
    setLoading(true)
    if (loadingTimer.current) clearTimeout(loadingTimer.current)
    loadingTimer.current = setTimeout(() => setLoading(false), 140)
  }

  function handleQueryChange(value: string) {
    const next = value.trim()
    const wasEmpty = trimmed.length === 0
    setQuery(value)
    setOpen(next.length > 0)
    if (next.length === 0) {
      setLoading(false)
      if (loadingTimer.current) clearTimeout(loadingTimer.current)
    } else if (wasEmpty) {
      flashSkeleton()
    }
  }

  // Panel açıkken dışarı tıklamada kapat (sonuç tıklamaları rootRef içinde).
  React.useEffect(() => {
    if (!showPanel) return
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearchOpen(false)
      }
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [showPanel])

  function go(href: string) {
    setOpen(false)
    setSearchOpen(false)
    setQuery("")
    router.push(href)
  }

  function clear() {
    setQuery("")
    setOpen(false)
    setSearchOpen(false)
    setLoading(false)
    if (loadingTimer.current) clearTimeout(loadingTimer.current)
  }

  function openMobileSearch() {
    setSearchOpen(true)
    if (trimmed) setOpen(true)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <div
      ref={rootRef}
      className="relative flex items-center justify-between gap-2"
    >
      {/* Kategori filtresi: masaüstünde pill satırı, mobilde drawer tetikleyici */}
      <div
        className={cn(
          "-mx-1 hidden flex-wrap items-center gap-2 px-1 sm:flex",
        )}
      >
        <Link href="/blog" className={pillClass(!active)}>
          Tümü
        </Link>
        {CATEGORY_LIST.map((category) => (
          <Link
            key={category.id}
            href={`/blog?kategori=${category.slug}`}
            className={pillClass(active === category.id)}
          >
            {category.label}
          </Link>
        ))}
      </div>

      <CategoryDrawer
        active={active}
        className={cn("sm:hidden", searchOpen && "hidden")}
      />

      {/* Sağ küme: arama + RSS */}
      <div
        className={cn(
          "flex items-center gap-2 sm:flex-none",
          searchOpen && "flex-1",
        )}
      >
        {/* Mobil: aramayı açan ikon (kapalıyken) */}
        <button
          type="button"
          aria-label="Ara"
          onClick={openMobileSearch}
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground sm:hidden",
            searchOpen && "hidden",
          )}
        >
          <SearchIcon className="size-4" />
        </button>

        {/* Arama: masaüstünde her zaman; mobilde yalnız searchOpen iken */}
        <Command
          shouldFilter={false}
          loop
          className={cn(
            "relative items-center sm:flex sm:w-64 sm:flex-none",
            searchOpen ? "flex flex-1" : "hidden",
          )}
        >
          <div className="flex h-8 w-full items-center gap-2 rounded-lg border border-input bg-muted/40 pr-1.5 pl-3 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
            <Command.Input
              ref={inputRef}
              value={query}
              onValueChange={handleQueryChange}
              onFocus={() => {
                if (trimmed) setOpen(true)
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  if (trimmed) clear()
                  else setSearchOpen(false)
                  inputRef.current?.blur()
                }
              }}
              placeholder="Yazılarda ara..."
              className="h-full w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {(trimmed || searchOpen) && (
              <button
                type="button"
                aria-label="Aramayı temizle"
                onClick={clear}
                className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </div>

          {showPanel && (
            <div className="absolute top-[calc(100%+8px)] right-0 left-0 z-50 overflow-hidden rounded-xl border border-border bg-popover p-1.5 shadow-lg shadow-foreground/5 sm:left-auto sm:w-[28rem] sm:max-w-[calc(100vw-2rem)]">
              <Command.List className="cn-scrollbar-thin max-h-[min(60vh,22rem)] overflow-x-hidden overflow-y-auto">
                {loading ? (
                  <SearchSkeletons />
                ) : results.length > 0 ? (
                  results.map(({ doc, titleHl, descHl }) => (
                    <Command.Item
                      key={doc.slug}
                      value={doc.slug}
                      onSelect={() => go(doc.permalink)}
                      className="flex cursor-pointer flex-col gap-1.5 rounded-lg px-3 py-2.5 data-[selected=true]:bg-muted/60"
                    >
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                          <Highlighted text={doc.title} ranges={titleHl} />
                        </span>
                        <span className="shrink-0 rounded-md border border-border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {doc.categoryLabel}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {doc.dateLabel}
                      </span>
                      <span className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        <Highlighted text={doc.description} ranges={descHl} />
                      </span>
                    </Command.Item>
                  ))
                ) : (
                  <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                    <span className="text-foreground">“{trimmed}”</span> için
                    sonuç bulunamadı.
                  </div>
                )}
              </Command.List>
            </div>
          )}
        </Command>

        <a
          href="/blog/rss.xml"
          aria-label="RSS akışı"
          title="RSS akışı"
          className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
        >
          <RssIcon className="size-4" />
        </a>
      </div>
    </div>
  )
}

function pillClass(active: boolean) {
  return cn(
    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
    active
      ? "bg-primary text-primary-foreground hover:bg-primary/90"
      : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
  )
}

function SearchSkeletons() {
  return (
    <div className="flex flex-col">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-2 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-14 rounded-md" />
          </div>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  )
}

// Eşleşen parçaları marka renginde vurgular. Aralıklar HAM metin indeksleri
// (bkz. lib/blog/search.ts fold(): uzunluk korunur).
function Highlighted({ text, ranges }: { text: string; ranges: Highlight[] }) {
  if (ranges.length === 0) return <>{text}</>
  const parts: React.ReactNode[] = []
  let cursor = 0
  ranges.forEach(([start, end], i) => {
    if (start > cursor) {
      parts.push(
        <React.Fragment key={`t${i}`}>
          {text.slice(cursor, start)}
        </React.Fragment>,
      )
    }
    parts.push(
      <mark
        key={`m${i}`}
        className="rounded-[3px] bg-primary/15 text-primary"
      >
        {text.slice(start, end)}
      </mark>,
    )
    cursor = end
  })
  if (cursor < text.length) {
    parts.push(<React.Fragment key="tail">{text.slice(cursor)}</React.Fragment>)
  }
  return <>{parts}</>
}

// Mobil kategori seçici: aktif etiketi gösteren buton → alttan drawer.
function CategoryDrawer({
  active,
  className,
}: {
  active?: CategoryId
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const label = active ? CATEGORIES[active].label : "Tümü"
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger
        className={cn(
          "flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
          className,
        )}
      >
        {label}
        <ChevronDownIcon className="size-4 text-primary-foreground/70" />
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Kategoriler</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-1 p-2 pb-6">
          <DrawerClose asChild>
            <Link href="/blog" className={drawerItemClass(!active)}>
              Tümü
              {!active && <CheckIcon className="ml-auto size-4" />}
            </Link>
          </DrawerClose>
          {CATEGORY_LIST.map((category) => (
            <DrawerClose asChild key={category.id}>
              <Link
                href={`/blog?kategori=${category.slug}`}
                className={drawerItemClass(active === category.id)}
              >
                {category.label}
                {active === category.id && (
                  <CheckIcon className="ml-auto size-4" />
                )}
              </Link>
            </DrawerClose>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function drawerItemClass(active: boolean) {
  return cn(
    "flex items-center rounded-lg px-3 py-2.5 text-sm transition-colors",
    active
      ? "bg-muted font-medium text-foreground"
      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
  )
}
