"use client"

import * as React from "react"

import { Squircle } from "@/components/ui/squircle"
import {
  A101Wordmark,
  BimWordmark,
  CarrefourSaWordmark,
  MigrosWordmark,
  SokWordmark,
  TarimKrediWordmark,
} from "@/components/market-wordmarks"

// YÜKSEKLİK HER LOGODA AYRI. Wordmark'ların en/boy oranı 1,5 (ŞOK) ile 7,6
// (CarrefourSA) arasında değişiyor; hepsine aynı `h-6` verilince Carrefour
// ŞOK'un beş katı genişliğe yayılıp kutuyu eziyordu. Değerler eşit MÜREKKEP
// ALANINA göre seçildi (h ≈ 44 / √oran) — kutuların hepsi aynı görsel ağırlıkta
// okunuyor. Oran değişirse (yeni logo, yeni viewBox) yükseklik de yeniden
// hesaplanmalı.
const MARKETS = [
  { Logo: BimWordmark, name: "BİM", size: "h-7 @lg/markets:h-9" },
  { Logo: A101Wordmark, name: "A101", size: "h-[22px] @lg/markets:h-7" },
  { Logo: SokWordmark, name: "ŞOK", size: "h-8 @lg/markets:h-11" },
  { Logo: MigrosWordmark, name: "Migros", size: "h-[19px] @lg/markets:h-6" },
  {
    Logo: CarrefourSaWordmark,
    name: "CarrefourSA",
    size: "h-[18px] @lg/markets:h-[22px]",
  },
  {
    Logo: TarimKrediWordmark,
    name: "Tarım Kredi",
    size: "h-[21px] @lg/markets:h-[26px]",
  },
]

const GAP = 3
const ADVANCE_MS = 2800
/** Parmak çekildikten sonra otomatik ilerlemenin geri gelmesi için beklenen süre. */
const RESUME_MS = 4500

/**
 * Mobilde ray, listeyi İKİ kez basıp yatay kaydırma konumunu bir kopya boyu
 * (`period`) modunda tutar: iki kopya birebir aynı olduğu için konumu bir
 * periyot kaydırmak ekranda hiçbir şeyi değiştirmez, döngü dikişsiz görünür.
 *
 * Eşikler ASİMETRİK. Sağa doğru sarma otomatik ilerlemenin hemen öncesinde
 * `period`ta yapılıyor (ilerleme hep ilk kopyanın içinde kalsın diye), sola
 * doğru sarma ise ancak kullanıcı başa dayandığında (`scrollLeft ≈ 0`)
 * tetikleniyor ve konumu bir periyot ileri atıyor. Tek eşik kullanılsaydı iki
 * sarma birbirini tetikleyip titrerdi.
 *
 * Masaüstünde hiç çalışmaz: orada ray bir grid, `scrollWidth === clientWidth`.
 */
function useLoopingAutoScroll(
  ref: React.RefObject<HTMLUListElement | null>,
  count: number
) {
  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)")

    // Kutu genişliği breakpoint'e ve yazı tipine göre değişiyor, sabitlenemez;
    // her seferinde ölçülüyor.
    const stepOf = () => {
      const first = el.firstElementChild as HTMLElement | null
      return first ? first.offsetWidth + GAP : 0
    }
    const isScrollable = () => el.scrollWidth - el.clientWidth > 1

    let paused = false
    let programmatic = false
    let programmaticTimer: ReturnType<typeof setTimeout> | undefined
    let resumeTimer: ReturnType<typeof setTimeout> | undefined

    const advance = () => {
      if (paused || reduced.matches || !isScrollable()) return
      const step = stepOf()
      if (!step) return

      const period = step * count
      // Sarma İLERLEMEDEN önce ve anlık: `scrollTo` yumuşak animasyonunun
      // ortasında konumu değiştirmek animasyonu kesip zıplama yaratıyor.
      if (el.scrollLeft >= period - 1) el.scrollLeft -= period

      programmatic = true
      clearTimeout(programmaticTimer)
      programmaticTimer = setTimeout(() => {
        programmatic = false
      }, 700)
      el.scrollTo({ left: el.scrollLeft + step, behavior: "smooth" })
    }

    let interval = setInterval(advance, ADVANCE_MS)

    const onScroll = () => {
      if (programmatic || !isScrollable()) return
      const step = stepOf()
      if (!step) return

      const period = step * count
      const max = el.scrollWidth - el.clientWidth
      if (el.scrollLeft <= 0) el.scrollLeft = period
      else if (el.scrollLeft >= max - 1) el.scrollLeft = max - period
    }

    const pause = () => {
      paused = true
      clearTimeout(resumeTimer)
    }
    const scheduleResume = () => {
      clearTimeout(resumeTimer)
      resumeTimer = setTimeout(() => {
        paused = false
      }, RESUME_MS)
    }

    el.addEventListener("scroll", onScroll, { passive: true })
    el.addEventListener("pointerdown", pause)
    el.addEventListener("pointerup", scheduleResume)
    el.addEventListener("pointercancel", scheduleResume)
    // Sekme arkadayken ilerlemek anlamsız: geri dönüldüğünde ray, birikmiş
    // adımları tek karede atlamış gibi görünür.
    const onVisibility = () => {
      clearInterval(interval)
      if (!document.hidden) interval = setInterval(advance, ADVANCE_MS)
    }
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      clearInterval(interval)
      clearTimeout(programmaticTimer)
      clearTimeout(resumeTimer)
      el.removeEventListener("scroll", onScroll)
      el.removeEventListener("pointerdown", pause)
      el.removeEventListener("pointerup", scheduleResume)
      el.removeEventListener("pointercancel", scheduleResume)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [ref, count])
}

