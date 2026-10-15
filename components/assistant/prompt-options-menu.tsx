"use client"

import * as React from "react"
import {
  AnimatePresence,
  animate,
  motion,
  useIsPresent,
  useMotionValue,
  useReducedMotion,
} from "motion/react"
import {
  RiAddLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiArrowRightUpLine,
  RiAttachment2,
  RiCheckLine,
  RiFocus3Line,
  RiMapPin2Line,
  RiRefreshLine,
  RiSearchLine,
} from "@remixicon/react"

import {
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuItem,
  PromptInputActionMenuTrigger,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input"
import {
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { AvatarGroup } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/sonner"
import { MarketLogo, MarketLogoGroup } from "@/components/market-logo"
import { useCurrentUser } from "@/components/providers/session-provider"
import { saveUserLocation } from "@/lib/actions/location"
import type { UserLocation } from "@/lib/auth/session"
import { reverseGeocode } from "@/lib/geocode"
import {
  carrySelection,
  chainCounts,
  effectiveSelection,
  isEverySelected,
  toggleChain,
} from "@/lib/location/market-selection"
import {
  DEFAULT_DISTANCE,
  DISTANCE_OPTIONS,
  fetchNearbyDepots,
  useNearbyDepots,
} from "@/lib/location/nearby-depots"
import { TR_PROVINCES } from "@/lib/location/tr-provinces"
import { MARKETS } from "@/lib/markets/registry"
import { EASE_OUT_EXPO } from "@/lib/motion"
import { locationStore, useUserLocation } from "@/lib/stores/location"
import { locationDialog } from "@/lib/stores/location-dialog"
import { loginDialog } from "@/lib/stores/login-dialog"
import { cn } from "@/lib/utils"

type Page = "root" | "location" | "markets" | "distance"

type Nearby = ReturnType<typeof useNearbyDepots>

type Commit = (next: UserLocation, opts?: { immediate?: boolean }) => void

// Sayfalar arası geçiş: ileri giderken yeni sayfa sağdan gelir, eskisi sola
// kayar (geri dönüşte tersi). Hareket azaltılmışsa yalnız solma kalır.
const SLIDE = {
  enter: (dir: number) => ({ x: dir >= 0 ? "100%" : "-100%" }),
  center: { x: "0%" },
  exit: (dir: number) => ({ x: dir >= 0 ? "-100%" : "100%" }),
}
const FADE = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
}
// Kayma ile kutunun boy değişimi aynı eğride, birlikte biter.
const TRANSITION = { duration: 0.34, ease: EASE_OUT_EXPO }

// Sayfalar içerikleri kadar uzar, bu sınırı aşan sayfa kendi içinde kayar.
// Ekranda o kadar yer yoksa Radix'in ölçtüğü boş alan sınır olur.
const PAGE_MAX_H =
  "max-h-[min(17rem,var(--radix-dropdown-menu-content-available-height,17rem))]"
// İl listesi aramayla daralıp genişlerken kutu zıplamasın: sabit boy.
const PAGE_FIXED_H =
  "h-[min(17rem,var(--radix-dropdown-menu-content-available-height,17rem))]"

// İl listesinin kayma sırasında çizilen kısmı; geri kalanı geçiş bitince gelir.
const FIRST_PROVINCES = 8

// Market seçimi art arda birkaç tıkla yapılıyor; her tık ayrı yazım olmasın.
// Menü kapanınca bekleyen yazım beklemeden gönderilir.
const SAVE_DEBOUNCE_MS = 500

const SAVE_ERROR = "Tercihin kaydedilemedi, lütfen tekrar dene."
const NEARBY_ERROR = "Yakındaki marketler alınamadı, lütfen tekrar dene."

/**
 * Prompt'un "+" menüsü: en üstte fiş görseli yükleme, altında konum, market
 * ve mesafe tercihleri. Alt başlıklar yan menü açmak yerine aynı kutunun içinde
 * ikinci bir sayfaya kayar; kutu her sayfanın boyuna yumuşakça uzar/kısalır.
 *
 * Tercihler Ayarlar › Konum'un yazdığı alanlara (konum, yarıçap, şubeler)
 * yazılır: sunucu her aramada konumu veritabanından okuduğu için değişiklik
 * hemen kalıcı yazılır, arayüz ise iyimser güncellenir.
 */
export function PromptOptionsMenu() {
  const att = usePromptInputAttachments()
  const [open, setOpen] = React.useState(false)
  const saver = useLocationSaver()

  return (
    <PromptInputActionMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) saver.flush()
      }}
    >
      <PromptInputActionMenuTrigger
        aria-label="Ekler ve tercihler"
        className="rounded-full"
      >
        <RiAddLine aria-hidden="true" className="size-4" />
      </PromptInputActionMenuTrigger>
      <PromptInputActionMenuContent className="w-64 overflow-hidden p-0">
        <OptionsPanel
          onUpload={() => att.openFileDialog()}
          onCommit={saver.commit}
        />
      </PromptInputActionMenuContent>
    </PromptInputActionMenu>
  )
}

