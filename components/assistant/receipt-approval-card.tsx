"use client"

import * as React from "react"
import { RiAddLine, RiCheckLine, RiCloseLine } from "@remixicon/react"
import { Card, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { StatusChip } from "@/components/ui/status-chip"
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
import { stripQuantityTokens } from "@/lib/ai/normalize"
import { MarketLogo } from "@/components/market-logo"
import { formatTLOrDash } from "@/lib/format"
import { cn } from "@/lib/utils"

type EditableItem = ReceiptOCRItem & { _id: string }

// Dar ekranda (<sm) tablo yatay kaydırma yerine kalem başına iki satırlı bir
// bloğa döner: üstte ürün adı, altta küçük başlıklı adet / birim / fiyat /
// tutar. 600px'lik tablo 390px'lik ekranda fiyat, tutar ve sil sütunlarını
// hiçbir ipucu vermeden görünmez kılıyordu. Başlıklar `data-label`dan gelir;
// masaüstünde tablo başlığı aynı işi görür.
const STACK_TABLE =
  "max-sm:block max-sm:[&_tbody]:block max-sm:[&_tfoot]:block max-sm:[&_td]:p-0!"
const STACK_ROW =
  "max-sm:grid max-sm:items-end max-sm:gap-x-2 max-sm:gap-y-2 max-sm:px-4 max-sm:py-3"
const STACK_CELL =
  "max-sm:flex max-sm:min-w-0 max-sm:flex-col max-sm:gap-1 max-sm:text-left max-sm:before:text-[0.625rem] max-sm:before:font-medium max-sm:before:tracking-wide max-sm:before:text-muted-foreground max-sm:before:content-[attr(data-label)]"

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
  /** Onaylanmamış kartı da kilitler, "Onaylandı" demeden (paylaşılan sayfa). */
  readOnly?: boolean
}

