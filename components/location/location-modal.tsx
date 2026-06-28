"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  ListChecksIcon,
  ListFilterIcon,
  RulerIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogBody,
} from "@/components/ui/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { MarketLogo } from "@/components/market-logo"
import { LocationMap } from "@/components/location/location-map"
import { useLocationDialog } from "@/lib/stores/location-dialog"
import { locationStore, useUserLocation } from "@/lib/stores/location"
import { saveUserLocation } from "@/lib/actions/location"
import { reverseGeocode } from "@/lib/geocode"
import { TR_PROVINCES, type Province } from "@/lib/location/tr-provinces"
import type { NearbyDepot } from "@/app/api/location/nearest/route"
import { cn } from "@/lib/utils"

// Konum bilinmeden açılırsa harita buradan başlar (İstanbul); kullanıcı geolocate
// ya da il seçimiyle hemen taşır.
const FALLBACK_CENTER = { lat: 41.0082, lng: 28.9784 }
// marketfiyati resmi sitesi yarıçapı 1–10 km arasında tutuyor; daha geniş
// değerler hem alakasız sonuç hem yavaş sorgu getiriyor.
const DISTANCE_OPTIONS = [1, 3, 5, 10]
// Yükleme iskeleti için sabit satır sayısı (tipik sonuç yoğunluğunu taklit eder).
const SKELETON_ROWS = 6

type LngLat = { lat: number; lng: number }

// Alt kısımda scroll'u yumuşatan fade — yüzey rengine (bg-popover / drawer)
// bağımlı olmasın diye gradient overlay yerine mask kullanılır.
const SCROLL_FADE =
  "[mask-image:linear-gradient(to_bottom,#000_calc(100%-1.75rem),transparent)]"

/** Yükleme sırasında market satırını taklit eden iskelet (logo + ad + şube + uzaklık). */
function DepotRowSkeleton() {
  return (
    <div className="flex items-center gap-2 py-1.5 sm:px-1">
      <Skeleton className="size-6 shrink-0 rounded-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-2.5 w-16" />
      </div>
      <Skeleton className="h-3 w-10 shrink-0" />
    </div>
  )
}

