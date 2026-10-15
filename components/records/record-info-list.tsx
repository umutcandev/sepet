import * as React from "react"

import { cn } from "@/lib/utils"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * Anahtar–değer bilgi kartı.
 *
 * "Sepet Bilgisi" / "Fiş Bilgisi" kartları aslında birer anahtar–değer listesi
 * ama <Table> ile kurulmuştu: TableCell `whitespace-nowrap` taşıyor, Table ise
 * kendini `overflow-x-auto` bir kutuya sarıyor. Dar ekranda satırlar kırılamıyor,
 * kutu yatay kayıyor ve değerler ekranın sağında kesiliyordu ("08 Ağustos 2026
 * 17:", "Şok ₺137", "₺20,5"). <dl> + flex satır: etiket solda, değer sağda,
 * değer sarılabilir. Tablo gerçekten çok kolonlu veri içindir.
 *
 * Ritim ve hiyerarşi ana sayfadaki fiyatlandırma tablosuyla aynı kuralda:
 *   · her satır aynı yükseklikte ve aynı kompakt padding'te (ROW),
 *   · etiket sessiz (`text-muted-foreground`), değer baskın
 *     (`font-medium text-foreground`) — ikisi de başlıkla aynı puntoda,
 *   · satıra özel büyük harf / harf aralığı / metin rengi denemesi yok.
 */

// Tek düze satır ritmi. `min-h-10` logo taşıyan satırların (MarketCell) diğer
// satırlardan uzun görünmesini engeller.
const ROW = "flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2"

export function RecordInfoList({
  title,
  headerRight,
  children,
  className,
}: {
  title: string
  /**
   * Başlığın en sağındaki tek vurgu (ör. tasarruf tutarı). Tasarruf kendi
   * satırında "etiket + rozet" olarak durduğunda listenin düz ritmini bozuyor ve
   * diğer satırlardan farklı bir renk/biçim taşıyordu; kartın tepesinde tek
   * başına bir rozet olarak ise okunacak TEK sayı olduğu belli oluyor.
   */
  headerRight?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {headerRight ? <div className="ml-auto">{headerRight}</div> : null}
      </CardHeader>
      <dl className="divide-y">{children}</dl>
    </Card>
  )
}

export function RecordInfoRow({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn(ROW, className)}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 max-w-full text-right text-sm font-medium text-foreground break-words">
        {children}
      </dd>
    </div>
  )
}

/**
 * Etiketsiz, tam genişlik satır (uyarı/not metinleri için).
 *
 * Görünürde etiketi yok ama `<dl>` içinde `<dt>`siz bir `<dd>` geçersiz — terim
 * yalnızca ekrandan gizlenir, ağaçtan değil.
 */
export function RecordInfoNote({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("px-4 py-2.5", className)}>
      <dt className="sr-only">Not</dt>
      <dd className="text-xs text-muted-foreground">{children}</dd>
    </div>
  )
}