export function ReceiptApprovalCard({
  data,
  alreadyApproved,
  onApprove,
  onCancel,
  readOnly: forceReadOnly = false,
}: Props) {
  const { ocr, receiptImageUrl, receiptImageR2Key } = data

  const [marketName, setMarketName] = React.useState(ocr.marketName ?? "")
  const [purchaseDate, setPurchaseDate] = React.useState(
    ocr.purchaseDate ?? "",
  )
  const [items, setItems] = React.useState<EditableItem[]>(() =>
    ocr.items.map((it) => ({ ...it, _id: crypto.randomUUID() })),
  )

  const readOnly = !!alreadyApproved || forceReadOnly

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
  function addItem() {
    setItems((arr) => [
      ...arr,
      {
        _id: crypto.randomUUID(),
        rawName: "",
        searchQuery: "",
        quantity: 1,
        unit: "adet",
        unitPrice: null,
        totalPrice: null,
      },
    ])
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
    <Card>
      <CardHeader>
        <CardTitle>Fişindeki Kalemler</CardTitle>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {alreadyApproved ? <StatusChip status="approved" /> : null}
        </div>
      </CardHeader>

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
      <div className="overflow-x-auto">
        <Table className={cn("sm:min-w-[600px] [&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4", STACK_TABLE)}>
          <TableHeader className="max-sm:hidden">
            {/* Büyük harf metinde (ve data-label'larda) yazılı, CSS
                `uppercase` ile değil: bazı tarayıcılar onu Türkçe kurala göre
                yapmıyor ("BIRIM"). */}
            <TableRow className="text-[0.6875rem] tracking-wide text-muted-foreground">
              <TableHead className="min-w-[140px]">ÜRÜN</TableHead>
              <TableHead className="w-20 text-right">ADET</TableHead>
              <TableHead className="w-24">BİRİM</TableHead>
              <TableHead className="w-24 text-right">B. FİYAT</TableHead>
              <TableHead className="w-24 text-right">TUTAR</TableHead>
              {!readOnly && <TableHead className="w-8" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={readOnly ? 5 : 6}
                  className="py-6 text-center text-xs text-muted-foreground"
                >
                  Hiç kalem kalmadı.
                </TableCell>
              </TableRow>
            ) : (
              items.map((it) => (
                <TableRow
                  key={it._id}
                  className={cn(
                    STACK_ROW,
                    // Üst satır: ürün adı + sil. Alt satır: adet, birim, fiyat,
                    // tutar. Birim 5rem: seçicinin ok dolgusundan sonra
                    // "paket"e yer kalsın (eşit bölünce "ad…" oluyordu).
                    // Salt okunurda değerlerin yüksekliği farklı; alta
                    // hizalanınca başlıklar basamak basamak duruyordu.
                    readOnly
                      ? "max-sm:grid-cols-[3rem_5rem_minmax(0,1fr)_minmax(0,1fr)] max-sm:items-start"
                      : "max-sm:grid-cols-[3rem_5rem_minmax(0,1fr)_minmax(0,1fr)_auto]",
                  )}
                >
                  <TableCell
                    className={cn(
                      "align-top",
                      readOnly
                        ? "max-sm:col-span-full"
                        : "max-sm:col-span-4 max-sm:row-start-1",
                    )}
                  >
                    {readOnly ? (
                      <div className="text-sm font-medium">{it.rawName}</div>
                    ) : (
                      <Input
                        value={it.rawName}
                        onChange={(e) =>
                          updateItem(it._id, {
                            rawName: e.target.value,
                            // searchQuery'den miktar/birim ayıkla — API aramasını
                            // "pepsi 2.5 lt" gibi bozuk sorgularla kirletme.
                            searchQuery: stripQuantityTokens(e.target.value),
                          })
                        }
                        aria-label="Ürün adı"
                        className="h-8 text-sm"
                      />
                    )}
                  </TableCell>
                  <TableCell
                    data-label="ADET"
                    className={cn("text-right", STACK_CELL)}
                  >
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
                  <TableCell data-label="BİRİM" className={STACK_CELL}>
                    {readOnly ? (
                      <span className="text-xs text-muted-foreground max-sm:text-sm">
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
                  <TableCell
                    data-label="B. FİYAT"
                    className={cn("text-right tabular-nums", STACK_CELL)}
                  >
                    {readOnly ? (
                      <span>{formatTLOrDash(it.unitPrice)}</span>
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
                        aria-label="Birim fiyat"
                        className="h-8 w-full text-right text-sm tabular-nums"
                      />
                    )}
                  </TableCell>
                  <TableCell
                    data-label="TUTAR"
                    className={cn(
                      "text-right tabular-nums",
                      STACK_CELL,
                      !readOnly && "max-sm:col-span-2",
                    )}
                  >
                    <span
                      className={cn(
                        !readOnly && "max-sm:flex max-sm:h-8 max-sm:items-center",
                      )}
                    >
                      {formatTLOrDash(
                        it.totalPrice ??
                        (it.unitPrice != null
                          ? it.unitPrice * it.quantity
                          : null),
                      )}
                    </span>
                  </TableCell>
                  {!readOnly && (
                    <TableCell className="text-right max-sm:col-start-5 max-sm:row-start-1 max-sm:self-center">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon-sm"
                        onClick={() => removeItem(it._id)}
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
          <TableFooter>
            <TableRow className="max-sm:flex max-sm:items-center max-sm:gap-2 max-sm:px-4 max-sm:py-2.5">
              <TableCell colSpan={4} className="text-muted-foreground max-sm:flex-1">
                <div className="flex items-center gap-2">
                  {readOnly && (
                    <span className="flex items-center gap-1.5 text-xs">
                      {marketName && <MarketLogo name={marketName} size="sm" />}
                      <span className="font-medium text-foreground">
                        {marketName || "—"}
                      </span>
                      {" · "}
                      {purchaseDate || "tarih belirsiz"}
                    </span>
                  )}
                  <span className="ml-auto text-xs font-semibold">
                    FİŞ TOPLAMI
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right text-sm font-semibold text-foreground tabular-nums">
                {formatTLOrDash(ocr.totalAmount ?? totalReceipt)}
              </TableCell>
              {!readOnly && <TableCell className="max-sm:hidden" />}
            </TableRow>
          </TableFooter>
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
