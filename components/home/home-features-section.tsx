import { Squircle } from "@/components/ui/squircle"
import Image from "next/image"
import Link from "next/link"
import { RiArrowRightLine } from "@remixicon/react"

import { PressFx } from "@/components/motion/press-fx"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/* ── Sohbet ───────────────────────────────────────────────────────────────── */

// Kenarlık yok: kuyrukla birleşen bir çizgi her ölçekte farklı yumuşuyordu.
const BUBBLE =
  "relative w-fit rounded-2xl bg-muted px-3 py-2 text-[0.8125rem]/[1.125rem] text-foreground/85"

// Balon kuyruğu: x=0..1 balona biner, ucu yuvarlatılmış eğri dışarı taşar.
function BubbleTail({ side }: { side: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 10 16"
      className={cn(
        "absolute bottom-0 h-4 w-2.5 fill-muted",
        side === "right" ? "-right-[9px]" : "-left-[9px] -scale-x-100"
      )}
    >
      <path d="M0 0h1c0 7 2.6 11.6 8.2 14.8.7.4.5 1.2-.3 1.2H0Z" />
    </svg>
  )
}

function ChatArt() {
  return (
    <div className="absolute inset-x-5 top-5 z-10 flex flex-col gap-3 @md:inset-y-6 @md:right-7 @md:left-[40%] @md:justify-center">
      {/* Kullanıcı balonu sağa, AI yığını sola yaslı; ikisi kademeli biner. */}
      <div className={cn(BUBBLE, "ml-auto max-w-[70%] rounded-br-none")}>
        Bu akşam nohutlu pilav yapacağım
        <BubbleTail side="right" />
      </div>

      <div className="mr-8 flex items-end gap-3">
        <span className="relative size-7 shrink-0 overflow-hidden rounded-full">
          <Image
            src="/brand/dark-icon-sepet.svg"
            alt=""
            width={28}
            height={28}
            className="size-full dark:hidden"
            unoptimized
          />
          <Image
            src="/brand/light-icon-sepet.svg"
            alt=""
            width={28}
            height={28}
            className="hidden size-full dark:block"
            unoptimized
          />
        </span>
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className={BUBBLE}>
            Pirinç, nohut ve sıvı yağı sepetine ekledim.
          </div>
          <div className={cn(BUBBLE, "rounded-bl-none")}>
            En hesaplı sepet BİM&apos;de, toplam 113,25 TL.
            <BubbleTail side="left" />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Market baloncukları ──────────────────────────────────────────────────── */

const ART_W = 720
const ART_H = 288
const MARKETS = ["bim", "migros", "a101", "sok", "carrefoursa", "tarim-kredi"]
// Baloncuk tanımları r=50'de çizilir, kullanımda ölçeklenir.
const UNIT_R = 50

const BADGE_H = 30
const LOGO_R = 11
const LOGO_STEP = 15
const BADGE_PAD_R = 12
const BADGE_OPACITY = 0.6
// "000,00 TL" metninin text-xs tabular genişliği.
const PRICE_W = 56

const BADGES = [
  { cx: 500, cy: 50, markets: ["migros", "carrefoursa"], price: "127,90 TL" },
  { cx: 628, cy: 126, markets: ["bim"], price: "113,25 TL", best: true },
  { cx: 540, cy: 214, markets: ["tarim-kredi"], price: "119,40 TL" },
].map((badge) => {
  const w =
    BADGE_H + (badge.markets.length - 1) * LOGO_STEP + 4 + PRICE_W + BADGE_PAD_R
  return { ...badge, w, x: badge.cx - w / 2, y: badge.cy - BADGE_H / 2 }
})

// Sabit tohumlu PRNG: sunucu ve istemci aynı yerleşimi üretir (yalnız + ve ×).
const BUBBLES = (() => {
  let seed = 20261029
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  const bubbles: { x: number; y: number; r: number; market: string }[] = []
  const ATTEMPTS = 5000
  const GAP = 2
  const PAD = 3
  const half = BADGE_H / 2
  // Hap kenarına mesafe: uçlar yuvarlak olduğu için orta çizgiye uzaklık − yarı yükseklik.
  const badgeGap = (x: number, y: number) =>
    Math.min(
      ...BADGES.map((badge) => {
        const cx = Math.min(Math.max(x, badge.x + half), badge.x + badge.w - half)
        return Math.sqrt((x - cx) ** 2 + (y - badge.cy) ** 2) - half - PAD
      })
    )
  const push = (x: number, y: number, r: number) =>
    bubbles.push({
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      r: Math.floor(r * 10) / 10,
      market: MARKETS[Math.floor(rand() * MARKETS.length)],
    })

  // Önce büyükler yerleşir, boşlukları küçükler doldurur.
  for (let i = 0; i < ATTEMPTS; i++) {
    const maxR = 26 - 14 * (i / ATTEMPTS)
    const r = 8 + (maxR - 8) * rand() * (0.35 + 0.65 * rand())
    const x = rand() * ART_W
    const y = rand() * ART_H
    if (badgeGap(x, y) < r) continue
    const overlaps = bubbles.some(
      (b) => (b.x - x) ** 2 + (b.y - y) ** 2 < (b.r + r + GAP) ** 2
    )
    if (overlaps) continue
    push(x, y, r)
  }

  // Hapların düz kenarlarında kalan boşluğa sığan en büyük ufak baloncuk konur.
  for (const badge of BADGES) {
    for (let i = 0; i < 800; i++) {
      const x = badge.x - 20 + rand() * (badge.w + 40)
      const y = badge.cy - half - 20 + rand() * (BADGE_H + 40)
      const r = Math.min(
        12,
        badgeGap(x, y),
        ...bubbles.map(
          (b) => Math.sqrt((b.x - x) ** 2 + (b.y - y) ** 2) - b.r - GAP
        )
      )
      if (r >= 6) push(x, y, r)
    }
  }
  return bubbles
})()

function BubblesArt() {
  return (
    // Kartın solu ve metnin durduğu sol alt köşe zemine erir.
    <div className="absolute inset-0 mask-l-from-45% mask-l-to-90% mask-radial-[90%_95%] mask-radial-at-bottom-left mask-radial-from-transparent mask-radial-from-45% mask-radial-to-black mask-radial-to-100% @max-md:mask-b-from-40% @max-md:mask-b-to-75%">
      <svg
        width={ART_W}
        height={ART_H}
        viewBox={`0 0 ${ART_W} ${ART_H}`}
        className="absolute top-0 right-0 [--bubble-edge:color-mix(in_oklab,var(--card)_85%,var(--foreground))]"
      >
        <defs>
          <clipPath id="feature-bubble-clip" clipPathUnits="objectBoundingBox">
            <circle cx="0.5" cy="0.5" r="0.5" />
          </clipPath>
          {MARKETS.map((market) => (
            <g key={market} id={`feature-bubble-${market}`}>
              <circle r={UNIT_R} className="fill-background" />
              <image
                href={`/market-logos/${market}.webp`}
                x={-UNIT_R}
                y={-UNIT_R}
                width={UNIT_R * 2}
                height={UNIT_R * 2}
                clipPath="url(#feature-bubble-clip)"
              />
              <circle
                r={UNIT_R - 0.5}
                vectorEffect="non-scaling-stroke"
                className="fill-none stroke-(--bubble-edge)"
              />
            </g>
          ))}
        </defs>
        {BUBBLES.map((b) => (
          <use
            key={`${b.x}:${b.y}`}
            href={`#feature-bubble-${b.market}`}
            transform={`translate(${b.x} ${b.y}) scale(${b.r / UNIT_R})`}
            opacity={0.25 + b.r / 60}
          />
        ))}

        {BADGES.map((badge) => (
          <g
            key={badge.price}
            transform={`translate(${badge.x} ${badge.y})`}
          >
            {/* Zemin ve logolar en büyük baloncuklarla aynı opaklıkta; yalnız fiyat net. */}
            <g opacity={BADGE_OPACITY}>
              <rect
                x="0.5"
                y="0.5"
                width={badge.w - 1}
                height={BADGE_H - 1}
                rx={BADGE_H / 2 - 0.5}
                className="fill-background stroke-(--bubble-edge)"
              />
              {badge.markets.map((market, i) => {
                const cx = BADGE_H / 2 + i * LOGO_STEP
                return (
                  <g key={market}>
                    {/* Üst üste binen logoları zemin rengi halka ayırır. */}
                    {i > 0 && (
                      <circle
                        cx={cx}
                        cy={BADGE_H / 2}
                        r={LOGO_R + 1.5}
                        className="fill-background"
                      />
                    )}
                    <use
                      href={`#feature-bubble-${market}`}
                      transform={`translate(${cx} ${BADGE_H / 2}) scale(${LOGO_R / UNIT_R})`}
                    />
                  </g>
                )
              })}
            </g>
            <text
              x={badge.w - BADGE_PAD_R}
              y={BADGE_H / 2}
              textAnchor="end"
              dominantBaseline="central"
              className={cn(
                "text-xs font-medium tabular-nums",
                badge.best ? "fill-foreground/80" : "fill-muted-foreground/80"
              )}
            >
              {badge.price}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

/* ── Kartlar ──────────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    title: "Tarifini yaz",
    description: "Yemeğini yaz ya da fişini yükle.",
    art: <ChatArt />,
    textWidth: "@md:max-w-[13rem]",
  },
  {
    title: "En hesaplı sepet",
    description: "Doğru ürünü eşleştirir, en hesaplı marketi buluruz.",
    art: <BubblesArt />,
    textWidth: "@md:max-w-[17rem]",
  },
]

export function HomeFeaturesSection() {
  return (
    <div className="@container/features mx-auto w-full max-w-5xl px-4 pt-10 text-foreground md:pt-14">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-medium tracking-tight text-balance text-foreground">
          Asistanla Tanışın
        </h2>
        <PressFx className="shrink-0">
          <Button
            variant="default"
            asChild
            size="sm"
            className="group shrink-0"
          >
            <Link href="/asistan">
              Asistanı dene
              <RiArrowRightLine
                className="transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </Button>
        </PressFx>
      </div>

      <div className="grid grid-cols-1 gap-3 @4xl/features:grid-cols-2">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="@container">
            <Squircle
              as="article"
              radius="2xl"
              effects
              className="relative h-72 overflow-hidden bg-card smooth-shadow-ring-sm @md:h-64"
            >
              <div aria-hidden className="pointer-events-none select-none">
                {feature.art}
              </div>
              <div
                className={cn(
                  "absolute inset-x-0 bottom-0 isolate p-5 @md:right-auto @md:p-6",
                  feature.textWidth
                )}
              >
                {/* Metnin arkasındaki zemin: üste ve sağa doğru erir. */}
                <div
                  aria-hidden
                  className="absolute -top-10 -right-12 bottom-0 left-0 -z-10 bg-card mask-t-from-55% mask-r-from-60%"
                />
                <h3 className="text-lg font-medium tracking-tight text-balance text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-pretty text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </Squircle>
          </div>
        ))}
      </div>
    </div>
  )
}
