"use client"

import * as React from "react"
import { MapPinIcon, SearchIcon } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Spinner } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MarketLogo } from "@/components/market-logo"
import { LocationMap } from "@/components/location/location-map"
import { useLocationDialog } from "@/lib/stores/location-dialog"
import { locationStore, useUserLocation } from "@/lib/stores/location"
import { saveUserLocation } from "@/lib/actions/location"
import {
  forwardGeocode,
  reverseGeocode,
  MAPTILER_KEY,
  type GeoFeature,
} from "@/lib/maptiler"
import type { NearbyDepot } from "@/app/api/location/nearest/route"
import { cn } from "@/lib/utils"

// Konum bilinmeden açılırsa harita buradan başlar (İstanbul); kullanıcı geolocate
// ya da arama ile hemen taşır.
const FALLBACK_CENTER = { lat: 41.0082, lng: 28.9784 }
// marketfiyati resmi sitesi yarıçapı 1–10 km arasında tutuyor; daha geniş
// değerler hem alakasız sonuç hem yavaş sorgu getiriyor.
const DISTANCE_OPTIONS = [1, 3, 5, 10]

type LngLat = { lat: number; lng: number }

export function LocationModal() {
  const { open, closeDialog, resolveDialog } = useLocationDialog()
  // Kayıtlı konum: overlay store hydrate ise (kaydetme sonrası) onu, değilse
  // sunucu session değerini verir → header'dan tekrar açınca güncel değer gelir.
  const { location: saved } = useUserLocation()

  const [center, setCenter] = React.useState<LngLat>(FALLBACK_CENTER)
  const [address, setAddress] = React.useState("")
  const [label, setLabel] = React.useState<string | null>(null)
  const [suggestions, setSuggestions] = React.useState<GeoFeature[]>([])
  const [showSuggestions, setShowSuggestions] = React.useState(false)
  const [distance, setDistance] = React.useState(10)
  const [depots, setDepots] = React.useState<NearbyDepot[]>([])
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [chainFilter, setChainFilter] = React.useState("all")
  const [loadingDepots, setLoadingDepots] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  // Reverse geocode'u atlamak için (authoritative label varken): ilk açılışta
  // kayıtlı adres ya da arama sonucu seçilince.
  const skipReverseRef = React.useRef(false)
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
    setAddress(saved?.label ?? "")
    setSelected(new Set(saved?.depotIds ?? []))
    setChainFilter("all")
    setSuggestions([])
    setShowSuggestions(false)
    initialDepotLoadRef.current = true
    savedDepotIdsRef.current = saved?.depotIds ?? []
    skipReverseRef.current = Boolean(saved?.label)

    // Kayıtlı konum yoksa tarayıcı konumunu dene.
    if (!saved && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      )
    }
  }, [open, saved])
  /* eslint-enable react-hooks/set-state-in-effect */

  // ─── Merkez değişince adresi reverse-geocode et ───
  React.useEffect(() => {
    if (!open) return
    if (skipReverseRef.current) {
      skipReverseRef.current = false
      return
    }
    const t = setTimeout(async () => {
      const lbl = await reverseGeocode(center.lng, center.lat)
      if (lbl) {
        setLabel(lbl)
        setAddress(lbl)
      }
    }, 350)
    return () => clearTimeout(t)
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
          // Yeni bölge → varsayılan hepsi seçili.
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

  // ─── Adres yazınca öneri getir ───
  React.useEffect(() => {
    if (!open) return
    const t = setTimeout(async () => {
      const q = address.trim()
      if (q.length < 3 || q === label) {
        setSuggestions([])
        return
      }
      setSuggestions(await forwardGeocode(q))
    }, 300)
    return () => clearTimeout(t)
  }, [open, address, label])

  const handleMapMove = React.useCallback((lat: number, lng: number) => {
    setCenter({ lat, lng })
    setShowSuggestions(false)
  }, [])

  const handlePickSuggestion = (f: GeoFeature) => {
    skipReverseRef.current = true
    setCenter({ lat: f.lat, lng: f.lng })
    setLabel(f.label)
    setAddress(f.label)
    setSuggestions([])
    setShowSuggestions(false)
  }

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

  return (
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

        <ResponsiveDialogBody className="max-h-[62vh] overflow-y-auto pt-1.5">
          {/* Satır 1: adres + mesafe */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={address}
                placeholder="Adres ara (mahalle, cadde, şehir)"
                className="pl-8"
                onChange={(e) => {
                  setAddress(e.target.value)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
              />
              {showSuggestions && suggestions.length > 0 ? (
                <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border bg-popover p-1 shadow-md">
                  {suggestions.map((f) => (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => handlePickSuggestion(f)}
                        className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                      >
                        <MapPinIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                        <span className="line-clamp-2">{f.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <Select
              value={String(distance)}
              onValueChange={(v) => setDistance(Number(v))}
            >
              <SelectTrigger className="w-24 shrink-0 sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {DISTANCE_OPTIONS.map((km) => (
                  <SelectItem key={km} value={String(km)}>
                    {km} km
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Satır 2: harita + market listesi */}
          <div className="grid gap-2 sm:grid-cols-[1.6fr_1fr]">
            <div className="h-48 overflow-hidden rounded-lg border bg-muted sm:h-80">
              {MAPTILER_KEY ? (
                <LocationMap
                  center={center}
                  onMove={handleMapMove}
                  depots={depotPins}
                />
              ) : (
                <div className="flex h-full items-center justify-center p-4 text-center text-xs text-muted-foreground">
                  Harita için NEXT_PUBLIC_MAPTILER_KEY tanımlı değil.
                </div>
              )}
            </div>

            <div className="flex h-48 flex-col overflow-hidden rounded-lg border sm:h-80">
              <div className="flex items-center gap-2 border-b p-2">
                <Select value={chainFilter} onValueChange={setChainFilter}>
                  <SelectTrigger className="h-8 flex-1 text-xs">
                    <SelectValue placeholder="Marketler" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="all">Tüm marketler</SelectItem>
                    {chains.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {loadingDepots ? (
                <div className="flex flex-1 items-center justify-center">
                  <Spinner className="size-5 text-muted-foreground" />
                </div>
              ) : visibleDepots.length === 0 ? (
                <div className="flex flex-1 items-center justify-center p-4 text-center text-xs text-muted-foreground">
                  Bu bölgede market bulunamadı. Mesafeyi artırmayı dene.
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto p-1">
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent">
                    <Checkbox
                      checked={allVisibleSelected}
                      onCheckedChange={toggleAllVisible}
                    />
                    <span className="text-xs font-medium text-muted-foreground">
                      Tümünü seç ({visibleDepots.length})
                    </span>
                  </label>
                  {visibleDepots.map((d) => (
                    <label
                      key={d.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
                    >
                      <Checkbox
                        checked={selected.has(d.id)}
                        onCheckedChange={() => toggleDepot(d.id)}
                      />
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
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter>
          <Button
            onClick={handleSave}
            // Boş seçimle kaydetmeyi engelle: depots [] kaydedilirse arama
            // tarafı bunu "auto" (tüm yakın şubeler) sayıyor → "hiçbiri"
            // sessizce "hepsi"ne dönerdi.
            disabled={saving || loadingDepots || selected.size === 0}
            className={cn("w-full sm:w-full")}
          >
            {saving ? <Spinner className="size-4" /> : null}
            Kaydet
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
