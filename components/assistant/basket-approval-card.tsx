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
import { StatusChip } from "@/components/ui/status-chip"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
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
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"
import {
  MAX_APPROVAL_ITEMS,
  MAX_ITEM_NAME,
} from "@/lib/assistant/approval-limits"

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
  // Dokunmatikte not, kalemin altında açılan bir satırda düzenlenir (bkz.
  // NoteRow). Açık olan kalem ve taslak burada: satırı kapatan her yol
  // (not butonu, Enter, dışarı dokunma) taslağı aynı yerden kaydeder.
  const touch = useMediaQuery("(pointer: coarse)")
  const [noteEdit, setNoteEdit] = React.useState<{
    id: string
    draft: string
  } | null>(null)

  function closeNote(save: boolean) {
    if (!noteEdit) return
    if (save) {
      const next = noteEdit.draft.trim()
      updateItem(noteEdit.id, { note: next ? next.slice(0, 200) : null })
    }
    setNoteEdit(null)
  }
  function toggleNote(it: EditableItem) {
    if (noteEdit?.id === it._id) {
      closeNote(true)
      return
    }
    closeNote(true)
    setNoteEdit({ id: it._id, draft: it.note ?? "" })
  }

  function updateItem(id: string, patch: Partial<EditableItem>) {
    setItems((arr) =>
      arr.map((it) => (it._id === id ? { ...it, ...patch } : it)),
    )
  }
  function removeItem(id: string) {
    setItems((arr) => arr.filter((it) => it._id !== id))
    if (noteEdit?.id === id) setNoteEdit(null)
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
          {alreadyApproved ? <StatusChip status="approved" /> : null}
        </div>
      </CardHeader>

      <div className="overflow-x-auto">
        <Table className="w-full min-w-[300px] [&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4">
          <TableHeader>
            {/* Büyük harf metinde yazılı, CSS `uppercase` ile değil: bazı
                tarayıcılar onu Türkçe kurala göre yapmıyor ("BIRIM").
                Başlık şeridi hafif tonda, satırların hepsi düz: sıra sıra
                koyu satır bu kısa listede gereksiz kalabalıktı. Şerit
                satırlardan belirgin alçak (28px, 10px yazı). */}
            <TableRow className="table-head-soft text-[0.625rem] tracking-wide hover:bg-transparent [&_th]:h-7 [&_th]:font-medium [&_th]:text-muted-foreground">
              <TableHead className="w-auto">ÜRÜN</TableHead>
              {/* Adet ve Birim sütunlarında sol dolgu pl-1: alanlar arası
                  boşluk her yerde 12px (sil sütunuyla aynı). w-16: "500" ve
                  "1000" kesilmeden sığar. */}
              <TableHead className="w-16 pl-1 text-right">ADET</TableHead>
              {/* w-20: seçici en uzun birime ("paket") göre daraltıldı, ok
                  yazının hemen sağında (bkz. seçicinin sınıfları). */}
              <TableHead className="w-20 pl-1">BİRİM</TableHead>
              {!readOnly && <TableHead className="w-9 pl-1" />}
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
              items.map((it) => {
                const noteOpen = !readOnly && noteEdit?.id === it._id
                return (
                  <React.Fragment key={it._id}>
                    <TableRow
                      className={cn(
                        // Not açıkken satırı koyulaştıran varsayılan vurgu
                        // (has-aria-expanded) kapalı: kalem ve altındaki not
                        // satırı aynı tonda kalsın.
                        "hover:bg-transparent has-aria-expanded:bg-transparent",
                        // Altında not satırı açıkken ikisi tek parça okunsun.
                        noteOpen && "border-b-0",
                      )}
                    >
                      <TableCell className="align-top">
                        {readOnly ? (
                          // Not simgesi adın SOLUNDA, diğer satırların adlarıyla
                          // aynı hizada; yalnız notlu satırın adı sağa kayar.
                          <div className="flex items-center gap-1.5">
                            {it.note ? (
                              <NoteButton
                                itemName={it.rawName}
                                note={it.note}
                                size="compact"
                              />
                            ) : null}
                            <span className="text-sm font-medium">{it.rawName}</span>
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
                              inline={
                                touch
                                  ? {
                                      expanded: noteOpen,
                                      onToggle: () => toggleNote(it),
                                    }
                                  : undefined
                              }
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
                              maxLength={MAX_ITEM_NAME}
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
                        // Sil butonu solundaki alanlarla aynı boyda (32px): daha
                        // küçük buton satırda alanların yanında cılız duruyordu.
                        // Komşu seçiciye uzaklık 12px.
                        <TableCell className="pl-1">
                          {/* Flex kapsayıcı: satır içi buton metnin taban çizgisine
                              oturup input'ların ortasından 2-3px yukarıda duruyordu. */}
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={() => removeItem(it._id)}
                              aria-label={
                                it.rawName ? `${it.rawName} kalemini sil` : "Kalemi sil"
                              }
                            >
                              <RiCloseLine className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                    {noteOpen && noteEdit ? (
                      <NoteRow
                        itemName={it.rawName}
                        hadNote={!!it.note}
                        draft={noteEdit.draft}
                        onDraftChange={(draft) =>
                          setNoteEdit({ id: it._id, draft })
                        }
                        onClose={closeNote}
                        onRemove={() => {
                          updateItem(it._id, { note: null })
                          setNoteEdit(null)
                        }}
                      />
                    ) : null}
                  </React.Fragment>
                )
              })
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
            // Sunucunun kalem tavanı (bkz. lib/assistant/approval-limits.ts).
            disabled={items.length >= MAX_APPROVAL_ITEMS}
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
 *
 * `inline` verilirse (dokunmatik) buton panel açmaz, kalemin altındaki not
 * satırını açıp kapatır (bkz. NoteRow).
 */
function NoteButton({
  itemName,
  note,
  size,
  onChange,
  inline,
}: {
  itemName: string
  note: string | null
  /** "field": yanındaki 32px'lik input ile aynı; "compact": salt okunur satır. */
  size: "field" | "compact"
  onChange?: (note: string | null) => void
  inline?: { expanded: boolean; onToggle: () => void }
}) {
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState(note ?? "")
  const Icon = note ? RiErrorWarningLine : RiStickyNoteAddLine

  function commit() {
    if (!onChange) return
    const next = draft.trim()
    onChange(next ? next.slice(0, 200) : null)
  }

  const trigger = (
    // Buton değil input'un yüzeyini taşır: kabarık buton yüzeyinin dış
    // halkası ve gölgesi onu bitişik input'tan büyük gösteriyordu. Aynı
    // çerçeve, aynı yükseklik; ikisi tek bir alan gibi okunur.
    <button
      type="button"
      aria-label={
        note ? `${itemName} notu: ${note}` : `${itemName} için not ekle`
      }
      aria-expanded={inline ? inline.expanded : undefined}
      onClick={inline ? inline.onToggle : undefined}
      className={cn(
        "flex shrink-0 items-center justify-center transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        size === "field"
          ? "surface-inset surface-well-fill size-8 rounded-lg border border-input bg-transparent focus-visible:border-ring dark:bg-input/30"
          : // Salt okunur satırda çerçevesiz, küçük ve renkli zeminli: ad
            // alanına bitişik input yüzeyi yok, kabarık kutu satırda iri
            // duruyordu.
            "size-5 rounded-md bg-amber-500/12 dark:bg-amber-400/12",
        note
          ? "text-amber-600 dark:text-amber-400"
          : "text-muted-foreground/70 hover:text-muted-foreground",
        inline?.expanded && "text-foreground",
      )}
    >
      <Icon
        aria-hidden="true"
        className={size === "field" ? "size-4" : "size-3"}
      />
    </button>
  )

  if (onChange && inline) return trigger

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
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-64"
        // Notu olan satırda panel çoğu zaman görmek için açılır: odak input'a
        // gidip notu seçili getirince ilk tuş notu siliyordu. Not eklerken
        // ise doğrudan yazılabilsin.
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

/**
 * Dokunmatikte kalemin notu, kalemin hemen altında tam genişlikte bir satırda.
 * Satıra bağlı bir panel klavyenin arkasında kalıyordu: kart çoğu zaman
 * sohbetin dibinde, mesaj kutusunun üstünde duruyor; klavye açılınca panel
 * görünmez oluyordu. Not satırı sohbetin içinde: klavye açılınca sohbet onu
 * mesaj kutusunun üstüne kaydırır. Yeni notta input'a odaklanılır; var olan
 * not görmek için açılır, klavye kendiliğinden çıkmaz.
 *
 * Ölçüler kalemin satırıyla aynı: kenarlar ad alanı ve sil butonuyla hizalı,
 * yükseklik 32px. Üstündeki ve altındaki alanlara uzaklık satırlar arasındaki
 * boşlukla aynı (16px): yalnız iç boşluk (8px) bırakılınca kalemin alanlarına
 * yapışık, sıkışık duruyordu.
 *
 * Kaydetme: input'taki ✓, Enter, not butonuna yeniden dokunmak ya da satırın
 * dışına dokunmak. Escape vazgeçer, input'taki × notu kaldırır.
 */
function NoteRow({
  itemName,
  hadNote,
  draft,
  onDraftChange,
  onClose,
  onRemove,
}: {
  itemName: string
  hadNote: boolean
  draft: string
  onDraftChange: (draft: string) => void
  onClose: (save: boolean) => void
  onRemove: () => void
}) {
  const rowRef = React.useRef<HTMLTableRowElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useLayoutEffect(() => {
    if (!hadNote) inputRef.current?.focus()
    // Yalnız açılışta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Klavye açılınca ekran küçülür; not yazılırken input görünür alanda
  // kalsın (sohbetin kaydırma alanı mesaj kutusunun üstünde bitiyor).
  React.useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const onResize = () => {
      if (inputRef.current && document.activeElement === inputRef.current) {
        // Satırın tamamı: altındaki açıklama da mesaj kutusunun arkasında kalmasın.
        rowRef.current?.scrollIntoView({ block: "nearest" })
      }
    }
    viewport.addEventListener("resize", onResize)
    return () => viewport.removeEventListener("resize", onResize)
  }, [])

  // Satırın ve kalemin (not butonu orada) dışına dokunmak kaydedip kapatır.
  React.useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const row = rowRef.current
      const target = e.target as Node
      if (row?.contains(target) || row?.previousElementSibling?.contains(target)) {
        return
      }
      onClose(true)
    }
    document.addEventListener("pointerdown", onPointerDown, true)
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true)
  }, [onClose])

  return (
    <TableRow ref={rowRef} className="hover:bg-transparent">
      <TableCell colSpan={4}>
        <InputGroup>
          <InputGroupInput
            ref={inputRef}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault()
                onClose(true)
              } else if (e.key === "Escape") {
                e.preventDefault()
                onClose(false)
              }
            }}
            maxLength={200}
            placeholder="Not ekle, ör. konserve olmasın"
            aria-label={`${itemName} notu`}
            enterKeyHint="done"
            className="text-sm"
          />
          {/* Sağ uçta iki küçük buton: × notu kaldırır, ana renkteki ✓
              kaydeder (kaydedildiğinden emin olunsun diye açık bir eylem). */}
          <InputGroupAddon align="inline-end">
            {hadNote || draft ? (
              <InputGroupButton
                size="icon-xs"
                aria-label="Notu kaldır"
                onClick={onRemove}
              >
                <RiCloseLine />
              </InputGroupButton>
            ) : null}
            <InputGroupButton
              variant="default"
              size="icon-xs"
              aria-label="Notu kaydet"
              onClick={() => onClose(true)}
            >
              <RiCheckLine />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </TableCell>
    </TableRow>
  )
}

function formatQty(q: number) {
  return Number.isInteger(q) ? q.toString() : q.toFixed(2).replace(/\.?0+$/, "")
}
