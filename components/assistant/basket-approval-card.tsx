"use client"

import * as React from "react"
import { CheckIcon, XIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { BasketDraft, ParsedItem } from "@/lib/ai/schemas"
import { UNIT_VALUES } from "@/lib/ai/schemas"
import { stripQuantityTokens } from "@/lib/ai/normalize"

type EditableItem = {
  _id: string
  rawName: string
  searchQuery: string
  quantity: number
  unit: ParsedItem["unit"]
}

export type BasketApprovalSubmit = {
  items: Array<{
    rawName: string
    searchQuery: string
    quantity: number
    unit: ParsedItem["unit"]
  }>
}

type Props = {
  data: BasketDraft
  alreadyApproved?: boolean
  onApprove?: (input: BasketApprovalSubmit) => void
  onCancel?: () => void
}

export function BasketApprovalCard({
  data,
  alreadyApproved,
  onApprove,
  onCancel,
}: Props) {
  const [items, setItems] = React.useState<EditableItem[]>(() =>
    data.items.map((it) => ({
      _id: crypto.randomUUID(),
      rawName: it.name,
      searchQuery: it.searchQuery,
      quantity: it.quantity,
      unit: it.unit,
    })),
  )

  const readOnly = !!alreadyApproved

  function updateItem(id: string, patch: Partial<EditableItem>) {
    setItems((arr) =>
      arr.map((it) => (it._id === id ? { ...it, ...patch } : it)),
    )
  }
  function removeItem(id: string) {
    setItems((arr) => arr.filter((it) => it._id !== id))
  }

  function handleApprove() {
    if (!onApprove) return
    const cleaned = items
      .filter(
        (it) =>
          it.rawName.trim().length > 0 && it.searchQuery.trim().length > 0,
      )
      .map((it) => ({
        rawName: it.rawName.trim(),
        searchQuery: it.searchQuery.trim().toLocaleLowerCase("tr-TR"),
        quantity:
          Number.isFinite(it.quantity) && it.quantity > 0 ? it.quantity : 1,
        unit: it.unit,
      }))
    if (cleaned.length === 0) return
    onApprove({ items: cleaned })
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <span className="text-sm font-medium">Sepetindeki Kalemler</span>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {readOnly ? (
            <Badge variant="secondary" className="text-[10px]">
              <CheckIcon className="mr-1 size-3" /> Onaylandı
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-[480px] [&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4">
          <TableHeader>
            <TableRow className="text-[11px] uppercase tracking-wide text-muted-foreground">
              <TableHead className="min-w-[160px]">Ürün</TableHead>
              <TableHead className="w-20 text-right">Adet</TableHead>
              <TableHead className="w-24">Birim</TableHead>
              {!readOnly && <TableHead className="w-8" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={readOnly ? 3 : 4}
                  className="py-6 text-center text-xs text-muted-foreground"
                >
                  Hiç kalem kalmadı.
                </TableCell>
              </TableRow>
            ) : (
              items.map((it) => (
                <TableRow key={it._id}>
                  <TableCell className="align-top">
                    {readOnly ? (
                      <div className="text-sm font-medium">{it.rawName}</div>
                    ) : (
                      <Input
                        value={it.rawName}
                        onChange={(e) =>
                          updateItem(it._id, {
                            rawName: e.target.value,
                            searchQuery: stripQuantityTokens(e.target.value),
                          })
                        }
                        className="h-8 text-sm"
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {readOnly ? (
                      <span className="tabular-nums">
                        {formatQty(it.quantity)}
                      </span>
                    ) : (
                      <Input
                        type="number"
                        step="0.01"
                        value={it.quantity}
                        onChange={(e) =>
                          updateItem(it._id, {
                            quantity: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="h-8 w-full text-right text-sm tabular-nums"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {readOnly ? (
                      <span className="text-xs text-muted-foreground">
                        {it.unit}
                      </span>
                    ) : (
                      <NativeSelect
                        value={it.unit}
                        onChange={(e) =>
                          updateItem(it._id, {
                            unit: e.target
                              .value as (typeof UNIT_VALUES)[number],
                          })
                        }
                        className="h-8 text-sm"
                      >
                        {UNIT_VALUES.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </NativeSelect>
                    )}
                  </TableCell>
                  {!readOnly && (
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(it._id)}
                        className="size-7 text-muted-foreground hover:text-destructive"
                        aria-label="Kalemi sil"
                      >
                        <XIcon className="size-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!readOnly && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-muted/30 px-4 py-3">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            İptal
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleApprove}
            disabled={items.length === 0}
          >
            <CheckIcon className="mr-1 size-3.5" />
            Onayla
          </Button>
        </div>
      )}
    </div>
  )
}

function formatQty(q: number) {
  return Number.isInteger(q) ? q.toString() : q.toFixed(2).replace(/\.?0+$/, "")
}
