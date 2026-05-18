"use client"

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const tl = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
})

export type MonthlyDatum = {
  month: string
  value: number
}

type Props = {
  data: MonthlyDatum[]
  label: string
  emptyHint: string
}

export function MonthlyBarChart({ data, label, emptyHint }: Props) {
  const total = data.reduce((sum, d) => sum + d.value, 0)

  if (total <= 0) {
    return (
      <p className="px-1 py-2 text-xs text-muted-foreground">{emptyHint}</p>
    )
  }

  const config: ChartConfig = {
    value: {
      label,
      color: "var(--chart-1)",
    },
  }

  return (
    <ChartContainer
      config={config}
      className="aspect-auto h-[140px] w-full"
    >
      <BarChart
        accessibilityLayer
        data={data}
        margin={{ top: 8, right: 4, left: 4, bottom: 0 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.4} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          fontSize={11}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          content={
            <ChartTooltipContent
              hideLabel={false}
              formatter={(value) => (
                <div className="flex w-full items-center justify-between gap-3">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-mono font-medium tabular-nums">
                    {tl.format(Number(value))}
                  </span>
                </div>
              )}
            />
          }
        />
        <Bar dataKey="value" fill="var(--color-value)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}

type LegendItem = { color: string; label: string }

export function MonthlyChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-3 pt-3 text-xs text-muted-foreground">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: it.color }}
          />
          <span>{it.label}</span>
        </li>
      ))}
    </ul>
  )
}
