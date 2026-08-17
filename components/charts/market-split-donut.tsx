"use client"

import * as React from "react"
import { Cell, Label, Pie, PieChart } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { MarketCell } from "@/components/market-cell"
import { MarketLogo } from "@/components/market-logo"
import { formatTL } from "@/lib/format"

const COLOR_VARS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const

export type MarketDatum = {
  market: string
  value: number
}

type Props = {
  data: MarketDatum[]
  totalLabel: string
  emptyHint: string
}

export function MarketSplitDonut({ data, totalLabel, emptyHint }: Props) {
  const sorted = React.useMemo(
    () =>
      [...data]
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value),
    [data],
  )

  if (sorted.length < 2) {
    return (
      <p className="px-1 py-2 text-xs text-muted-foreground">{emptyHint}</p>
    )
  }

  const total = sorted.reduce((sum, d) => sum + d.value, 0)

  const chartData = sorted.map((d, i) => ({
    ...d,
    fill: COLOR_VARS[i % COLOR_VARS.length],
  }))

  const config: ChartConfig = Object.fromEntries(
    sorted.map((d, i) => [
      d.market,
      {
        label: d.market,
        color: COLOR_VARS[i % COLOR_VARS.length],
      },
    ]),
  )

  return (
    // Halka solda, döküm sağda — mobilde de aynı. Alt alta dizildiğinde kart
    // gereksiz uzuyor ve yüzdeleri dilimlerle eşlemek için göz aşağı yukarı
    // gidip geliyordu. Dar ekranda halka küçülür, döküm kalan genişliği alır.
    <div className="flex items-center gap-3 sm:gap-4">
      <ChartContainer
        config={config}
        className="aspect-square size-[140px] shrink-0 sm:size-[168px]"
      >
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value, _name, item) => {
                  const pct = total > 0 ? (Number(value) / total) * 100 : 0
                  const market = (item?.payload as MarketDatum | undefined)
                    ?.market
                  return (
                    <div className="flex w-full items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-1.5">
                        {/* Renk noktası yerine logo: dilimin hangi market
                            olduğu ipucu değil, doğrudan okunuyor. Renk zaten
                            imlecin durduğu dilimde. */}
                        <MarketLogo name={market} size="sm" />
                        <span className="truncate text-muted-foreground">
                          {market}
                        </span>
                      </div>
                      <span className="shrink-0 font-mono font-medium tabular-nums">
                        {formatTL(Number(value))}{" "}
                        <span className="text-muted-foreground">
                          · %{Math.round(pct)}
                        </span>
                      </span>
                    </div>
                  )
                }}
              />
            }
          />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="market"
            // Yüzde: yarıçaplar kaptan türesin. Sabit px verildiğinde mobil
            // için küçültülen kapta halka dışarı taşıyordu.
            innerRadius="66%"
            outerRadius="92%"
            strokeWidth={2}
            paddingAngle={2}
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox)) return null
                return (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {/* Halkanın deliği mobilde ~92px; etiket ve tutar o
                        genişliğe sığsın diye iki kademeli. */}
                    <tspan
                      x={viewBox.cx}
                      dy="-0.6em"
                      className="fill-muted-foreground text-[0.5625rem] uppercase tracking-wide sm:text-[0.625rem]"
                    >
                      {totalLabel}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      dy="1.5em"
                      className="fill-foreground text-sm font-semibold tabular-nums sm:text-base"
                    >
                      {formatTL(total)}
                    </tspan>
                  </text>
                )
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
      {/* Döküm satırı sabit şeritlerden kurulur: renk noktası ve logo kendi
          genişliklerinde (`shrink-0`), ad tek esneyen öğe, tutar ve yüzde sağda
          sabit genişlikte. Eskiden satırda yalnız ad ve yüzde vardı; ikisi
          `justify-between` ile iki uca itilince aralarında yüzlerce piksel boş
          kalıyor, yüzdeler de "%84"/"%4" farkı yüzünden aynı şeride oturmuyordu.
          Tutar dar ekranda gizlenir — orada yer yok, halka zaten küçülmüş. */}
      <ul className="grid min-w-0 flex-1 gap-1 text-xs">
        {chartData.map((d) => {
          const pct = total > 0 ? (d.value / total) * 100 : 0
          return (
            <li key={d.market} className="flex min-h-8 items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: d.fill }}
              />
              <MarketCell
                name={d.market}
                size="sm"
                showExternalIcon={false}
                className="min-w-0 flex-1"
              />
              <span className="hidden shrink-0 tabular-nums sm:inline">
                {formatTL(d.value)}
              </span>
              <span className="w-9 shrink-0 text-right tabular-nums text-muted-foreground">
                %{Math.round(pct)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