export function LocationModal() {
  const { open, closeDialog, resolveDialog } = useLocationDialog()
  // Kayıtlı konum: overlay store hydrate ise (kaydetme sonrası) onu, değilse
  // sunucu session değerini verir → header'dan tekrar açınca güncel değer gelir.
  const { location: saved } = useUserLocation()

  const [center, setCenter] = React.useState<LngLat>(FALLBACK_CENTER)
  const [label, setLabel] = React.useState<string | null>(null)
  const [distance, setDistance] = React.useState(10)
  const [depots, setDepots] = React.useState<NearbyDepot[]>([])
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [chainFilter, setChainFilter] = React.useState("all")
  const [loadingDepots, setLoadingDepots] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  // Seçim modu: kapalıyken tüm marketler dahil sayılır; açıkken kullanıcı hariç
  // tutacaklarının işaretini kaldırır (dışlama bazlı seçim). Mod değişimi
  // `selected`'ı SIFIRLAMAZ — bu set doğrudan kaydedilen yüktür.
  const [selecting, setSelecting] = React.useState(false)
  // "İl Seçin" yardımcı modalı (tarayıcı konumu çalışmazsa fallback) + araması.
  const [helpOpen, setHelpOpen] = React.useState(false)
  const [provinceQuery, setProvinceQuery] = React.useState("")

  // Pin kullanıcı tarafından oturtulduğunda (sürükle/tıkla/konum) reverse geocode
  // tetiklensin; il seçimi / açılış kendi label'ını verdiği için bayrak false kalır.
  const reverseRef = React.useRef(false)
  const initialDepotLoadRef = React.useRef(true)
  const savedDepotIdsRef = React.useRef<string[]>([])

  // ─── Açılışta state'i kayıtlı konumdan / defaultlardan kur ───
  // Harici tetikleyici (dialog store) ile senkronizasyon: dialog açılınca formu
  // sıfırlamak için kasıtlı setState — bu yüzden kural devre dışı.
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    if (!open) return
    const start = saved ? { lat: saved.lat, lng: saved.lng } : FALLBACK_CENTER
    setCenter(start)
    setDistance(saved?.distance ?? 10)
    setLabel(saved?.label ?? null)
    setSelected(new Set(saved?.depotIds ?? []))
    setChainFilter("all")
    setSelecting(false)
    setHelpOpen(false)
    setProvinceQuery("")
    reverseRef.current = false
    initialDepotLoadRef.current = true
    savedDepotIdsRef.current = saved?.depotIds ?? []

    // Kayıtlı konum yoksa tarayıcı konumunu dene (label da reverse ile dolar).
    if (!saved && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          reverseRef.current = true
          setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        () => { },
        { enableHighAccuracy: true, timeout: 8000 }
      )
    }
  }, [open, saved])
  /* eslint-enable react-hooks/set-state-in-effect */

  // ─── Pin oturunca (sürükle/tıkla/konum) adresi reverse-geocode et ───
  // Ücretsiz Nominatim; debounce + abort ile tek istek (1 req/s politikası). İl
  // seçimi / açılış kendi label'ını verdiğinden reverseRef yalnız pin hareketinde
  // true olur.
  React.useEffect(() => {
    if (!open || !reverseRef.current) return
    reverseRef.current = false
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      const lbl = await reverseGeocode(center.lat, center.lng, ctrl.signal)
      if (lbl) setLabel(lbl)
    }, 700)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [open, center.lat, center.lng])

  // ─── Merkez/mesafe değişince yakın şubeleri getir ───
  React.useEffect(() => {
    if (!open) return
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setLoadingDepots(true)
      try {
        const res = await fetch(
          `/api/location/nearest?lat=${center.lat}&lng=${center.lng}&distance=${distance}`,
          { signal: ctrl.signal }
        )
        const data = (await res.json()) as { depots?: NearbyDepot[] }
        const list = data.depots ?? []
        setDepots(list)
        const ids = list.map((d) => d.id)
        if (initialDepotLoadRef.current) {
          initialDepotLoadRef.current = false
          const saved = savedDepotIdsRef.current.filter((id) =>
            ids.includes(id)
          )
          setSelected(new Set(saved.length > 0 ? saved : ids))
        } else {
          // Yeni bölge → varsayılan hepsi dahil (dışlama bazlı: kullanıcı çıkarır).
          setSelected(new Set(ids))
        }
      } catch {
        if (!ctrl.signal.aborted) setDepots([])
      } finally {
        if (!ctrl.signal.aborted) setLoadingDepots(false)
      }
    }, 450)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [open, center.lat, center.lng, distance])

  const handleMapMove = React.useCallback((lat: number, lng: number) => {
    reverseRef.current = true
    setCenter({ lat, lng })
  }, [])

  const handlePickProvince = (p: Province) => {
    reverseRef.current = false
    setCenter({ lat: p.lat, lng: p.lng })
    setLabel(p.name)
    setHelpOpen(false)
  }

  // İl araması — Türkçe-duyarlı, aksan/kasa farkını yok sayar.
  const filteredProvinces = React.useMemo(() => {
    const q = provinceQuery.trim().toLocaleLowerCase("tr")
    if (!q) return TR_PROVINCES
    return TR_PROVINCES.filter((p) =>
      p.name.toLocaleLowerCase("tr").includes(q)
    )
  }, [provinceQuery])

  const toggleDepot = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const chains = React.useMemo(() => {
    const set = new Set<string>()
    for (const d of depots) set.add(d.market)
    return Array.from(set)
  }, [depots])

  const visibleDepots = React.useMemo(
    () =>
      chainFilter === "all"
        ? depots
        : depots.filter((d) => d.market === chainFilter),
    [depots, chainFilter]
  )

  // Koordinatı olan görünür şubeler → haritada logolu nokta.
  const depotPins = React.useMemo(
    () =>
      visibleDepots
        .filter((d) => d.lat != null && d.lng != null)
        .map((d) => ({
          id: d.id,
          market: d.market,
          lat: d.lat as number,
          lng: d.lng as number,
        })),
    [visibleDepots]
  )

  const allVisibleSelected =
    visibleDepots.length > 0 && visibleDepots.every((d) => selected.has(d.id))

  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        for (const d of visibleDepots) next.delete(d.id)
      } else {
        for (const d of visibleDepots) next.add(d.id)
      }
      return next
    })
  }

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      const depotIds = [...selected]
      const res = await saveUserLocation({
        lat: center.lat,
        lng: center.lng,
        distance,
        label,
        depotIds,
      })
      if (!res.ok) {
        toast.error("Konum kaydedilemedi, lütfen tekrar dene.")
        return
      }
      locationStore.set({
        lat: center.lat,
        lng: center.lng,
        distance,
        label,
        depotIds,
        updatedAt: new Date(),
      })
      resolveDialog()
    } catch {
      toast.error("Konum kaydedilemedi, lütfen tekrar dene.")
    } finally {
      setSaving(false)
    }
  }

  const hasDepots = visibleDepots.length > 0

  return (
    <>
      <ResponsiveDialog
        open={open}
        onOpenChange={(o) => {
          if (!o) closeDialog()
        }}
      >
        <ResponsiveDialogContent className="sm:max-w-3xl">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Konum Seçiniz</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Sepetini en iyi şekilde göstermek için konumunu belirtmen gerekiyor.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <ResponsiveDialogBody className="pt-1.5">
            {/* Harita (solda, kendi çerçevesinde) + market paneli (sağda, borderless) */}
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <div className="h-48 overflow-hidden rounded-lg border bg-muted sm:h-80">
                <LocationMap
                  center={center}
                  onMove={handleMapMove}
                  depots={depotPins}
                />
              </div>

              <div className="flex h-48 min-w-0 flex-col sm:h-80">
                {/* İkon-only araç çubuğu — sol: seçim; sağ: mesafe + market filtre */}
                <div className="flex items-center justify-between gap-1 pb-1.5 sm:px-1">
                  <div className="flex min-w-0 items-center gap-0.5">
                    <Button
                      type="button"
                      variant="outline"
                      size={selecting ? "icon-sm" : "sm"}
                      aria-label={selecting ? "Seçimi bitir" : "Toplu seç"}
                      onClick={() => setSelecting((s) => !s)}
                      disabled={!hasDepots && !selecting}
                    >
                      {selecting ? <XIcon /> : <><ListChecksIcon /> Seç</>}
                    </Button>
                    {selecting ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label={
                            allVisibleSelected ? "Seçimi kaldır" : "Tümünü seç"
                          }
                          onClick={toggleAllVisible}
                          disabled={!hasDepots}
                        >
                          <ListChecksIcon />
                        </Button>
                        <span className="truncate pl-1 text-xs font-medium text-muted-foreground tabular-nums">
                          {selected.size} seçili
                        </span>
                      </>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-0.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label="Mesafe"
                        >
                          <RulerIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-32">
                        <DropdownMenuLabel>Mesafe</DropdownMenuLabel>
                        <DropdownMenuRadioGroup
                          value={String(distance)}
                          onValueChange={(v) => setDistance(Number(v))}
                        >
                          {DISTANCE_OPTIONS.map((km) => (
                            <DropdownMenuRadioItem key={km} value={String(km)}>
                              {km} km
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label="Market filtrele"
                          disabled={chains.length === 0}
                        >
                          <ListFilterIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-48">
                        <DropdownMenuLabel>Market filtrele</DropdownMenuLabel>
                        <DropdownMenuRadioGroup
                          value={chainFilter}
                          onValueChange={setChainFilter}
                        >
                          <DropdownMenuRadioItem value="all">
                            Tüm marketler
                          </DropdownMenuRadioItem>
                          {chains.map((c) => (
                            <DropdownMenuRadioItem key={c} value={c}>
                              <MarketLogo name={c} size="sm" />
                              <span className="truncate">{c}</span>
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Liste durumları: iskelet / boş / kayıtlar (alt fade ile) */}
                {loadingDepots ? (
                  <div className="min-h-0 flex-1 overflow-hidden">
                    {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                      <DepotRowSkeleton key={i} />
                    ))}
                  </div>
                ) : !hasDepots ? (
                  <div className="flex min-h-0 flex-1 items-center justify-center p-4 text-center text-xs text-muted-foreground">
                    Bu bölgede market bulunamadı. Mesafeyi artırmayı dene.
                  </div>
                ) : (
                  <div
                    className={cn(
                      "cn-scrollbar-thin min-h-0 flex-1 overflow-y-auto pb-1",
                      SCROLL_FADE
                    )}
                  >
                    {visibleDepots.map((d) => {
                      const isSelected = selected.has(d.id)
                      // Seçim modunda işareti kalkan satır soluklaşır → "hariç
                      // tutulacak" görsel ipucu (dışlama bazlı seçim).
                      const excluded = selecting && !isSelected
                      return (
                        <div
                          key={d.id}
                          role={selecting ? "button" : undefined}
                          tabIndex={selecting ? 0 : undefined}
                          aria-pressed={selecting ? isSelected : undefined}
                          onClick={
                            selecting ? () => toggleDepot(d.id) : undefined
                          }
                          onKeyDown={
                            selecting
                              ? (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault()
                                  toggleDepot(d.id)
                                }
                              }
                              : undefined
                          }
                          className={cn(
                            "flex items-center gap-2 rounded-md py-1.5 transition-colors sm:px-1",
                            selecting && "cursor-pointer hover:bg-accent",
                            excluded && "opacity-45"
                          )}
                        >
                          <AnimatePresence initial={false}>
                            {selecting && (
                              <motion.div
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: "auto", opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                transition={{ duration: 0.15, ease: "easeInOut" }}
                                className="shrink-0 overflow-hidden"
                              >
                                <Checkbox
                                  checked={isSelected}
                                  tabIndex={-1}
                                  aria-hidden
                                  className="pointer-events-none"
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <MarketLogo name={d.market} size="sm" />
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-xs font-medium">
                              {d.market}
                            </span>
                            {d.branch ? (
                              <span className="truncate text-[11px] text-muted-foreground">
                                {d.branch}
                              </span>
                            ) : null}
                          </span>
                          {d.distance != null ? (
                            <span className="shrink-0 text-[11px] whitespace-nowrap text-muted-foreground tabular-nums">
                              {d.distance.toFixed(2)} km
                            </span>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </ResponsiveDialogBody>

          <ResponsiveDialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              onClick={handleSave}
              // Boş seçimle kaydetmeyi engelle: depots [] kaydedilirse arama
              // tarafı bunu "auto" (tüm yakın şubeler) sayıyor → "hiçbiri"
              // sessizce "hepsi"ne dönerdi.
              disabled={saving || loadingDepots || selected.size === 0}
              className="w-full"
            >
              {saving ? <Spinner className="size-4" /> : null}
              Kaydet
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setHelpOpen(true)}
              className="w-full"
            >
              Konumunu El ile Seç
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* "İl Seçin" yardımcısı — tarayıcı konumu çalışmazsa il seçimi. Ana modal
          Drawer olabildiğinden bunu sabit Dialog tutuyoruz (iç içe Drawer
          animasyon sorunlarından kaçınmak için). Liste, popover yerine doğrudan
          dialog içinde render edilir: portal'lı bir popup, dialog'un scroll
          kilidinin (react-remove-scroll) DIŞINDA kalıp kaydırılamıyordu. İl
          seçilince haritayı oraya taşıyıp (lat/lng) modalı kapatır. */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>İl Seçin</DialogTitle>
            <DialogDescription>
              Tarayıcı konumun çalışmıyorsa ilini seç; haritayı oraya taşıyalım,
              sonra pini mahallene sürükleyebilirsin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                inputMode="search"
                value={provinceQuery}
                onChange={(e) => setProvinceQuery(e.target.value)}
                placeholder="İl ara…"
                aria-label="İl ara"
                autoFocus
                className="h-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
              />
            </div>
            <div className="max-h-64 overflow-y-auto overscroll-contain rounded-lg border p-1">
              {filteredProvinces.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  İl bulunamadı
                </p>
              ) : (
                filteredProvinces.map((p) => (
                  <button
                    key={p.plate}
                    type="button"
                    onClick={() => handlePickProvince(p)}
                    className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    {p.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
