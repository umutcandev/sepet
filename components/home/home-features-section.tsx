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

/* ── Ürün kartları ızgarası ───────────────────────────────────────────────── */

const ART_W = 720
const ART_H = 288
const TILE = { w: 84, h: 56 }
// Yığın içinde her kart bir öncekinin sağ altına biner; yığınlar yan yana.
const STEP = { x: 12, y: 20 }
const STACK_GAP = 108
const PICK = { stack: 5, card: 6 }
const MARKETS = ["bim", "migros", "a101", "sok", "carrefoursa", "tarim-kredi"]

const tileOrigin = (stack: number, card: number) => ({
  x: stack * STACK_GAP + card * STEP.x - 24,
  y: card * STEP.y - 52,
})

const TILES = (() => {
  const tiles: { x: number; y: number; market: string }[] = []
  for (let stack = -2; stack <= 7; stack++) {
    for (let card = 0; card < 18; card++) {
      // Seçili kartın altı boş kalır, kart yığından sıyrılmış görünür.
      if (stack === PICK.stack && card >= PICK.card && card <= PICK.card + 2)
        continue
      const { x, y } = tileOrigin(stack, card)
      if (x > ART_W || x + TILE.w < 0 || y > ART_H) continue
      const market = MARKETS[(stack * 5 + card * 2 + 12) % MARKETS.length]
      tiles.push({ x, y, market })
    }
  }
  return tiles.sort((a, b) => a.y - b.y || a.x - b.x)
})()

const PICKED = (() => {
  const w = 108
  const h = 76
  const o = tileOrigin(PICK.stack, PICK.card)
  return {
    x: o.x + TILE.w / 2 - w / 2,
    y: o.y + TILE.h / 2 - h / 2,
    w,
    h,
  }
})()

function MarketDot({ market, x, y, r }: { market: string; x: number; y: number; r: number }) {
  return (
    <>
      <clipPath id={`feature-logo-${market}-${r}`}>
        <circle cx={x} cy={y} r={r} />
      </clipPath>
      <circle cx={x} cy={y} r={r} className="fill-background" />
      <image
        href={`/market-logos/${market}.webp`}
        x={x - r}
        y={y - r}
        width={r * 2}
        height={r * 2}
        clipPath={`url(#feature-logo-${market}-${r})`}
      />
      <circle
        cx={x}
        cy={y}
        r={r - 0.25}
        className="fill-none stroke-(--tile-edge) stroke-[0.5]"
      />
    </>
  )
}

function TilesArt() {
  return (
    // Kartın solu ve metnin durduğu sol alt köşe zemine erir.
    <div className="absolute inset-0 mask-l-from-45% mask-l-to-90% mask-radial-[90%_95%] mask-radial-at-bottom-left mask-radial-from-transparent mask-radial-from-45% mask-radial-to-black mask-radial-to-100% @max-md:mask-b-from-40% @max-md:mask-b-to-75%">
      <svg
        width={ART_W}
        height={ART_H}
        viewBox={`0 0 ${ART_W} ${ART_H}`}
        className="absolute top-0 right-0 [--tile-dot:color-mix(in_oklab,var(--card)_78%,var(--foreground))] [--tile-edge:color-mix(in_oklab,var(--card)_88%,var(--foreground))] [--tile:color-mix(in_oklab,var(--card)_97%,var(--foreground))]"
      >
        <defs>
          {MARKETS.map((market) => (
            <g key={market} id={`feature-tile-${market}`}>
              <rect
                x="0.5"
                y="0.5"
                width={TILE.w - 1}
                height={TILE.h - 1}
                rx="7"
                className="fill-(--tile) stroke-(--tile-edge)"
              />
              <g opacity="0.7">
                <MarketDot market={market} x={11} y={11} r={5} />
              </g>
              <rect
                x="20"
                y="9.5"
                width="20"
                height="3"
                rx="1.5"
                className="fill-(--tile-dot)"
              />
            </g>
          ))}
        </defs>
        {TILES.map((t) => (
          <use
            key={`${t.x}:${t.y}`}
            href={`#feature-tile-${t.market}`}
            x={t.x}
            y={t.y}
          />
        ))}

        <g transform={`translate(${PICKED.x} ${PICKED.y})`}>
          <rect
            x="0.5"
            y="0.5"
            width={PICKED.w - 1}
            height={PICKED.h - 1}
            rx="10"
            className="fill-[color-mix(in_oklab,var(--card)_90%,var(--primary))] stroke-primary/45"
          />
          {/* Logo + fiyat tek grup, dikeyde ortalı: üst ve alt pay ~16px. */}
          <MarketDot market="bim" x={PICKED.w / 2} y={29} r={13} />
          <text
            x={PICKED.w / 2}
            y={59}
            textAnchor="middle"
            className="fill-foreground text-xs font-semibold tabular-nums"
          >
            113,25 TL
          </text>
        </g>
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
    art: <TilesArt />,
    textWidth: "@md:max-w-[17rem]",
  },
]

export function HomeFeaturesSection() {
  return (
    <div className="@container/features mx-auto w-full max-w-5xl px-4 pt-10 text-foreground md:pt-14">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight text-balance text-foreground">
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
                <h3 className="text-lg font-semibold tracking-tight text-balance text-foreground">
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
