"use client"

import * as React from "react"
import {
  RiAddLine,
  RiCheckLine,
  RiCloseLine,
  RiErrorWarningLine,
  RiStickyNoteAddLine,
} from "@remixicon/react"
import { Card, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
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
import { cn } from "@/lib/utils"

type EditableItem = {
  _id: string
  rawName: string
  searchQuery: string
  quantity: number
  unit: ParsedItem["unit"]
  /** Eşleştirmeye giden tercih ("konserve olmasın"); bkz. ParsedItemSchema.note. */
  note: string | null
}

export type BasketApprovalSubmit = {
  items: Array<{
    rawName: string
    searchQuery: string
    quantity: number
    unit: ParsedItem["unit"]
    note?: string | null
  }>
}

type Props = {
  // Kart yalnızca kalemleri okur; yemek görselinden gelen taslakta da aynı.
  data: Pick<BasketDraft, "items">
  alreadyApproved?: boolean
  approvedItems?: BasketApprovalSubmit["items"]
  onApprove?: (input: BasketApprovalSubmit) => void
  onCancel?: () => void
  /** Onaylanmamış kartı da kilitler, "Onaylandı" demeden (paylaşılan sayfa). */
  readOnly?: boolean
}

export function BasketApprovalCard({
  data,
  alreadyApproved,
  approvedItems,
  onApprove,
  onCancel,
  readOnly: forceReadOnly = false,
}: Props) {
  const [items, setItems] = React.useState<EditableItem[]>(() => {
    const source =
      alreadyApproved && approvedItems && approvedItems.length > 0
        ? approvedItems.map((it) => ({
            rawName: it.rawName,
            searchQuery: it.searchQuery,
            quantity: it.quantity,
            unit: it.unit,
            note: it.note?.trim() || null,
          }))
        : data.items.map((it) => ({
            rawName: it.name,
            searchQuery: it.searchQuery,
            quantity: it.quantity,
            unit: it.unit,
            note: it.note?.trim() || null,
          }))
    return source.map((it) => ({ _id: crypto.randomUUID(), ...it }))
  })

  const readOnly = !!alreadyApproved || forceReadOnly

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
        note: null,
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
        note: it.note?.trim() || null,
      }))
    if (cleaned.length === 0) return
    onApprove({ items: cleaned })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sepetindeki Kalemler</CardTitle>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {alreadyApproved ? (
            <Badge variant="secondary">Onaylandı</Badge>
          ) : null}
        </div>
      </CardHeader>

      <div className="overflow-x-auto">
        <Table className="w-full min-w-[300px] [&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4">
          <TableHeader>
            <TableRow className="text-[0.6875rem] uppercase tracking-wide text-muted-foreground">
              <TableHead className="w-auto">Ürün</TableHead>
              {/* Adet ve Birim sütunlarında sol dolgu pl-1: alanlar arası
                  boşluk her yerde 12px (sil sütunuyla aynı). w-16: "500" ve
                  "1000" kesilmeden sığar. */}
              <TableHead className="w-16 pl-1 text-right">Adet</TableHead>
              {/* w-20: seçici en uzun birime ("paket") göre daraltıldı, ok
                  yazının hemen sağında (bkz. seçicinin sınıfları). */}
              <TableHead className="w-20 pl-1">Birim</TableHead>
              {!readOnly && <TableHead className="w-4 pl-1" />}
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
                      // Not simgesi adın SONUNDA: başta olsaydı notlu ve notsuz
                      // satırların adları farklı yerden başlardı.
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium">{it.rawName}</span>
                        {it.note && (
                          <NoteButton
                            itemName={it.rawName}
                            note={it.note}
                            size="compact"
                          />
                        )}
                      </div>
                    ) : (
                      // Her satırda ad alanının soluna bitişik, aynı boyda kare
                      // bir not butonu: notlu satırda uyarı simgesi, notsuzda
                      // soluk "not ekle". Her satırda olduğu için ad alanları
                      // aynı hizadan başlar.
                      <ButtonGroup className="w-full">
                        <NoteButton
                          itemName={it.rawName}
                          note={it.note}
                          size="field"
                          onChange={(note) => updateItem(it._id, { note })}
                        />
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
                      </ButtonGroup>
                    )}
                  </TableCell>
                  <TableCell className="pl-1 text-right">
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
                        className="h-8 w-full px-2 text-right text-sm tabular-nums"
                      />
                    )}
                  </TableCell>
                  <TableCell className="pl-1">
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
                        // Varsayılan 32px'lik ok dolgusu tek harflik birimlerde
                        // bile alanı geniş tutuyordu. Küçük ok yazıya yakın.
                        className="h-8 w-full text-sm [&_select]:pr-[22px] [&_select]:pl-1.5 [&_svg]:right-1.5 [&_svg]:size-3.5"
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
                    // Görünen 16px, tıklama alanı 32px (hitArea). Sütun eskiden
                    // 28px'lik butonla satırın en geniş boşluğuydu; alan ad
                    // sütununa kaldı. Komşu seçiciye uzaklık 12px: alanlar
                    // çakışmaz.
                    <TableCell className="pl-1">
                      {/* Flex kapsayıcı: satır içi buton metnin taban çizgisine
                          oturup input'ların ortasından 2-3px yukarıda duruyordu. */}
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-2xs"
                          hitArea
                          onClick={() => removeItem(it._id)}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label={
                            it.rawName ? `${it.rawName} kalemini sil` : "Kalemi sil"
                          }
                        >
                          <RiCloseLine />
                        </Button>
                      </div>
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

