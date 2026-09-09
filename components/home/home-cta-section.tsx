"use client"

// Ana sayfa kapanış çağrısı — fiyatlandırma ile footer arasında durur.
// Tek satırlık başlık ve tek bir eylem düğmesinden ibarettir: sayfayı okuyup
// aşağıya inen kullanıcıya son bir giriş noktası verir.
//
// "Sepet" kelimesinin hemen soluna market logoları bindirmeli bir grup olarak
// yerleşir. Logolar `em` cinsinden ölçülür (size-[0.92em]) — böylece
// başlığın responsive punto basamaklarında ayrıca ayarlanmaya gerek kalmadan
// metinle aynı boyda kalırlar.
//
// Logo kutusu, hero'daki HeroMarketBadge ile birebir aynı kayan pencere
// animasyonunu taşır (A B C → B C D → ...). Tetikleyici alan başlığın tamamı
// ve altındaki düğmedir — ikisinden birine gelmek animasyonu başlatır.
//
// Zemin fiyatlandırma bölümüyle aynı --home-base; iç sarmalayıcıdaki `dark`
// metin/kart paletini koyu tutar, footer'ın gradyanı da bu renkten devam eder.

import * as React from "react"
import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { Button } from "@/components/ui/button"
import { AnimateEnter } from "@/components/motion/animate-enter"
import { PressFx } from "@/components/motion/press-fx"
import { SPRING_SLIDE, STAGGER_STEP } from "@/lib/motion"

// Sıra, kayan pencerenin sırasını belirler — HeroMarketBadge ile aynı dizilim.
const MARKETS = [
  { src: "/market-logos/a101.webp", alt: "A101" },
  { src: "/market-logos/migros.webp", alt: "Migros" },
  { src: "/market-logos/sok.webp", alt: "ŞOK" },
  { src: "/market-logos/bim.webp", alt: "BİM" },
  { src: "/market-logos/tarim-kredi.webp", alt: "Tarım Kredi" },
  { src: "/market-logos/carrefoursa.webp", alt: "CarrefourSA" },
] as const

// Aynı anda gösterilen logo sayısı ve her adım arasındaki süre.
const WINDOW_SIZE = 3
const STEP_MS = 500

// Kayma geçişi: hızlı ve net bir yay; opacity ayrı tween ile yumuşak fade.
// Aynı yay hero rozetinde de kullanılır — tek kaynaktan (lib/motion.ts) gelir.
const slide = SPRING_SLIDE

export function HomeCtaSection() {
  const reduceMotion = useReducedMotion()
  const [start, setStart] = React.useState(0)
  const [hovering, setHovering] = React.useState(false)

  // Fare üzerindeyken pencereyi her adımda bir kaydır: A B C → B C D → ...
  React.useEffect(() => {
    if (!hovering || reduceMotion) return
    const id = setInterval(() => {
      setStart((s) => (s + 1) % MARKETS.length)
    }, STEP_MS)
    return () => clearInterval(id)
  }, [hovering, reduceMotion])

  // Görünen pencere: start'tan itibaren WINDOW_SIZE adet logo (mod ile sarmalanır).
  // index, her logonun değişmez kimliğidir; AnimatePresence giriş/çıkışı buna göre yapar.
  const windowLogos = Array.from({ length: WINDOW_SIZE }, (_, i) => {
    const index = (start + i) % MARKETS.length
    return { ...MARKETS[index], index }
  })

  // Tetikleyici alan başlığın tamamı ve altındaki düğme — ikisine de aynı
  // giriş/çıkış çifti bağlanır, aradaki boşluk hover sayılmaz.
  const hoverProps = {
    onMouseEnter: () => setHovering(true),
    onMouseLeave: () => setHovering(false),
  }

  return (
    <section className="relative z-20 bg-[var(--home-base)]">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-5 px-4 py-12 text-foreground sm:py-16">
        <AnimateEnter>
          {/* Vitrin yüzü (Cooper) — hero başlığıyla eşleşir; `cn-font-heading`
              değil, o kart/dialog başlıklarının Geist'i. Ağırlık `font-normal`:
              ailede yalnız 400 kayıtlı, `font-semibold` tarayıcıya sahte bold
              çizdirirdi (bkz. lib/fonts.ts). */}
          <h2
            {...hoverProps}
            className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-center cn-font-display text-2xl font-normal sm:text-3xl md:text-4xl lg:text-5xl"
          >
            <span>Hemen</span>
            {/* Logo grubu ile "Sepet'i dene." tek parça: satır sarmasında
              logolar kelimeden kopup üst satırda yalnız kalmaz. */}
            <span className="inline-flex items-center gap-[0.25em]">
              {/* Hero rozetiyle aynı kurulum: shadcn `Avatar` primitifi YOK.
                O primitif her avatara iki kontur katmanı bindiriyor (iç rim +
                `mix-blend-darken` kenarlık); bindirmeli bir grupta blend
                alttaki avatarın kenarını yukarı geçiriyor, üst üste iki halka
                okunuyordu. Ayrıcı halka da `--background` değil bölümün gerçek
                zeminini (`--home-base`) taşımalı — ikisi bilinçli olarak farklı
                renkler, o yüzden halka ayırıcı değil soluk bir hale gibi
                duruyordu. */}
              <span className="inline-flex -space-x-[0.31em]">
                <AnimatePresence mode="popLayout" initial={false}>
                  {windowLogos.map((market) => (
                    <motion.span
                      key={market.index}
                      layout
                      initial={{ opacity: 0, scale: 0.5, x: 12 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.5, x: -12 }}
                      // Giren/çıkan logo aynı anda küçülürken silikleşsin.
                      transition={{
                        ...slide,
                        opacity: { duration: 0.2, ease: "easeOut" },
                      }}
                      title={market.alt}
                      className="relative inline-flex size-[0.92em] shrink-0 rounded-full bg-[var(--home-base)] ring-[0.075em] ring-[var(--home-base)]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={market.src}
                        alt={market.alt}
                        decoding="async"
                        className="size-full rounded-full object-cover"
                      />
                      {/* Beyaz zeminli logolar krem sayfada kaybolmasın diye
                        tek bir ince kenar — blend yok, altı geçirmez. */}
                      <span className="pointer-events-none absolute inset-0 rounded-full border border-black/10 dark:border-white/10" />
                    </motion.span>
                  ))}
                </AnimatePresence>
              </span>
              <span>Sepet&apos;i dene.</span>
            </span>
          </h2>
        </AnimateEnter>

        <AnimateEnter delay={STAGGER_STEP}>
          <PressFx>
            <Button
              {...hoverProps}
              asChild
              size="lg"
              className="h-10 rounded-full px-5"
            >
              <Link href="/asistan">Ücretsiz başla</Link>
            </Button>
          </PressFx>
        </AnimateEnter>
      </div>
    </section>
  )
}
