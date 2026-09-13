"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Command as CommandPrimitive } from "cmdk"
import {
  RiArrowDownSLine,
  RiCheckLine,
  RiCloseLine,
  RiRssLine,
  RiSearchLine,
} from "@remixicon/react"

import { CATEGORIES, CATEGORY_LIST, type CategoryId } from "@/lib/blog/categories"
import { searchDocs, type Highlight, type SearchDoc } from "@/lib/blog/search"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
} from "@/components/ui/input-group"
import { Skeleton } from "@/components/ui/skeleton"

/* Uçan panel: Radix popper kullanmadığımız için `DropdownMenuContent`in
   (ui/dropdown-menu.tsx) görsel yarısı burada birebir tekrarlanıyor —
   yarıçap, padding, gölge ve giriş animasyonu aynı kalsın diye. */
const PANEL_CLASS =
  "z-50 overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground smooth-shadow-ring-md duration-100 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2"

/* Sonuç satırı: `CommandItem` (ui/command.tsx) ile aynı ölçüler ve aynı seçim
   tokenı. Primitive'in kendisi kullanılamıyor, sonundaki onay ikonu bu çok
   satırlı düzende görünmez bir satır kadar yer kaplıyor. */
const ITEM_CLASS =
  "group/command-item relative flex cursor-pointer flex-col gap-1 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-selected:bg-accent data-selected:text-accent-foreground"

// Blog index araç çubuğu: solda kategori filtresi, sağda RSS'in solunda anlık
// arama. Arama tamamen istemcide (veri build-time). Mobilde kategoriler
// drawer'a, arama tam genişlik bir alana açılır.
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
      <div className="-mx-1 hidden flex-wrap items-center gap-2 px-1 sm:flex">
        <CategoryPill href="/blog" active={!active}>
          Tümü
        </CategoryPill>
        {CATEGORY_LIST.map((category) => (
          <CategoryPill
            key={category.id}
            href={`/blog?kategori=${category.slug}`}
            active={active === category.id}
          >
            {category.label}
          </CategoryPill>
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
        <Button
          variant="secondary"
          size="icon"
          aria-label="Ara"
          onClick={openMobileSearch}
          className={cn("sm:hidden", searchOpen && "hidden")}
        >
          <RiSearchLine />
        </Button>

        {/* Arama: masaüstünde her zaman; mobilde yalnız searchOpen iken */}
        <CommandPrimitive
          shouldFilter={false}
          loop
          className={cn(
            "relative items-center sm:flex sm:w-64 sm:flex-none",
            searchOpen ? "flex flex-1" : "hidden",
          )}
        >
          {/* `surface-well-fill`: InputGroup oyuğu çizer ama dolguyu basmaz
              (bkz. globals.css). Input primitive'i de bu ikiliyi kullanıyor. */}
          <InputGroup className="surface-well-fill">
            <InputGroupAddon>
              <RiSearchLine className="text-muted-foreground" />
            </InputGroupAddon>
            <CommandPrimitive.Input
              ref={inputRef}
              data-slot="input-group-control"
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
              aria-label="Yazılarda ara"
              placeholder="Yazılarda ara..."
              // `pr-2.5`: temizle düğmesi yokken (masaüstü, boş sorgu) sağda
              // hiç addon olmuyor. Düğme belirince InputGroup'un `:has()`
              // kuralı daha yüksek özgüllükle `pr-1.5`e çekiyor.
              // `text-base md:text-sm`: iOS 16px altı inputta sayfayı zoomluyor
              // (Input primitive'iyle aynı önlem).
              className="h-full min-w-0 flex-1 bg-transparent pr-2.5 text-base outline-none placeholder:text-muted-foreground md:text-sm"
            />
            {(trimmed || searchOpen) && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  aria-label="Aramayı temizle"
                  onClick={clear}
                >
                  <RiCloseLine />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>

          {showPanel && (
            <div
              className={cn(
                PANEL_CLASS,
                "absolute top-[calc(100%+8px)] right-0 left-0 sm:left-auto sm:w-[28rem] sm:max-w-[calc(100vw-2rem)]",
              )}
            >
              <CommandPrimitive.List className="cn-scrollbar-thin max-h-[min(60vh,22rem)] scroll-py-1 overflow-x-hidden overflow-y-auto">
                {loading ? (
                  <SearchSkeletons />
                ) : results.length > 0 ? (
                  results.map(({ doc, titleHl, descHl }) => (
                    <CommandPrimitive.Item
                      key={doc.slug}
                      value={doc.slug}
                      onSelect={() => go(doc.permalink)}
                      className={ITEM_CLASS}
                    >
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                          <Highlighted text={doc.title} ranges={titleHl} />
                        </span>
                        <Badge variant="outline">{doc.categoryLabel}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {doc.dateLabel}
                      </span>
                      <span className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        <Highlighted text={doc.description} ranges={descHl} />
                      </span>
                    </CommandPrimitive.Item>
                  ))
                ) : (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    <span className="text-foreground">“{trimmed}”</span> için
                    sonuç bulunamadı.
                  </div>
                )}
              </CommandPrimitive.List>
            </div>
          )}
        </CommandPrimitive>

        <Button asChild variant="secondary" size="icon" title="RSS akışı">
          <a href="/blog/rss.xml" aria-label="RSS akışı">
            <RiRssLine />
          </a>
        </Button>
      </div>
    </div>
  )
}

function CategoryPill({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Button asChild variant={active ? "default" : "secondary"}>
      <Link href={href}>{children}</Link>
    </Button>
  )
}

function SearchSkeletons() {
  return (
    <div className="flex flex-col">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-1 px-2 py-1.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-14 rounded-md" />
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
      <DrawerTrigger asChild>
        <Button className={className}>
          {label}
          <RiArrowDownSLine className="text-primary-foreground/70" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Kategoriler</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-1 p-2 pb-6">
          <DrawerClose asChild>
            <Link href="/blog" className={drawerItemClass(!active)}>
              Tümü
              {!active && <RiCheckLine className="ms-auto size-4" />}
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
                  <RiCheckLine className="ms-auto size-4" />
                )}
              </Link>
            </DrawerClose>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

/* Menü öğesi tokenları (`accent`), dokunma hedefi için daha yüksek padding. */
function drawerItemClass(active: boolean) {
  return cn(
    "flex items-center rounded-md px-2 py-2.5 text-sm transition-colors",
    active
      ? "bg-accent font-medium text-accent-foreground"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  )
}
