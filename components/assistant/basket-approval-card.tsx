"use client"

import * as React from "react"
import { RiAddLine, RiCheckLine, RiCloseLine } from "@remixicon/react"
import { Card, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
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
  // Kart yalnızca kalemleri okur; yemek görselinden gelen taslakta da aynı.
  data: Pick<BasketDraft, "items">
  alreadyApproved?: boolean
  approvedItems?: BasketApprovalSubmit["items"]
  onApprove?: (input: BasketApprovalSubmit) => void
  onCancel?: () => void
}

export function BasketApprovalCard({
  data,
  alreadyApproved,
  approvedItems,
  onApprove,
  onCancel,
}: Props) {
  const [items, setItems] = React.useState<EditableItem[]>(() => {
    const source =
      alreadyApproved && approvedItems && approvedItems.length > 0
        ? approvedItems.map((it) => ({
            rawName: it.rawName,
            searchQuery: it.searchQuery,
            quantity: it.quantity,
            unit: it.unit,
          }))
        : data.items.map((it) => ({
            rawName: it.name,
            searchQuery: it.searchQuery,
            quantity: it.quantity,
            unit: it.unit,
          }))
    return source.map((it) => ({ _id: crypto.randomUUID(), ...it }))
  })

  const readOnly = !!alreadyApproved

  function updateItem(id: string, patch: Partial<EditableItem>) {
    setItems((arr) =>
      arr.map((it) => (it._id === id ? { ...it, ...patch } : it)),
    )
  }
  function removeItem(id: string) {
    setItems((arr) => arr.filter((it) => it._id !== id))
  }
  function addItem() {
    setItems((arr) => [
      ...arr,
      {
        _id: crypto.randomUUID(),
        rawName: "",
        searchQuery: "",
        quantity: 1,
        unit: "adet",
      },
    ])
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
    <Card>
      <CardHeader>
        <CardTitle>Sepetindeki Kalemler</CardTitle>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {readOnly ? (
            <Badge variant="secondary">Onaylandı</Badge>
          ) : null}
        </div>
      </CardHeader>

      <div className="overflow-x-auto">
        <Table className="w-full min-w-[300px] [&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4">
          <TableHeader>
            <TableRow className="text-[0.6875rem] uppercase tracking-wide text-muted-foreground">
              <TableHead className="w-auto">Ürün</TableHead>
              <TableHead className="w-16 text-right">Adet</TableHead>
              {/* w-24: seçicinin sağında ok için 32px dolgu var; w-20'de yazıya
                  ~26px kalıyor ve "paket"/"adet" "pak"/"ade" diye kesiliyordu.
                  Fiş kartındaki birim sütunuyla aynı genişlik. */}
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
                        aria-label="Ürün adı"
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
                        aria-label="Adet"
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
                        aria-label="Birim"
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
                        size="icon-sm"
                        onClick={() => removeItem(it._id)}
                        className="hover:text-destructive"
                        aria-label="Kalemi sil"
                      >
                        <RiCloseLine className="size-3.5" />
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
        <CardFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
          >
            <RiAddLine data-icon="inline-start" />
            Yeni kalem
          </Button>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              İptal
            </Button>
            <Button
              variant="default"
              type="button"
              size="sm"
              onClick={handleApprove}
              disabled={items.length === 0}
            >
              <RiCheckLine data-icon="inline-start" />
              Onayla
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  )
}

function formatQty(q: number) {
  return Number.isInteger(q) ? q.toString() : q.toFixed(2).replace(/\.?0+$/, "")
}
