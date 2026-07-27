"use client"

// Ana sayfa kapanış çağrısı — fiyatlandırma ile footer arasında durur.
// Tek satırlık başlık ve tek bir eylem düğmesinden ibarettir: sayfayı okuyup
// aşağıya inen kullanıcıya son bir giriş noktası verir.
//
// "Sepet" kelimesinin hemen soluna market logoları shadcn avatar grubu olarak
// yerleşir. Avatarlar `em` cinsinden ölçülür (size-[0.82em]) — böylece
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

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

// Sıra, kayan pencerenin sırasını belirler — HeroMarketBadge ile aynı dizilim.
const MARKETS = [
  { src: "/market-logos/a101.webp", alt: "A101", short: "A" },
  { src: "/market-logos/migros.webp", alt: "Migros", short: "M" },
  { src: "/market-logos/sok.webp", alt: "ŞOK", short: "Ş" },
  { src: "/market-logos/bim.webp", alt: "BİM", short: "B" },
  { src: "/market-logos/tarim-kredi.webp", alt: "Tarım Kredi", short: "T" },
  { src: "/market-logos/carrefoursa.webp", alt: "CarrefourSA", short: "C" },
] as const

// Aynı anda gösterilen logo sayısı ve her adım arasındaki süre.
const WINDOW_SIZE = 3
const STEP_MS = 500

// Kayma geçişi: hızlı ve net bir yay; opacity ayrı tween ile yumuşak fade.
const slide = { type: "spring", stiffness: 460, damping: 34, mass: 0.7 } as const

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
      <div className="dark mx-auto flex w-full max-w-5xl flex-col items-center gap-5 px-4 py-12 text-foreground sm:py-16">
        <h2 {...hoverProps} className="cn-font-heading flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-center text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
          <span>Hemen</span>
          {/* Logo grubu ile "Sepet'i dene." tek parça: satır sarmasında
              logolar kelimeden kopup üst satırda yalnız kalmaz. */}
          <span className="inline-flex items-center gap-[0.25em]">
            <AvatarGroup className="-space-x-[0.28em]">
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
                    className="inline-flex shrink-0"
                  >
                    {/* Halka avatarın kendisinde: AvatarGroup'un doğrudan
                        çocukları artık motion sarmalayıcıları, grubun
                        `*:data-[slot=avatar]` seçicisi avatara ulaşmıyor. */}
                    <Avatar
                      className="size-[0.82em] ring-[0.05em] ring-background"
                      title={market.alt}
                    >
                      <AvatarImage src={market.src} alt={market.alt} />
                      <AvatarFallback className="text-[0.3em]">
                        {market.short}
                      </AvatarFallback>
                    </Avatar>
                  </motion.span>
                ))}
              </AnimatePresence>
            </AvatarGroup>
            <span>Sepet&apos;i dene.</span>
          </span>
        </h2>

        <Button
          {...hoverProps}
          asChild
          size="lg"
          className="h-10 rounded-full px-5"
        >
          <Link href="/asistan">Ücretsiz başla</Link>
        </Button>
      </div>
    </section>
  )
}