export function MarketLogoTrack() {
  const ref = React.useRef<HTMLUListElement>(null)
  useLoopingAutoScroll(ref, MARKETS.length)

  return (
    // Tek DOM, iki düzen: mobilde snap'li yatay ray, md'den itibaren 3 kolonlu
    // grid. İkinci kopya yalnız mobil döngü için; grid'de `md:hidden` ile
    // hücre bile açmıyor, ekran okuyucudan da gizli.
    //
    // Kutular 4:3. Referanstaki mozaik karelerden kuruluydu ama orada 5 kolon
    // var; bizdeki altı logo 3 kolona sığdığı için kare kutu 242px'e şişip
    // bloğu 480px'e çıkarıyordu. 4:3, kareye en yakın oran olarak bloğu
    // referansın toplam yüksekliğinde (~370px) tutuyor.
    <ul
      ref={ref}
      // Ray TAŞMAZ: sol ve sağ kenarı üstteki metin paneliyle birebir aynı
      // hizada. Kaydırılabilirliği kenardan sızan bir kutuya değil, rayın
      // kendi otomatik ilerlemesine bırakıyoruz.
      //
      // PADDING/NEGATİF MARGİN PAYI YOK, bilinçli. Gölgeye yer açmak için
      // kırpma kutusunu dışarı itmiştik; o pay komşu kutuların köşelerini de
      // görünür kılıp iki uçta tırnak gibi dilimler bırakıyordu. Kutular artık
      // dışarı hiçbir şey boyamıyor (gölge yok, kenar Lisse'in clip-path'i
      // içinde), dolayısıyla kırpma kutusu tam hizada durabiliyor: ne kesik
      // kenar ne sızan komşu.
      className="flex snap-x snap-mandatory gap-[3px] overflow-x-auto [scrollbar-width:none] @lg/markets:grid @lg/markets:snap-none @lg/markets:grid-cols-3 @lg/markets:overflow-visible [&::-webkit-scrollbar]:hidden"
    >
      {[0, 1].map((copy) =>
        MARKETS.map(({ Logo, name, size }) => (
          <li
            key={`${copy}-${name}`}
            aria-hidden={copy === 1 || undefined}
            // İki kutu kabı TAM doldurur: `calc(50% - 1.5px)` aradaki 3px'lik
            // boşluğun yarısını düşüyor, böylece rayın iki ucu üstteki panelin
            // kenarlarıyla çakışıyor. `grid` — `effects` sarmalayıcısı `ul`nin
            // doğrudan çocuğu olamayacağı için yüzey içerideki `Squircle`da.
            className={`grid w-[calc(50%-1.5px)] shrink-0 snap-start @lg/markets:w-auto ${copy === 1 ? "@lg/markets:hidden" : ""}`}
          >
            {/* Kart dili blog kartlarıyla ve metin paneliyle BİREBİR:
                `radius="xl"` + `effects` + düz `border border-border`, gölge
                yok.

                `bg-clip-padding` ŞART: zemin varsayılan olarak `border-box`a
                kadar boyanıyor, Lisse'in SVG'ye taşıdığı kenar ise squircle
                yolunun üstünde duruyor. Köşelerde eğrilik en yüksekken zemin o
                çizginin dışına yarım piksel taşıp kutunun köşesini kenardan
                ayrık gösteriyordu. `padding-box` zemini içeri çekiyor, dış
                sınırı tek çizen SVG kalıyor.

                Zemin tema başına ayrı, panelin TERSİ: kutular panelden açık
                durmalı ama token sırası temalarda ters dönüyor (gerekçe
                home-markets-section.tsx'te). */}
            <Squircle
              radius="xl"
              effects
              className="flex aspect-[4/3] items-center justify-center border border-border bg-card bg-clip-padding p-4 @lg/markets:p-6 dark:bg-muted"
            >
              {/* Wordmark'lar `currentColor`: renk `text-primary` — eski
                  şeritteki canlı marka tonu, iki temada da (gündüz koyu kahve,
                  gece amber) kart zemininde rahat okunuyor.

                  `max-w-full` emniyet kemeri: dar ekranda en geniş wordmark
                  (CarrefourSA) kutuyu taşırsa SVG kendi `preserveAspectRatio`su
                  ile küçülür, ezilmez. */}
              <Logo className={`${size} w-auto max-w-full text-primary`} />
            </Squircle>
          </li>
        ))
      )}
    </ul>
  )
}
