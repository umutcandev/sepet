"use client"

import * as React from "react"
import Link from "next/link"

import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

/**
 * Sepetlerim / Fişlerim listelerinin satır kartı.
 *
 * Yerleşim Vercel'in deployment kartından alındı; oradaki asıl fikir kolon
 * saymak değil, ŞU ÜÇ KURAL:
 *
 *  1. İki bant. Üstte kimlik + taranacak sayı, altta sessiz zeminde metadata.
 *     Alt bandın işi geri çekilmek, o yüzden ayrı zemin + saç teli çizgi.
 *  2. Her bantta TEK esneyen öğe var; kalan her şey `shrink-0`. Esneyen öğe
 *     `min-w-0` zinciriyle taşımayı kendi içinde çözer. Altı kolonun hepsini
 *     esnetmek, tabloyu yatay kaydırmaya iten şeyin ta kendisiydi.
 *  3. Sağ grup `ml-auto` + `shrink-0` ile çivilenir — satırdan satıra aynı
 *     düşey şeritte durur ve dar ekranda ezilmez.
 *
 * Böylece tek bir kart hem telefonda hem masaüstünde çalışıyor: `md:hidden` /
 * `hidden md:block` diye iki ayrı liste yazmaya (ve ikisini ayrı ayrı bakımda
 * tutmaya) gerek kalmıyor.
 */
export function RecordListCard({
  href,
  title,
  primary,
  meta,
  metaTrailing,
  actions,
  selecting,
  selected,
  selectLabel,
  onToggleSelect,
}: {
  href: string
  title: string
  /** Üst bandın sağı: taranacak sayı (tutar, tasarruf). */
  primary?: React.ReactNode
  /** Alt bandın solu: esneyen, gerekirse kırpılan metadata grubu. */
  meta?: React.ReactNode
  /** Alt bandın sağı: tarih gibi sabit genişlikli sessiz bilgi. */
  metaTrailing?: React.ReactNode
  /** Satır aksiyon menüsü (⋯). Link overlay'inin üstünde kalır. */
  actions?: React.ReactNode
  selecting: boolean
  selected: boolean
  selectLabel: string
  onToggleSelect: () => void
}) {
  return (
    <li
      onClick={selecting ? onToggleSelect : undefined}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card transition-colors",
        // Odak halkası karta ait: başlık linkine verilseydi `overflow-hidden`
        // tarafından kırpılırdı. Outline kendi kutusunun overflow'undan
        // etkilenmez, o yüzden kartın üstünde tam görünür.
        "has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring",
        selecting
          ? cn("cursor-pointer", selected && "bg-secondary/40")
          : "hover:border-foreground/20",
      )}
    >
      {/* ── Üst bant ── */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {selecting ? (
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            aria-label={selectLabel}
            className="shrink-0"
          />
        ) : null}

        <div className="min-w-0 flex-1">
          {selecting ? (
            <span className="block truncate text-sm font-medium">{title}</span>
          ) : (
            <Link
              href={href}
              className="block truncate text-sm font-medium outline-none after:absolute after:inset-0"
            >
              {title}
            </Link>
          )}
        </div>

        {primary ? (
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {primary}
          </div>
        ) : null}
      </div>

      {/* ── Alt bant ── */}
      {/* `min-h-9`: seçim moduna girince ⋯ (24px) kaybolup bant yalnız metin
          yüksekliğine düşüyordu — bütün liste 8px zıplıyordu. */}
      <div className="flex min-h-9 items-center gap-2 border-t bg-muted/40 py-1.5 pr-2 pl-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-xs text-muted-foreground">
          {meta}
        </div>
        <div className="relative z-10 ml-auto flex shrink-0 items-center gap-1">
          {metaTrailing ? (
            <span className="text-xs text-muted-foreground tabular-nums">
              {metaTrailing}
            </span>
          ) : null}
          {selecting ? null : actions}
        </div>
      </div>
    </li>
  )
}

/** Alt banttaki iki metadata grubunu ayıran sessiz nokta. */
export function RecordListDot() {
  return (
    <span aria-hidden className="shrink-0 text-muted-foreground/50">
      ·
    </span>
  )
}