/**
 * İyimser kaydetme: store hemen güncellenir, sunucu yazımı debounce'lanır.
 * Yazım başarısız olursa son doğrulanmış değere (ilk değişiklikten önceki ya
 * da en son başarıyla yazılan) geri dönülür. Art arda yazımlarda yalnız en son
 * yazımın sonucu geri almaya karar verir.
 */
function useLocationSaver() {
  const { location } = useUserLocation()
  const latest = React.useRef(location)
  React.useEffect(() => {
    latest.current = location
  }, [location])

  const baseline = React.useRef<UserLocation | null | undefined>(undefined)
  const queued = React.useRef<UserLocation | null>(null)
  const inflight = React.useRef(0)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = React.useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    const next = queued.current
    if (!next) return
    queued.current = null
    inflight.current += 1
    const { lat, lng, distance, label, depotIds } = next
    saveUserLocation({ lat, lng, distance, label, depotIds })
      .then(
        (res) => res.ok,
        () => false
      )
      .then((ok) => {
        inflight.current -= 1
        const settled = inflight.current === 0 && !queued.current
        if (ok) {
          baseline.current = settled ? undefined : next
          return
        }
        if (!settled) return
        locationStore.set(baseline.current ?? null)
        baseline.current = undefined
        toast.error(SAVE_ERROR)
      })
  }, [])

  const commit = React.useCallback<Commit>(
    (next, opts) => {
      if (baseline.current === undefined) baseline.current = latest.current
      locationStore.set(next)
      queued.current = next
      if (timer.current) clearTimeout(timer.current)
      if (opts?.immediate) flush()
      else timer.current = setTimeout(flush, SAVE_DEBOUNCE_MS)
    },
    [flush]
  )

  React.useEffect(() => flush, [flush])

  return { commit, flush }
}

