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

const tl = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 2,
})

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
    <div className="flex flex-col items-center gap-3">
      <ChartContainer
        config={config}
        className="aspect-square h-[180px] w-[180px]"
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
                      <div className="flex items-center gap-1.5">
                        <div
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: item?.payload?.fill }}
                        />
                        <span className="text-muted-foreground">{market}</span>
                      </div>
                      <span className="font-mono font-medium tabular-nums">
                        {tl.format(Number(value))}{" "}
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
            innerRadius={55}
            outerRadius={80}
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
                    <tspan
                      x={viewBox.cx}
                      dy="-0.6em"
                      className="fill-muted-foreground text-[10px] uppercase tracking-wide"
                    >
                      {totalLabel}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      dy="1.5em"
                      className="fill-foreground text-base font-semibold tabular-nums"
                    >
                      {tl.format(total)}
                    </tspan>
                  </text>
                )
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="grid w-full gap-1.5 text-xs">
        {chartData.map((d) => {
          const pct = total > 0 ? (d.value / total) * 100 : 0
          return (
            <li
              key={d.market}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: d.fill }}
                />
                <MarketCell name={d.market} size="sm" showExternalIcon={false} />
              </div>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                %{Math.round(pct)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
