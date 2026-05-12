"use client"

import { ListChecksIcon } from "lucide-react"
import type { BasketDraft } from "@/lib/ai/schemas"

const UNIT_LABEL: Record<string, string> = {
  adet: "adet",
  kg: "kg",
  g: "g",
  l: "lt",
  ml: "ml",
  paket: "paket",
}

export function ParsedItemsCard({ data }: { data: BasketDraft }) {
  if (!data?.items?.length) return null
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <ListChecksIcon className="size-4" />
        Sepetiniz
      </div>
      <ul className="grid gap-1.5 text-sm">
        {data.items.map((item, i) => (
          <li
            key={`${item.searchQuery}-${i}`}
            className="flex items-baseline justify-between gap-3 border-b border-dashed border-border/60 pb-1.5 last:border-none last:pb-0"
          >
            <span className="font-medium">{capitalize(item.searchQuery)}</span>
            <span className="text-xs text-muted-foreground">
              {formatQty(item.quantity)} {UNIT_LABEL[item.unit] ?? item.unit}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function formatQty(q: number) {
  return Number.isInteger(q) ? q.toString() : q.toFixed(2).replace(/\.?0+$/, "")
}

function capitalize(s: string) {
  if (!s) return s
  return s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1)
}
