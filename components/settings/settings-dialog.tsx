"use client"

import * as React from "react"
import { SearchIcon, Settings2Icon } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import {
  NAV_ITEMS,
  SEARCH_ENTRIES,
  TAB_LABEL,
  normalize,
  type SearchEntry,
  type TabKey,
} from "./search-registry"
import { GeneralPanel } from "./panels/general-panel"
import { AccountPanel } from "./panels/account-panel"
import { UsagePanel } from "./panels/usage-panel"
import { PrivacyPanel } from "./panels/privacy-panel"

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

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [tab, setTab] = React.useState<TabKey>("genel")
  const [query, setQuery] = React.useState("")

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
          `[data-search-target="${target}"]`,
        )
        if (el) {
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
    [clearHighlight],
  )

  const handleSelect = React.useCallback(
    (entry: SearchEntry) => {
      setTab(entry.tab)
      setQuery("")
      if (entry.target) focusTarget(entry.target)
    },
    [focusTarget],
  )

  // Dialog kapanınca aramayı ve vurguyu sıfırla.
  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next) {
        setQuery("")
        clearHighlight()
      }
      onOpenChange(next)
    },
    [onOpenChange, clearHighlight],
  )

  // Unmount'ta bekleyen vurgu timer'ını temizle.
  React.useEffect(() => () => clearHighlight(), [clearHighlight])

  const trimmed = query.trim()
  const results = React.useMemo(() => {
    const q = normalize(trimmed)
    if (!q) return []
    return SEARCH_ENTRIES.filter(
      (e) => normalize(e.title).includes(q) || normalize(e.keywords).includes(q),
    )
  }, [trimmed])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogTitle className="sr-only">Ayarlar</DialogTitle>
        <DialogDescription className="sr-only">
          Hesap ve kullanım ayarları
        </DialogDescription>

        <div className="flex h-[min(680px,78svh)] min-h-0 min-w-0 flex-col sm:h-[min(680px,88svh)] sm:flex-row">
          {/* Gezinme — mobilde üstte yatay menü, masaüstünde solda dikey kenar */}
          <nav className="relative flex shrink-0 flex-col gap-3.5 border-b bg-muted/30 px-4 pt-4 pb-2.5 sm:w-52 sm:gap-2 sm:border-r sm:border-b-0 sm:px-3 sm:pt-3 sm:pb-3">
            {/* Mobil başlık — masaüstü dikey menüsünde gerekmez */}
            <div
              aria-hidden
              className="cn-font-heading pr-10 text-base font-medium leading-none sm:hidden"
            >
              Ayarlar
            </div>
            {/* Arama yalnızca masaüstünde gösterilir */}
            <div className="relative hidden px-0.5 pt-0.5 sm:block">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape" && query) {
                    // Aramayı temizle ama dialog'u kapatma.
                    e.preventDefault()
                    e.stopPropagation()
                    setQuery("")
                  }
                }}
                placeholder="Ayarlarda ara"
                aria-label="Ayarlarda ara"
                className="h-8 pl-8 text-sm [&::-webkit-search-cancel-button]:appearance-none"
              />
            </div>
            <div className="hidden px-2 pt-1 text-[11px] font-medium tracking-wide text-muted-foreground/70 sm:block">
              Ayarlar
            </div>
            <ul className="flex gap-1 overflow-x-auto [scrollbar-width:none] sm:flex-col sm:gap-0.5 sm:overflow-x-visible [&::-webkit-scrollbar]:hidden">
              {NAV_ITEMS.map((item) => {
                const active = tab === item.key
                const Icon = item.icon
                return (
                  <li key={item.key} className="shrink-0 sm:w-full">
                    <button
                      type="button"
                      onClick={() => setTab(item.key)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-7 w-full items-center gap-1.5 rounded-lg px-2.5 text-left text-sm font-medium transition-colors sm:h-8 sm:gap-2.5 sm:px-2",
                        active
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                      )}
                    >
                      <Icon className="hidden shrink-0 sm:block sm:size-4" />
                      <span className="truncate sm:flex-1">{item.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>

            {trimmed && (
              <div className="absolute top-12 left-1.5 z-30 w-[min(18rem,calc(100vw-4rem))] overflow-hidden rounded-xl border bg-popover shadow-lg ring-1 ring-foreground/10">
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
                          <button
                            type="button"
                            onClick={() => handleSelect(r)}
                            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent"
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
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}
          </nav>

          {/* İçerik */}
          <div
            ref={contentRef}
            className="cn-scrollbar-thin min-h-0 min-w-0 flex-1 overflow-y-auto"
          >
            <div className="px-5 pt-6 pb-8 sm:px-7 sm:pt-10">
              {tab === "genel" ? (
                <GeneralPanel />
              ) : tab === "hesap" ? (
                <AccountPanel />
              ) : tab === "gizlilik" ? (
                <PrivacyPanel />
              ) : tab === "kullanim" ? (
                <UsagePanel />
              ) : (
                <ComingSoonPanel tab={tab} />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// İşlevi henüz hazır olmayan sekmeler (Gizlilik, Abonelik) için yer tutucu.
function ComingSoonPanel({ tab }: { tab: TabKey }) {
  const item = NAV_ITEMS.find((n) => n.key === tab)
  const Icon = item?.icon ?? Settings2Icon
  const title = TAB_LABEL[tab]

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1.5">
        <h2 className="cn-font-heading text-md font-semibold">{title}</h2>
      </header>

      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </span>
        <span className="text-sm font-medium">Yakında</span>
      </div>
    </div>
  )
}