function OptionsPanel({
  onUpload,
  onCommit,
}: {
  onUpload: () => void
  onCommit: Commit
}) {
  const reduceMotion = useReducedMotion()
  // [sayfa, yön, geldiği sayfa]. Yön 0 = menü yeni açıldı (animasyon/odak yok).
  const [[page, direction, from], setNav] = React.useState<
    [Page, number, Page | null]
  >(["root", 0, null])
  // Sayfa değişimi klavyeyle mi yapıldı: öyleyse odak yeni sayfanın ilk
  // öğesine taşınır, fareyle yapıldıysa (Radix'in açılıştaki davranışı gibi)
  // menü kutusuna.
  const viaKeyboard = React.useRef(false)
  const go = React.useCallback(
    (next: Page) =>
      setNav(([current]) => [next, next === "root" ? -1 : 1, current]),
    []
  )

  // Sayfalar üst üste (absolute) durduğundan kutunun boyu etkin sayfanın
  // ölçülen boyundan gelir. İlk ölçü doğrudan yazılır (açılışta büyüme
  // animasyonu olmasın ve Radix menüyü ilk konumlarken doğru boyu görsün);
  // sonrakiler kaymayla birlikte canlandırılır.
  const boxRef = React.useRef<HTMLDivElement>(null)
  const height = useMotionValue(0)
  const sized = React.useRef(false)
  const onHeight = React.useCallback(
    (next: number) => {
      if (!sized.current || reduceMotion) {
        sized.current = true
        height.jump(next)
        if (boxRef.current) boxRef.current.style.height = `${next}px`
        return
      }
      animate(height, next, TRANSITION)
    },
    [height, reduceMotion]
  )

  const { isAuthenticated, loading, displayUser } = useCurrentUser()
  // useRequireAuth ile aynı ölçü: oturumlu kullanıcı /api/me çözülmeden
  // tıklarsa giriş penceresiyle karşılaşmasın.
  const authed = isAuthenticated || (loading && displayUser !== null)
  const { location } = useUserLocation()
  const nearby = useNearbyDepots(
    authed && location ? location.lat : null,
    authed && location ? location.lng : null,
    authed && location ? location.distance : null
  )
  const selected = React.useMemo(
    () =>
      nearby.depots && location
        ? effectiveSelection(nearby.depots, location.depotIds)
        : null,
    [nearby.depots, location]
  )

  const state: PanelState = {
    authed,
    location,
    nearby,
    selected,
    go,
    onCommit,
  }

  return (
    <motion.div
      ref={boxRef}
      style={{ height }}
      className="relative overflow-hidden"
      onKeyDownCapture={() => (viaKeyboard.current = true)}
      onPointerDownCapture={() => (viaKeyboard.current = false)}
    >
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={page}
          custom={direction}
          variants={reduceMotion ? FADE : SLIDE}
          initial="enter"
          animate="center"
          exit="exit"
          transition={TRANSITION}
          className="absolute inset-x-0 top-0"
        >
          <PageFrame
            fixed={page === "location"}
            focusOnMount={direction !== 0}
            viaKeyboard={viaKeyboard}
            from={page === "root" ? from : null}
            onBack={page === "root" ? undefined : () => go("root")}
            onHeight={onHeight}
          >
            {page === "root" ? (
              <RootPage {...state} onUpload={onUpload} />
            ) : page === "location" ? (
              <LocationPage {...state} />
            ) : page === "markets" ? (
              <MarketsPage {...state} />
            ) : (
              <DistancePage {...state} />
            )}
          </PageFrame>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

type PanelState = {
  authed: boolean
  location: UserLocation | null
  nearby: Nearby
  selected: Set<string> | null
  go: (page: Page) => void
  onCommit: Commit
}

/**
 * Sayfa kabı: boyunu ölçüp kutuya bildirir, yeni sayfaya geçilince odağı
 * taşır ve alt sayfalarda ← ile geri götürür (yan menülerdeki ok davranışı).
 */
function PageFrame({
  fixed,
  focusOnMount,
  viaKeyboard,
  from,
  onBack,
  onHeight,
  children,
}: {
  fixed: boolean
  focusOnMount: boolean
  viaKeyboard: React.RefObject<boolean>
  from: Page | null
  onBack?: () => void
  onHeight: (height: number) => void
  children: React.ReactNode
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  // Çıkış animasyonundaki sayfa artık kutunun boyunu belirlemez.
  const isPresent = useIsPresent()

  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el || !isPresent) return
    onHeight(el.offsetHeight)
    const observer = new ResizeObserver(() => onHeight(el.offsetHeight))
    observer.observe(el)
    return () => observer.disconnect()
  }, [isPresent, onHeight])

  React.useEffect(() => {
    if (!focusOnMount) return
    const el = ref.current
    if (!el) return
    const target = viaKeyboard.current
      ? el.querySelector<HTMLElement>(
          from
            ? `[data-nav="${from}"]`
            : '[data-page-body] [role^="menuitem"]:not([data-disabled])'
        )
      : null
    const menu = el.closest<HTMLElement>('[role="menu"]')
    ;(target ?? menu)?.focus({ preventScroll: true })
  }, [focusOnMount, viaKeyboard, from])

  return (
    <div
      ref={ref}
      className={cn("flex flex-col", fixed ? PAGE_FIXED_H : PAGE_MAX_H)}
      onKeyDown={(e) => {
        if (!onBack || e.key !== "ArrowLeft") return
        if (e.target instanceof HTMLInputElement) return
        e.preventDefault()
        onBack()
      }}
    >
      {children}
    </div>
  )
}

// ─── Ana sayfa ───

