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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ReceiptOCR, ReceiptOCRItem } from "@/lib/ai/schemas"
import { UNIT_VALUES } from "@/lib/ai/schemas"

type EditableItem = ReceiptOCRItem & { _id: string }

export type ApprovalSubmit = {
  marketName: string | null
  purchaseDate: string | null
  totalAmount: number | null
  items: ReceiptOCRItem[]
  receiptImageUrl: string
  receiptImageR2Key: string | null
}

type Props = {
  data: {
    ocr: ReceiptOCR
    receiptImageUrl: string
    receiptImageR2Key: string | null
  }
  alreadyApproved?: boolean
  onApprove?: (input: ApprovalSubmit) => void
  onCancel?: () => void
}

export function ReceiptApprovalCard({
  data,
  alreadyApproved,
  onApprove,
  onCancel,
}: Props) {
  const { ocr, receiptImageUrl, receiptImageR2Key } = data

  const [marketName, setMarketName] = React.useState(ocr.marketName ?? "")
  const [purchaseDate, setPurchaseDate] = React.useState(
    ocr.purchaseDate ?? "",
  )
  const [items, setItems] = React.useState<EditableItem[]>(() =>
    ocr.items.map((it) => ({ ...it, _id: crypto.randomUUID() })),
  )

  const readOnly = !!alreadyApproved

  const totalReceipt = items.reduce((sum, it) => {
    const t =
      it.totalPrice ??
      (it.unitPrice != null ? it.unitPrice * it.quantity : 0)
    return sum + (t ?? 0)
  }, 0)

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
    const cleaned: ReceiptOCRItem[] = items
      .filter((it) => it.rawName.trim().length > 0 && it.searchQuery.trim().length > 0)
      .map((it) => ({
        rawName: it.rawName.trim(),
        quantity: Number.isFinite(it.quantity) && it.quantity > 0 ? it.quantity : 1,
        unit: it.unit,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice,
        searchQuery: it.searchQuery.trim().toLocaleLowerCase("tr-TR"),
      }))
    if (cleaned.length === 0) return
    onApprove({
      marketName: marketName.trim() ? marketName.trim() : null,
      purchaseDate: purchaseDate.trim() ? purchaseDate.trim() : null,
      totalAmount: ocr.totalAmount,
      items: cleaned,
      receiptImageUrl,
      receiptImageR2Key,
    })
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <span className="text-sm font-medium">Fişindeki Kalemler</span>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {readOnly ? (
            <Badge variant="secondary" className="text-[10px]">
              <CheckIcon className="mr-1 size-3" /> Onaylandı
            </Badge>
          ) : null}
        </div>
      </div>

      {!readOnly && (
        <div className="grid gap-2 border-b px-4 py-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Market
            <Input
              value={marketName}
              onChange={(e) => setMarketName(e.target.value)}
              placeholder="A101 / Migros..."
              className="h-8"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Tarih
            <Input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="h-8"
            />
          </label>
        </div>
      )}
      {readOnly && (
        <div className="flex flex-wrap items-center gap-3 border-b px-4 py-2 text-xs text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">
              {marketName || "—"}
            </span>{" "}
            · {purchaseDate || "tarih belirsiz"}
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow className="text-[11px] uppercase tracking-wide text-muted-foreground">
              <TableHead className="min-w-[140px]">Ürün</TableHead>
              <TableHead className="w-20">Adet</TableHead>
              <TableHead className="w-24">Birim</TableHead>
              <TableHead className="w-24 text-right">B. Fiyat</TableHead>
              <TableHead className="w-24 text-right">Tutar</TableHead>
              {!readOnly && <TableHead className="w-8" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={readOnly ? 5 : 6}
                  className="py-6 text-center text-sm text-muted-foreground"
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
                            searchQuery: e.target.value.toLocaleLowerCase("tr-TR"),
                          })
                        }
                        className="h-8 text-sm"
                      />
                    )}
                  </TableCell>
                  <TableCell>
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
                        className="h-8 w-16 text-sm tabular-nums"
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
                  <TableCell className="text-right tabular-nums">
                    {readOnly ? (
                      <span>{formatTL(it.unitPrice)}</span>
                    ) : (
                      <Input
                        type="number"
                        step="0.01"
                        value={it.unitPrice ?? ""}
                        onChange={(e) =>
                          updateItem(it._id, {
                            unitPrice:
                              e.target.value === ""
                                ? null
                                : parseFloat(e.target.value),
                          })
                        }
                        className="h-8 w-20 text-right text-sm tabular-nums"
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatTL(
                      it.totalPrice ??
                      (it.unitPrice != null
                        ? it.unitPrice * it.quantity
                        : null),
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
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4} className="text-right text-muted-foreground">
                Fiş toplamı
              </TableCell>
              <TableCell className="text-right text-base font-semibold text-foreground tabular-nums">
                {formatTL(ocr.totalAmount ?? totalReceipt)}
              </TableCell>
              {!readOnly && <TableCell />}
            </TableRow>
          </TableFooter>
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

function formatTL(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—"
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(n)
}

function formatQty(q: number) {
  return Number.isInteger(q) ? q.toString() : q.toFixed(2).replace(/\.?0+$/, "")
}
