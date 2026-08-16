"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { AlertCircleIcon, ImageIcon, SearchIcon } from "lucide-react"

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
} from "@/components/ui/responsive-dialog"
import { ProductDetailPanel } from "@/components/product-detail-panel"
import { MarketCell } from "@/components/market-cell"
import { DepotInfo } from "@/components/assistant/depot-info"
import { formatTL } from "@/lib/format"
import { cn } from "@/lib/utils"

export type RecordItemView = {
  id: string
  rawName: string
  quantity: number
  unit: string
  matchedName: string | null
  matchedBrand: string | null
  matchedImageUrl: string | null
  matchedProductId: string | null
  searchQuery: string | null
  /** null = eski kayıt, durum bilinmiyor. */
  matched: boolean
  /**
   * Kalemin SEÇİLİ PLANDAKİ satırı. Kalem satırının kendi "en iyi fiyat"ı
   * yoktur — bir kalemin fiyatı plana bağlıdır (tek markette başka,
   * kombinasyonda başka). Plan yoksa fiyat hiç gösterilmez, uydurulmaz.
   */
  plan: {
    market: string
    unitPrice: number
    packs: number
    lineTotal: number
    depotName: string | null
    sizeMismatch: boolean
  } | null
  /** Fiş kalemlerinde fişteki tutar; sepette null. */
  receiptTotal?: number | null
  savings?: number | null
}

export function RecordItemList({
  items,
  emptyHint = "Bu kayıtta kalem yok.",
}: {
  items: RecordItemView[]
  emptyHint?: string
}) {
  const [openProductId, setOpenProductId] = React.useState<string | null>(null)

  if (items.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyHint}
      </div>
    )
  }

  return (
    <>
      <ul className="divide-y">
        {items.map((it) => (
          <RecordItemRow key={it.id} item={it} onOpen={setOpenProductId} />
        ))}
      </ul>

      <ResponsiveDialog
        open={openProductId !== null}
        onOpenChange={(open) => {
          if (!open) setOpenProductId(null)
        }}
      >
        <ResponsiveDialogContent>
          {openProductId && <ProductDetailPanel productId={openProductId} />}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  )
}

function RecordItemRow({
  item,
  onOpen,
}: {
  item: RecordItemView
  onOpen: (productId: string) => void
}) {
  const qtyLabel = `${formatQuantity(item.quantity)} ${item.unit}`
  const secondary = [item.matchedBrand, item.matchedName]
    .filter(Boolean)
    .join(" · ")

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <Thumb url={item.matchedImageUrl} />

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {item.matchedProductId ? (
            // Kalem adı artık canlı ürün panelini açıyor: fotoğraf, marka,
            // kategori, TÜM market fiyatları, şube bilgisi ve fiyat kademesi.
            // Panel donmuş snapshot'ı değil bugünkü fiyatı gösterir.
            <button
              type="button"
              onClick={() => onOpen(item.matchedProductId!)}
              className="relative text-left text-sm font-medium break-words underline-offset-4 hover:underline after:absolute after:-inset-y-1.5 after:inset-x-0 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {item.rawName}
            </button>
          ) : (
            <span className="text-sm font-medium break-words">
              {item.rawName}
            </span>
          )}

          {item.plan?.sizeMismatch && (
            <span className="inline-flex shrink-0 items-center gap-1 text-[0.625rem] text-amber-600 dark:text-amber-400">
              <AlertCircleIcon className="size-2.5" />
              Farklı Boyut
            </span>
          )}
        </div>

        {secondary && (
          <div className="text-[0.6875rem] text-muted-foreground break-words">
            {secondary}
          </div>
        )}

        {!item.matched && (
          // İki tire, "veri yok" ile "bu ürün bulunamadı"yı aynı şeye
          // indiriyordu: gerekçe yok, aksiyon yok. Artık ikisi ayrı ve
          // eşleşmeyen kalem bir çıkış yolu sunuyor.
          <div className="flex flex-wrap items-center gap-2 text-[0.6875rem]">
            <span className="text-amber-600 dark:text-amber-400">
              Eşleşme bulunamadı
            </span>
            {item.searchQuery && (
              <Link
                href={`/urun-ara?q=${encodeURIComponent(item.searchQuery)}`}
                className="inline-flex items-center gap-1 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                <SearchIcon className="size-3" />
                Kendin ara
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 space-y-1 text-right">
        <div className="text-[0.6875rem] text-muted-foreground tabular-nums">
          {qtyLabel}
        </div>

        {item.plan ? (
          <>
            <div className="flex items-center justify-end gap-1">
              <MarketCell
                name={item.plan.market}
                size="sm"
                clickable={false}
                showExternalIcon={false}
              />
              <DepotInfo
                depotName={item.plan.depotName}
                market={item.plan.market}
              />
            </div>
            <div className="text-sm font-medium tabular-nums">
              {formatTL(item.plan.lineTotal)}
            </div>
            {item.plan.packs > 1 && (
              <div className="text-[0.625rem] text-muted-foreground tabular-nums">
                {item.plan.packs}× · {formatTL(item.plan.unitPrice)}/paket
              </div>
            )}
          </>
        ) : item.receiptTotal != null ? (
          <div className="text-sm font-medium tabular-nums">
            {formatTL(item.receiptTotal)}
          </div>
        ) : null}

        {item.savings != null && item.savings > 0 && (
          // Rozet değil düz metin: satırdaki diğer sayılarla aynı hizada okunsun,
          // vurgu renkten gelsin. Bkz. RecordInfoList'teki aynı karar.
          <div className="text-xs font-medium text-emerald-700 tabular-nums dark:text-emerald-300">
            −{formatTL(item.savings)}
          </div>
        )}
      </div>
    </li>
  )
}

function Thumb({ url }: { url: string | null }) {
  const base =
    "relative size-10 shrink-0 overflow-hidden rounded-md bg-muted outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
  if (!url) {
    return (
      <div
        className={cn(
          base,
          "flex items-center justify-center text-muted-foreground",
        )}
        aria-hidden
      >
        <ImageIcon className="size-4" />
      </div>
    )
  }
  return (
    <div className={base}>
      <Image src={url} alt="" fill sizes="40px" className="object-cover" unoptimized />
    </div>
  )
}

function formatQuantity(q: number): string {
  return Number.isInteger(q) ? q.toString() : q.toFixed(2).replace(/\.?0+$/, "")
}