function RootPage({
  authed,
  location,
  nearby,
  selected,
  go,
  onUpload,
}: PanelState & { onUpload: () => void }) {
  const open = (page: Page) => (e: Event) => {
    // Misafirde tercih kaydedilemez: menü kapansın, giriş penceresi açılsın.
    if (!authed) {
      loginDialog.open()
      return
    }
    e.preventDefault()
    go(page)
  }

  const chains = React.useMemo(() => {
    if (!nearby.depots || !selected) return null
    const out: string[] = []
    for (const [market, c] of chainCounts(nearby.depots, selected)) {
      if (c.selected > 0) out.push(market)
    }
    return out
  }, [nearby.depots, selected])

  return (
    <>
      <PageBody>
        <PromptInputActionMenuItem onSelect={onUpload}>
          Fiş görseli yükle
          <RiAttachment2 />
        </PromptInputActionMenuItem>
        <DropdownMenuSeparator />
        <NavItem
          nav="location"
          label="Konum seç"
          onSelect={open("location")}
          onOpen={() => authed && go("location")}
        >
          <span className="truncate">
            {!authed || !location ? "Seçilmedi" : location.label || "Haritadan"}
          </span>
        </NavItem>
        <NavItem
          nav="markets"
          label="Market seç"
          onSelect={open("markets")}
          onOpen={() => authed && go("markets")}
        >
          {!authed || !location ? (
            <span>Tümü</span>
          ) : chains ? (
            <MarketLogoGroup names={chains} size="xs" max={3} />
          ) : nearby.error ? (
            <span>—</span>
          ) : (
            <LogoGroupSkeleton />
          )}
        </NavItem>
        <NavItem
          nav="distance"
          label="Mesafe seç"
          onSelect={open("distance")}
          onOpen={() => authed && go("distance")}
        >
          <span className="tabular-nums">
            {!authed || !location ? "—" : `${location.distance} km`}
          </span>
        </NavItem>
      </PageBody>
      <PageFooter>
        {!authed ? (
          "Konum ve market tercihlerin için giriş yap."
        ) : !location ? (
          "Yakınındaki fiyatlar için konumunu seç."
        ) : (
          <>
            Fiyatlar {location.distance} km içindeki{" "}
            {selected ? (
              <span className="text-foreground/80 tabular-nums">
                {selected.size} şubeden
              </span>
            ) : (
              "şubelerden"
            )}{" "}
            alınır.
          </>
        )}
      </PageFooter>
    </>
  )
}

function NavItem({
  nav,
  label,
  onSelect,
  onOpen,
  children,
}: {
  nav: Page
  label: string
  onSelect: (e: Event) => void
  onOpen: () => void
  children: React.ReactNode
}) {
  return (
    <DropdownMenuItem
      data-nav={nav}
      onSelect={onSelect}
      onKeyDown={(e) => {
        if (e.key !== "ArrowRight") return
        e.preventDefault()
        onOpen()
      }}
    >
      <span className="shrink-0">{label}</span>
      <span className="ms-auto flex min-w-0 items-center gap-1 ps-3 text-muted-foreground">
        {children}
        <RiArrowRightSLine className="cn-rtl-flip -me-0.5 shrink-0" />
      </span>
    </DropdownMenuItem>
  )
}

function LogoGroupSkeleton() {
  // Logo grubuyla aynı bindirme ve oyuk; xs boyutu burada data-size ile
  // gelmediği için bindirme elle verilir.
  return (
    <AvatarGroup className="[--avatar-overlap:0.375rem]">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="size-5 rounded-full" />
      ))}
    </AvatarGroup>
  )
}

// ─── Sayfa iskeleti ───

function PageHeader({
  title,
  onBack,
  aside,
}: {
  title: string
  onBack: () => void
  aside?: React.ReactNode
}) {
  return (
    <div className="shrink-0 border-b border-foreground/5 p-1">
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault()
          onBack()
        }}
        className="gap-1 ps-1 font-medium"
      >
        {/* Sarmalayıcı şart: menü öğesi doğrudan çocuk svg'leri sağa yaslar. */}
        <span className="flex">
          <RiArrowLeftSLine className="cn-rtl-flip" />
        </span>
        <span className="truncate">{title}</span>
        {aside ? (
          <span className="ms-auto flex min-w-0 items-center gap-1 ps-3 text-xs font-normal text-muted-foreground">
            {aside}
          </span>
        ) : null}
      </DropdownMenuItem>
    </div>
  )
}

function PageBody({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      data-page-body
      className={cn(
        "cn-scrollbar-thin min-h-0 flex-auto overflow-y-auto overscroll-contain p-1",
        className
      )}
    >
      {children}
    </div>
  )
}

/** Sayfanın altındaki açıklama şeridi (ana sayfa özeti, mesafe notu). */
function PageFooter({ children }: { children: React.ReactNode }) {
  return (
    <p className="shrink-0 border-t border-foreground/5 px-2.5 py-2 text-xs/relaxed text-pretty text-muted-foreground">
      {children}
    </p>
  )
}

function PageNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-1.5 py-1 text-xs/relaxed text-pretty text-muted-foreground">
      {children}
    </p>
  )
}

/** Market/mesafe sayfaları konumsuz anlamsız: önce konuma yönlendir. */
function NeedLocation({ go }: { go: (page: Page) => void }) {
  return (
    <>
      <PageNote>Marketler ve mesafe konumuna göre listelenir.</PageNote>
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault()
          go("location")
        }}
      >
        Konum seç
        <RiMapPin2Line />
      </DropdownMenuItem>
    </>
  )
}

function NearbyError({ retry }: { retry: () => void }) {
  return (
    <>
      <PageNote>Yakındaki marketler alınamadı.</PageNote>
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault()
          retry()
        }}
      >
        Tekrar dene
        <RiRefreshLine />
      </DropdownMenuItem>
    </>
  )
}

function RowSkeleton({ rows }: { rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex h-7 items-center gap-1.5 px-1.5">
          <Skeleton className="size-5 shrink-0 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </>
  )
}

// ─── Konum ───

/**
 * Konum için hızlı yol: tarayıcı konumu ya da il merkezi. Pin'i mahalleye
 * oturtmak, tek tek şube seçmek gibi ince ayarlar Ayarlar › Konum'daki harita
 * modalında kalır; en altta oraya kısa bir geçiş var.
 */