/**
 * Kalemin tercih notu ("konserve olmasın"). Not aramaya girmez, eşleştirmede
 * ürün seçerken uyulur; kullanıcı onaylamadan önce görebilsin, ekleyip
 * düzeltebilsin diye. `onChange` yoksa yalnızca okunur (onaylanmış kart).
 */
function NoteButton({
  itemName,
  note,
  size,
  onChange,
}: {
  itemName: string
  note: string | null
  /** "field": yanındaki 32px'lik input ile aynı; "compact": salt okunur satır. */
  size: "field" | "compact"
  onChange?: (note: string | null) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState(note ?? "")
  const Icon = note ? RiErrorWarningLine : RiStickyNoteAddLine

  function commit() {
    if (!onChange) return
    const next = draft.trim()
    onChange(next ? next.slice(0, 200) : null)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        // Kapanırken düzenlenen not kaydedilir; açılırken güncel nottan başlar.
        if (next) setDraft(note ?? "")
        else commit()
        setOpen(next)
      }}
    >
      <PopoverTrigger asChild>
        {/* Buton değil input'un yüzeyini taşır: kabarık buton yüzeyinin dış
            halkası ve gölgesi onu bitişik input'tan büyük gösteriyordu. Aynı
            çerçeve, aynı yükseklik; ikisi tek bir alan gibi okunur. */}
        <button
          type="button"
          aria-label={
            note ? `${itemName} notu: ${note}` : `${itemName} için not ekle`
          }
          className={cn(
            "surface-inset surface-well-fill flex shrink-0 items-center justify-center rounded-lg border border-input bg-transparent transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
            note
              ? "text-amber-600 dark:text-amber-400"
              : "text-muted-foreground/70 hover:text-muted-foreground",
            size === "field" ? "size-8" : "size-6",
          )}
        >
          <Icon
            aria-hidden="true"
            className={size === "field" ? "size-4" : "size-3.5"}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-64"
        // Notu olan satırda panel çoğu zaman görmek için açılır: odak input'a
        // gidip notu seçili getirince ilk tuş notu siliyor, telefonda klavye
        // açılıyordu. Not eklerken ise doğrudan yazılabilsin.
        onOpenAutoFocus={(e) => {
          if (note) e.preventDefault()
        }}
      >
        <PopoverHeader>
          <PopoverTitle>{note ? "Not" : "Not ekle"}</PopoverTitle>
          <PopoverDescription className="text-xs">
            Ürün seçilirken buna dikkat edilir.
          </PopoverDescription>
        </PopoverHeader>
        {onChange ? (
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                commit()
                setOpen(false)
              }
            }}
            maxLength={200}
            placeholder="Ör. konserve olmasın"
            aria-label={`${itemName} notu`}
            className="h-8 text-sm"
          />
        ) : (
          <p className="text-sm">{note}</p>
        )}
        {onChange && note && (
          // Kartlardaki alt şeridin aynısı: panelin dolgusuna (p-2.5) taşıp
          // kenardan kenara uzanır, eylem sağda.
          <div className="-mx-2.5 -mb-2.5 flex justify-end rounded-b-lg border-t bg-muted/30 px-2.5 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => {
                onChange(null)
                setOpen(false)
              }}
            >
              Notu kaldır
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

function formatQty(q: number) {
  return Number.isInteger(q) ? q.toString() : q.toFixed(2).replace(/\.?0+$/, "")
}
