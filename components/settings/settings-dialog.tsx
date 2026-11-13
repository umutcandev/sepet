"use client"

import * as React from "react"
import { flushSync } from "react-dom"
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "motion/react"
import { RiCloseLine, RiSearchLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { EASE_OUT_SOFT, SPRING_PILL } from "@/lib/motion"
import { cn } from "@/lib/utils"

import {
  NAV_ITEMS,
  SEARCH_ENTRIES,
  normalize,
  type SearchEntry,
  type TabKey,
} from "./search-registry"
import { GeneralPanel } from "./panels/general-panel"
import { AccountPanel } from "./panels/account-panel"
import { UsagePanel } from "./panels/usage-panel"
import { PrivacyPanel } from "./panels/privacy-panel"
import { SubscriptionPanel } from "./panels/subscription-panel"

function HighlightedLabel({ text, query }: { text: string; query: string }) {
  const q = normalize(query.trim())
  if (!q) return <>{text}</>
  const idx = normalize(text).indexOf(q)
  if (idx < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-primary/15 text-foreground">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  )
}

// Yatay sekmeler; aktif zemin layoutId ile kayar, hover yalnızca yazı rengi.
function SettingsNavList({
  tab,
  onSelect,
}: {
  tab: TabKey
  onSelect: (tab: TabKey) => void
}) {
  const activeId = React.useId()
  const reduceMotion = useReducedMotion()

  return (
    <ul className="flex min-w-0 flex-1 [scrollbar-width:none] gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden">
      {NAV_ITEMS.map((item) => {
        const isActive = tab === item.key
        return (
          <li key={item.key} className="shrink-0">
            <Button
              variant="nav"
              onClick={() => onSelect(item.key)}
              aria-current={isActive ? "page" : undefined}
              className="hover:bg-transparent aria-[current=page]:bg-transparent"
            >
              {isActive && (
                <motion.span
                  layoutId={activeId}
                  aria-hidden
                  className="absolute inset-0 z-0 rounded-[inherit] bg-accent"
                  transition={reduceMotion ? { duration: 0 } : SPRING_PILL}
                />
              )}
              <span className="relative z-10">{item.label}</span>
            </Button>
          </li>
        )
      })}
    </ul>
  )
}

export function SettingsDialog({
  open,
  onOpenChange,
  initialTab = "genel",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTab?: TabKey
}) {
  const [tab, setTab] = React.useState<TabKey>(initialTab)
  const [query, setQuery] = React.useState("")

  // Dialog her açıldığında istenen sekmeye geç (örn. menüden "Abonelik").
  // Yalnızca kapalı→açık geçişinde uygulanır; açıkken kullanıcı serbest gezer.
  const prevOpen = React.useRef(open)
  React.useEffect(() => {
    if (open && !prevOpen.current) setTab(initialTab)
    prevOpen.current = open
  }, [open, initialTab])

  const contentRef = React.useRef<HTMLDivElement>(null)
  const highlightTimer = React.useRef<number | null>(null)
  const highlighted = React.useRef<HTMLElement | null>(null)

  const clearHighlight = React.useCallback(() => {
    if (highlightTimer.current !== null) {
      window.clearTimeout(highlightTimer.current)
      highlightTimer.current = null
    }
    if (highlighted.current) {
      highlighted.current.classList.remove("settings-search-highlight")
      highlighted.current = null
    }
  }, [])

  // Hedef öğe panel yüklemesi (örn. kullanım verisi) nedeniyle henüz DOM'da
  // olmayabilir; kısa aralıklarla ~4 sn boyunca arar, bulunca ortalayıp vurgular.
  const focusTarget = React.useCallback(
    (target: string) => {
      let attempts = 0
      const run = () => {
        const el = contentRef.current?.querySelector<HTMLElement>(
          `[data-search-target="${target}"]`
        )
        // Gizli panellerdeki eşleşmeyi atla; sekme geçişi render olana kadar bekle.
        if (el && el.getClientRects().length > 0) {
          clearHighlight()
          el.scrollIntoView({ behavior: "smooth", block: "center" })
          el.classList.add("settings-search-highlight")
          highlighted.current = el
          highlightTimer.current = window.setTimeout(() => {
            el.classList.remove("settings-search-highlight")
            highlighted.current = null
            highlightTimer.current = null
          }, 2400)
          return
        }
        if (attempts++ < 40) window.setTimeout(run, 100)
      }
      run()
    },
    [clearHighlight]
  )

  const [searchOpen, setSearchOpen] = React.useState(false)
  const searchOpenRef = React.useRef(false)
  const closedWidth = React.useRef(0)
  const searchWidth = useMotionValue<number | string>(0)
  const searchRowRef = React.useRef<HTMLDivElement>(null)
  const searchButtonRef = React.useRef<HTMLButtonElement>(null)
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const dialogRef = React.useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  // Kapalı genişlik = yer tutucu "Ara"nın genişliği; animasyonsuz yazılır.
  const spacerRef = React.useCallback(
    (el: HTMLSpanElement | null) => {
      if (!el) return
      const measure = () => {
        closedWidth.current = el.offsetWidth
        if (!searchOpenRef.current) searchWidth.set(el.offsetWidth)
      }
      measure()
      const ro = new ResizeObserver(measure)
      ro.observe(el)
      return () => ro.disconnect()
    },
    [searchWidth]
  )

  const animateWidth = React.useCallback(
    (to: number, duration: number) =>
      animate(
        searchWidth,
        to,
        reduceMotion ? { duration: 0 } : { type: "spring", bounce: 0, duration }
      ),
    [searchWidth, reduceMotion]
  )

  const openSearch = React.useCallback(() => {
    searchOpenRef.current = true
    // iOS klavyeyi yalnızca dokunma anındaki senkron focus'ta açar.
    flushSync(() => setSearchOpen(true))
    searchInputRef.current?.focus()
    const rowWidth = searchRowRef.current?.offsetWidth ?? 0
    // Bitince %100'e geç: açıkken diyalog boyutu değişse de satırı doldursun.
    animateWidth(rowWidth, 0.4).then(() => {
      if (searchOpenRef.current) searchWidth.set("100%")
    })
  }, [animateWidth, searchWidth])

  const closeSearch = React.useCallback(
    (refocus: boolean) => {
      if (!searchOpenRef.current) return
      searchOpenRef.current = false
      if (typeof searchWidth.get() === "string") {
        searchWidth.set(searchRowRef.current?.offsetWidth ?? 0)
      }
      animateWidth(closedWidth.current, 0.3)
      setQuery("")
      if (!refocus) return setSearchOpen(false)
      flushSync(() => setSearchOpen(false))
      searchButtonRef.current?.focus()
    },
    [animateWidth, searchWidth]
  )

  const handleSelect = React.useCallback(
    (entry: SearchEntry) => {
      setTab(entry.tab)
      closeSearch(false)
      if (entry.target) focusTarget(entry.target)
    },
    [focusTarget, closeSearch]
  )

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next) {
        setQuery("")
        setSearchOpen(false)
        searchOpenRef.current = false
        searchWidth.set(closedWidth.current)
        clearHighlight()
      }
      onOpenChange(next)
    },
    [onOpenChange, clearHighlight, searchWidth]
  )

  // Unmount'ta bekleyen vurgu timer'ını temizle.
  React.useEffect(() => () => clearHighlight(), [clearHighlight])

  const trimmed = query.trim()
  const results = React.useMemo(() => {
    const q = normalize(trimmed)
    if (!q) return []
    return SEARCH_ENTRIES.filter(
      (e) => normalize(e.title).includes(q) || normalize(e.keywords).includes(q)
    )
  }, [trimmed])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        ref={dialogRef}
        // Açılışta odak arama butonuna değil, diyaloğun kendisine gitsin.
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          dialogRef.current?.focus()
        }}
        className="w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogDescription className="sr-only">
          Hesap ve kullanım ayarları
        </DialogDescription>

        <div className="flex h-[min(680px,78svh)] min-h-0 min-w-0 flex-col sm:h-[min(680px,88svh)]">
          <nav className="flex shrink-0 flex-col gap-1 border-b bg-muted/30 px-5 pb-2.5 sm:px-6">
            {/* h-11: kapat butonuyla (top-2, size-7) aynı eksende */}
            <div className="flex h-11 items-center pr-8">
              <DialogTitle>Ayarlar</DialogTitle>
            </div>

            <div ref={searchRowRef} className="relative flex items-center">
              {/* Kapalı aramanın yer tutucusu; sekmeler bunun yanından başlar */}
              <span
                ref={spacerRef}
                aria-hidden
                className="invisible inline-flex h-8 shrink-0 items-center gap-1.5 px-2.5 text-sm font-medium"
              >
                <RiSearchLine className="size-4" />
                Ara
              </span>
              <motion.div
                inert={searchOpen}
                className="flex min-w-0 flex-1 items-center"
                animate={{ opacity: searchOpen ? 0 : 1 }}
                transition={{ duration: reduceMotion ? 0 : 0.15 }}
              >
                <span
                  aria-hidden
                  className="mx-2 h-4 w-px shrink-0 bg-border"
                />
                <SettingsNavList tab={tab} onSelect={setTab} />
              </motion.div>

              {/* Tek yüzey: kapalıyken "Ara" butonu, açılınca genişleyip input olur */}
              <motion.div
                className={cn(
                  "absolute inset-y-0 left-0 z-20 overflow-hidden rounded-lg bg-(--surface-base) text-sm surface-raised transition-[background-color,box-shadow] duration-150 [--surface-base:var(--surface-outline)] has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 has-[:focus-visible]:[--surface-edge:var(--ring)]",
                  !searchOpen &&
                    "hover:[--surface-base:var(--surface-outline-hover)]"
                )}
                style={{ width: searchWidth }}
              >
                <RiSearchLine className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-8 -translate-y-1/2 font-medium"
                  animate={{ opacity: searchOpen ? 0 : 1 }}
                  transition={{ duration: reduceMotion ? 0 : 0.1 }}
                >
                  Ara
                </motion.span>
                {!searchOpen && (
                  <button
                    ref={searchButtonRef}
                    type="button"
                    onClick={openSearch}
                    aria-label="Ayarlarda ara"
                    className="absolute inset-0 cursor-pointer outline-none"
                  />
                )}
                <motion.div
                  inert={!searchOpen}
                  className="absolute inset-0"
                  initial={false}
                  animate={{ opacity: searchOpen ? 1 : 0 }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.15,
                    delay: searchOpen && !reduceMotion ? 0.05 : 0,
                  }}
                >
                  <input
                    ref={searchInputRef}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onBlur={() => {
                      if (!query) closeSearch(false)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && results[0]) {
                        e.preventDefault()
                        handleSelect(results[0])
                        return
                      }
                      if (e.key !== "Escape") return
                      // Önce aramayı kapat, dialog'u değil.
                      e.preventDefault()
                      e.stopPropagation()
                      if (query) setQuery("")
                      else closeSearch(true)
                    }}
                    placeholder="Ayarlarda ara"
                    aria-label="Ayarlarda ara"
                    // text-base mobilde: iOS 16px altında odakta zoom yapar.
                    className="size-full bg-transparent pr-9 pl-8 text-base outline-none placeholder:text-muted-foreground md:text-sm [&::-webkit-search-cancel-button]:appearance-none"
                  />
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => closeSearch(true)}
                    aria-label="Aramayı kapat"
                    className="absolute top-1/2 right-1.5 -translate-y-1/2"
                  >
                    <RiCloseLine />
                  </Button>
                </motion.div>
              </motion.div>

              <AnimatePresence>
                {searchOpen && trimmed && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: reduceMotion ? 0 : -4,
                      scale: reduceMotion ? 1 : 0.98,
                    }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, ease: EASE_OUT_SOFT }}
                    className="absolute top-full left-0 z-30 mt-1.5 w-full origin-top-left overflow-hidden rounded-xl bg-popover smooth-shadow-ring-lg sm:w-96"
                  >
                    {results.length === 0 ? (
                      <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                        “{trimmed}” için sonuç bulunamadı
                      </div>
                    ) : (
                      <ul className="cn-scrollbar-thin max-h-72 overflow-y-auto p-1.5">
                        {results.map((r) => {
                          const Icon = r.icon
                          return (
                            <li key={r.key}>
                              <Button
                                variant="item"
                                size="auto"
                                onClick={() => handleSelect(r)}
                              >
                                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                  <Icon className="size-4" />
                                </span>
                                <span className="flex min-w-0 flex-col">
                                  <span className="truncate text-sm">
                                    <HighlightedLabel
                                      text={r.title}
                                      query={trimmed}
                                    />
                                  </span>
                                  <span className="truncate text-xs text-muted-foreground">
                                    {r.subtitle}
                                  </span>
                                </span>
                              </Button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          {/* overscroll-contain: kaydırma alttaki sayfaya geçmesin */}
          <div
            ref={contentRef}
            className="cn-scrollbar-thin min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain"
          >
            {/* Tüm paneller açılışta mount olur: veriler hemen yüklenir, sekme geçişinde skeleton çıkmaz */}
            {(
              [
                ["genel", <GeneralPanel key="genel" />],
                ["hesap", <AccountPanel key="hesap" />],
                ["gizlilik", <PrivacyPanel key="gizlilik" />],
                ["abonelik", <SubscriptionPanel key="abonelik" />],
                [
                  "kullanim",
                  <UsagePanel key="kullanim" onUpgrade={() => setTab("abonelik")} />,
                ],
              ] as const
            ).map(([key, panel]) => (
              <div
                key={key}
                hidden={tab !== key}
                className="px-5 pt-6 pb-8 sm:px-6 sm:pt-8"
              >
                {panel}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