function LocationPage({
  location,
  nearby,
  selected,
  go,
  onCommit,
}: PanelState) {
  const [query, setQuery] = React.useState("")
  // Hangi satır çalışıyor: "gps" ya da il adı. Çalışırken diğerleri pasif.
  const [busy, setBusy] = React.useState<string | null>(null)
  const listRef = React.useRef<HTMLDivElement>(null)

  // 81 satırın hepsi DOM'da kalır: klavyeyle gezinme, harfle atlama ve ekran
  // okuyucu tüm listeyi görmeli (sanal liste bunları bozar). Maliyet şöyle
  // düşürülür: kayma sırasında yalnız görünen ilk satırlar çizilir, kalanı
  // geçiş bitince düşük öncelikle eklenir; ekran dışı satırların düzen/boyama
  // işi `content-visibility` ile atlanır; arama süzmesi yazmayı bekletmez.
  const [complete, setComplete] = React.useState(false)
  React.useEffect(() => {
    const t = setTimeout(
      () => React.startTransition(() => setComplete(true)),
      TRANSITION.duration * 1000
    )
    return () => clearTimeout(t)
  }, [])
  const deferredQuery = React.useDeferredValue(query)
  const provinces = React.useMemo(() => {
    const q = deferredQuery.trim().toLocaleLowerCase("tr")
    if (!q) return TR_PROVINCES
    return TR_PROVINCES.filter((p) =>
      p.name.toLocaleLowerCase("tr").includes(q)
    )
  }, [deferredQuery])
  const shown =
    complete || deferredQuery ? provinces : provinces.slice(0, FIRST_PROVINCES)

  const place = async (
    key: string,
    lat: number,
    lng: number,
    label: string | null
  ) => {
    setBusy(key)
    try {
      let distance = location?.distance ?? DEFAULT_DISTANCE
      let depots = await fetchNearbyDepots(lat, lng, distance)
      // İl merkezinde dar yarıçap boş kalabiliyor; en genişini bir kez dene.
      const maxDistance = DISTANCE_OPTIONS[DISTANCE_OPTIONS.length - 1]
      if (depots.length === 0 && distance < maxDistance) {
        depots = await fetchNearbyDepots(lat, lng, maxDistance)
        if (depots.length > 0) {
          distance = maxDistance
          toast.message(
            `Yakında market bulunamadı, mesafe ${maxDistance} km yapıldı.`
          )
        }
      }
      if (depots.length === 0) {
        toast.error("Bu konumun yakınında market bulunamadı.")
        return
      }
      const carried = carrySelection(
        { depots: nearby.depots ?? [], selected: selected ?? new Set() },
        depots,
        false
      )
      if (carried.fellBack) {
        toast.message(
          "Seçtiğin marketlerin bu bölgede şubesi yok, tüm marketler seçildi."
        )
      }
      onCommit(
        {
          lat,
          lng,
          distance,
          label,
          depotIds: carried.ids,
          updatedAt: new Date(),
        },
        { immediate: true }
      )
      go("root")
    } catch {
      toast.error(NEARBY_ERROR)
    } finally {
      setBusy(null)
    }
  }

  const locate = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Tarayıcın konum paylaşımını desteklemiyor, ilini seç.")
      return
    }
    setBusy("gps")
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        const label = await reverseGeocode(latitude, longitude)
        await place("gps", latitude, longitude, label)
      },
      () => {
        setBusy(null)
        toast.error(
          "Konumun alınamadı. Tarayıcı iznini kontrol et ya da ilini seç."
        )
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  return (
    <>
      <PageHeader
        title="Konum seç"
        onBack={() => go("root")}
        aside={
          location?.label ? (
            <>
              <RiMapPin2Line className="size-3.5 shrink-0" />
              <span className="truncate">{location.label}</span>
            </>
          ) : null
        }
      />
      <div className="shrink-0 p-1 pb-0">
        <DropdownMenuItem
          disabled={busy !== null && busy !== "gps"}
          onSelect={(e) => {
            e.preventDefault()
            if (!busy) locate()
          }}
        >
          Mevcut konumumu kullan
          {busy === "gps" ? <Spinner /> : <RiFocus3Line />}
        </DropdownMenuItem>
        <div className="relative mt-1">
          <RiSearchLine className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            inputMode="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            // Menü yazarak öğe aramayı (typeahead) yakalıyor; harfler kutuda
            // kalsın. ↓ listeye iner, Esc menüyü kapatmaya devam eder.
            onKeyDown={(e) => {
              if (e.key === "Escape" || e.key === "Tab") return
              e.stopPropagation()
              if (e.key === "ArrowDown") {
                e.preventDefault()
                listRef.current
                  ?.querySelector<HTMLElement>(
                    '[role="menuitem"]:not([data-disabled])'
                  )
                  ?.focus()
              }
            }}
            placeholder="İl ara…"
            aria-label="İl ara"
            className="h-7 ps-7 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>
      </div>
      <PageBody>
        <div ref={listRef}>
          {shown.length === 0 ? (
            <PageNote>İl bulunamadı.</PageNote>
          ) : (
            shown.map((p) => (
              <DropdownMenuItem
                key={p.plate}
                textValue={p.name}
                disabled={busy !== null && busy !== p.name}
                onSelect={(e) => {
                  e.preventDefault()
                  if (!busy) void place(p.name, p.lat, p.lng, p.name)
                }}
                className="[contain-intrinsic-size:auto_1.75rem] [content-visibility:auto]"
              >
                {p.name}
                {busy === p.name ? (
                  <Spinner />
                ) : location?.label === p.name ? (
                  <RiCheckLine />
                ) : null}
              </DropdownMenuItem>
            ))
          )}
        </div>
      </PageBody>
      <div className="shrink-0 border-t border-foreground/5 p-1">
        <DropdownMenuItem
          onSelect={() => locationDialog.open()}
          className="text-xs text-muted-foreground"
        >
          <span className="truncate">
            Haritada inceleyin:{" "}
            <span className="text-foreground/80">Ayarlar › Konum</span>
          </span>
          <RiArrowRightUpLine className="size-3.5" />
        </DropdownMenuItem>
      </div>
    </>
  )
}

// ─── Marketler ───

function MarketsPage({ location, nearby, selected, go, onCommit }: PanelState) {
  const depots = nearby.depots
  const counts = React.useMemo(
    () => (depots && selected ? chainCounts(depots, selected) : null),
    [depots, selected]
  )

  // Desteklenen tüm marketler sabit sırayla; menzilde olup registry'de
  // bulunmayan (beklenmedik) bir ad varsa sona eklenir.
  const names = React.useMemo(() => {
    const out = MARKETS.map((m) => m.name)
    for (const name of counts?.keys() ?? []) {
      if (!out.includes(name)) out.push(name)
    }
    return out
  }, [counts])

  const apply = (ids: Set<string> | null) => {
    if (!location) return
    if (!ids) {
      toast.message("En az bir market seçili kalmalı.")
      return
    }
    onCommit({ ...location, depotIds: [...ids], updatedAt: new Date() })
  }

  let selectedChains = 0
  let availableChains = 0
  for (const c of counts?.values() ?? []) {
    availableChains += 1
    if (c.selected > 0) selectedChains += 1
  }

  return (
    <>
      <PageHeader
        title="Market seç"
        onBack={() => go("root")}
        aside={
          counts ? (
            <span className="tabular-nums">
              {selectedChains}/{availableChains} seçili
            </span>
          ) : null
        }
      />
      <PageBody>
        {!location ? (
          <NeedLocation go={go} />
        ) : nearby.error ? (
          <NearbyError retry={nearby.retry} />
        ) : !depots || !selected || !counts ? (
          <RowSkeleton rows={MARKETS.length + 1} />
        ) : depots.length === 0 ? (
          <PageNote>
            Bu mesafede market bulunamadı. Mesafeyi artırmayı dene.
          </PageNote>
        ) : (
          <>
            <DropdownMenuCheckboxItem
              checked={isEverySelected(depots, selected)}
              onSelect={(e) => {
                e.preventDefault()
                if (!isEverySelected(depots, selected)) {
                  apply(new Set(depots.map((d) => d.id)))
                }
              }}
            >
              Tüm marketler
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            {names.map((name) => {
              const c = counts.get(name)
              return (
                <MarketRow
                  key={name}
                  name={name}
                  available={(c?.total ?? 0) > 0}
                  checked={(c?.selected ?? 0) > 0}
                  onToggle={() => apply(toggleChain(depots, selected, name))}
                />
              )
            })}
          </>
        )}
      </PageBody>
    </>
  )
}

function MarketRow({
  name,
  available,
  checked,
  onToggle,
}: {
  name: string
  available: boolean
  checked: boolean
  onToggle: () => void
}) {
  return (
    <DropdownMenuCheckboxItem
      checked={checked}
      disabled={!available}
      onSelect={(e) => {
        e.preventDefault()
        onToggle()
      }}
      // Pasif satır tıklanmaz ama üzerine gelinince nedenini göstermeli;
      // menünün varsayılanı pasif satırda fare olaylarını tümden kapatıyor.
      className="group/market data-disabled:pointer-events-auto"
    >
      <MarketLogo name={name} size="xs" />
      <span className="truncate">{name}</span>
      {!available ? (
        // -me-6: tik işaretine ayrılan sağ boşluğa uzanır, metin işaretlerle
        // aynı hizada biter.
        <span className="ms-auto -me-6 ps-2 text-xs text-muted-foreground opacity-0 transition-opacity group-hover/market:opacity-100">
          Bulunamadı
        </span>
      ) : null}
    </DropdownMenuCheckboxItem>
  )
}

// ─── Mesafe ───

function DistancePage({
  location,
  nearby,
  selected,
  go,
  onCommit,
}: PanelState) {
  const [busy, setBusy] = React.useState<number | null>(null)

  const pick = async (km: number) => {
    if (!location || busy) return
    if (km === location.distance) {
      go("root")
      return
    }
    setBusy(km)
    try {
      const depots = await fetchNearbyDepots(location.lat, location.lng, km)
      if (depots.length === 0) {
        toast.error(`${km} km içinde market bulunamadı.`)
        return
      }
      const carried = carrySelection(
        { depots: nearby.depots ?? [], selected: selected ?? new Set() },
        depots,
        true
      )
      if (carried.fellBack) {
        toast.message(
          "Seçtiğin marketlerin bu mesafede şubesi yok, tüm marketler seçildi."
        )
      }
      onCommit(
        {
          ...location,
          distance: km,
          depotIds: carried.ids,
          updatedAt: new Date(),
        },
        { immediate: true }
      )
      go("root")
    } catch {
      toast.error(NEARBY_ERROR)
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <PageHeader title="Mesafe seç" onBack={() => go("root")} />
      <PageBody>
        {!location ? (
          <NeedLocation go={go} />
        ) : (
          <DropdownMenuRadioGroup value={String(location.distance)}>
            {DISTANCE_OPTIONS.map((km) => (
              <DropdownMenuRadioItem
                key={km}
                value={String(km)}
                disabled={busy !== null && busy !== km}
                onSelect={(e) => {
                  e.preventDefault()
                  void pick(km)
                }}
              >
                <span className="tabular-nums">{km} km</span>
                {busy === km ? <Spinner className="ms-auto size-3.5" /> : null}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        )}
      </PageBody>
      {location ? (
        <PageFooter>
          Yarıçap büyüdükçe daha çok şube karşılaştırılır; seçtiğin marketler
          korunur.
        </PageFooter>
      ) : null}
    </>
  )
}
