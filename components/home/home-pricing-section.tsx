"use client"

// Ana sayfa fiyatlandırma bölümü — footer'ın hemen üstünde durur.
// Ayarlar panelindeki iki ayrı kart yerine burada tek bir karşılaştırma
// tablosu var: satırlar özellik, sütunlar plan. Tablo hem daha az dikey yer
// kaplıyor hem de Ücretsiz↔Pro farkını satır satır okunur kılıyor.
//
// Kap ölçüleri footer ve blog bölümüyle birebir aynıdır (max-w-5xl px-4) ki
// tablo footer sütunlarıyla aynı hizaya otursun. Zemin de blog bölümüyle
// aynı --home-base; iç sarmalayıcıdaki `dark` metin/kart paletini koyu tutar
// (section'a sabitlenmez, yoksa değişken gece değerine kilitlenirdi).

import * as React from "react"
import Link from "next/link"
import { RiCheckLine, RiInfinityLine } from "@remixicon/react"

import {
  AnimatedAmount,
  BillingToggle,
  MONTHLY_PRICE,
  PolarIcon,
  YEARLY_PRICE,
  type Interval,
} from "@/components/subscription/plan-cards"
import { SubscriptionFaqList } from "@/components/subscription/subscription-faq"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Squircle } from "@/components/ui/squircle"
import { useRequireAuth } from "@/lib/hooks/use-require-auth"
import { cn } from "@/lib/utils"

// Karşılaştırma satırları. `true` = plana dahil (tik), UNLIMITED = sonsuzluk
// ikonu, metin = değer/limit. Sayısal limitler lib/usage/limits.ts'teki
// PLAN_LIMITS ile hizalıdır; orada değişirse buradaki vitrin metni de
// güncellenmelidir.
const UNLIMITED = "unlimited"
type Cell = true | typeof UNLIMITED | string

const ROWS: { label: string; free: Cell; pro: Cell }[] = [
  { label: "Market fiyat karşılaştırması", free: true, pro: true },
  { label: "Barkod ile ürün arama", free: true, pro: true },
  { label: "Fiş analizi ve geçmişi", free: true, pro: true },
  { label: "Asistan mesajları", free: "50/ay", pro: "500/ay" },
  { label: "Görsel analizi", free: "10/ay", pro: "250/ay" },
  { label: "Sepet kaydetme", free: "20", pro: UNLIMITED },
  { label: "Fiş kaydetme", free: "20", pro: UNLIMITED },
]

// Hücre ritmi: kompakt dikey padding, mobilde dar yatay padding. Pro sütununa
// ayrı bir zemin verilmez — vurgu yalnızca alttaki primary düğmededir.
const CELL = "px-3 py-2 sm:px-4"
// Plan sütunlarının solundaki dikey ayraç — satır ayraçlarıyla aynı ton.
// border-separate kullanıldığı için her hücreye ayrı ayrı verilir.
const COL_DIVIDER = "border-l border-border"
// Satın alma düğmeleri: sütunu tam doldurur, mobilde dar sütuna sığsın diye bir
// punto küçülüp yatay paddingi kısar.
const ACTION_BUTTON = "w-full gap-1 px-1.5 text-xs sm:px-2.5 sm:text-[0.8rem]"

export function HomePricingSection() {
  const [interval, setInterval] = React.useState<Interval>("month")
  // Misafirin tıklaması /api/checkout'a gitmez: rota oturumsuzu zaten "/?login=1"
  // ile geri çevirirdi, kapı o gidiş-dönüşü baştan keser ve modalı burada açar.
  const requireAuth = useRequireAuth()

  return (
    <section className="relative z-20 bg-[var(--home-base)]">
      <div className="mx-auto w-full max-w-5xl px-4 pt-2 pb-16 text-foreground">
        {/* Dar ekranda faturalandırma anahtarı BURADA durur: tablo başlığındaki
            yerinde "Özellikler" ile aynı satıra sığmayıp alt satıra sarıyordu.
            Anahtarın ölçüsü her iki yerde de KOMŞUSUNU izler: burada `default`
            (h-8) çünkü text-2xl başlığın satır kutusu da 32px, tablo başlığında
            ise `sm` (h-6) çünkü oradaki komşusu text-base.
            `flex-wrap` + `ms-auto`: çok dar ekranda taşmak yerine alt satıra
            sarar ve orada da sağa yaslı kalır. */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-balance text-foreground">
            Fiyatlandırma
          </h2>
          <div className="ms-auto shrink-0 sm:hidden">
            <BillingToggle value={interval} onChange={setInterval} />
          </div>
        </div>

        {/* Solda karşılaştırma tablosu, sağında başlıksız SSS. lg altında alt
            alta yığılır; tabloya biraz daha pay verilir çünkü üç sütun taşır. */}
        <div className="grid items-start gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
          <div>
            {/* Kabuk feature kartlarıyla aynı reçetede: Squircle 2xl +
                `smooth-shadow-ring-sm`. Eskiden sayfanın tek Lisse'siz kart
                yüzeyiydi — `rounded-[calc(var(--radius)*1.8)]` ile aynı 18px'i
                veriyordu ama düz `border-radius` olarak, yani köşe eğrisi
                komşularından başkaydı, üstelik kenarı opak `border-border`dı.

                SATIR İÇİ AYRAÇLAR `border-border` KALIYOR: onlar dış kenar
                değil iç cetvel, ve kabuğun halkası zaten `--border` okuyor —
                yani tablo baştan sona tek çizgi rengiyle çiziliyor.
                `overflow-hidden` de duruyor: clip-path köşeleri zaten kesiyor
                ama tablo hücrelerinin kendi zeminleri için emniyet. */}
            <Squircle
              radius="2xl"
              effects
              className="overflow-hidden bg-card smooth-shadow-ring-sm"
            >
              <table className="w-full border-separate border-spacing-0 text-xs sm:text-sm">
                {/* Özellik sütunu geniş, plan sütunları eşit — satır etiketleri
                mobilde iki satıra sarsa da sütunlar kaymaz. */}
                <colgroup>
                  <col className="w-[48%]" />
                  <col className="w-[26%]" />
                  <col className="w-[26%]" />
                </colgroup>

                <thead>
                  <tr>
                    {/* Sütun başlığı solda, faturalandırma anahtarı sağa yaslı —
                      böylece anahtar "Ücretsiz" sütununun kenarına komşu olur.
                      sm altında anahtar h2'nin yanına taşınır (yukarı bkz.). */}
                    <th
                      scope="col"
                      className="bg-muted/30 px-3 py-2 text-left sm:px-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="cn-font-heading text-base font-semibold">
                          Özellikler
                        </span>
                        <div className="hidden shrink-0 sm:block">
                          <BillingToggle
                            size="sm"
                            value={interval}
                            onChange={setInterval}
                          />
                        </div>
                      </div>
                    </th>
                    {/* Ücretsiz: yalnızca ad — fiyatı zaten sıfır. */}
                    <th
                      scope="col"
                      className={cn(
                        COL_DIVIDER,
                        "bg-muted/30 px-3 py-2 text-center sm:px-4"
                      )}
                    >
                      <span className="cn-font-heading text-base font-semibold">
                        Ücretsiz
                      </span>
                    </th>
                    {/* Pro: primary rozet, arkasında `pro-sheen` (sıcak yıkama +
                      köşegen tarama). Fiyat rozetin yanında değil alttaki satın
                      alma düğmesinde — rozet yalnız planın adını taşır. */}
                    <th
                      scope="col"
                      className={cn(
                        COL_DIVIDER,
                        "relative bg-muted/30 px-3 py-2 text-center sm:px-4"
                      )}
                    >
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 pro-sheen"
                      />
                      {/* Rozet h-5; komşu başlıklar text-base (24px satır kutusu).
                          `my-0.5` ikisini eşitler, satır yüksekliği oynamaz. */}
                      <Badge variant="default" className="relative my-0.5">
                        Pro
                      </Badge>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {ROWS.map((row) => (
                    <tr key={row.label}>
                      <th
                        scope="row"
                        className={cn(
                          CELL,
                          "border-t border-border text-left font-normal text-foreground"
                        )}
                      >
                        {row.label}
                      </th>
                      <ValueCell value={row.free} />
                      <ValueCell value={row.pro} />
                    </tr>
                  ))}
                </tbody>

                {/* Satın alma satırı: her düğme kendi sütununun altında durur,
                    yani hangi planı başlattığı hizadan okunur. Başlık şeridiyle
                    aynı `bg-muted/30` — tablo iki uçtan da aynı tonla kapanır.
                    İkon yok: iki düğme yan yana, süs değil hedef ayırt edici. */}
                <tfoot>
                  <tr>
                    <td
                      className={cn(
                        CELL,
                        "border-t border-border bg-muted/30 text-[0.6875rem] leading-tight text-muted-foreground"
                      )}
                    >
                      {/* Logo satır içinde akar (inline-flex değil) ki cümle dar
                          sütunda sarabilsin; logo + ad ise tek parça kalır. */}
                      Ödemeler{" "}
                      <span className="whitespace-nowrap">
                        <PolarIcon className="inline size-3 align-[-0.1em]" />{" "}
                        Polar
                      </span>{" "}
                      ile alınır.
                    </td>
                    <td
                      className={cn(
                        CELL,
                        COL_DIVIDER,
                        "border-t border-border bg-muted/30"
                      )}
                    >
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className={ACTION_BUTTON}
                      >
                        <Link href="/asistan">Hemen başla</Link>
                      </Button>
                    </td>
                    <td
                      className={cn(
                        CELL,
                        COL_DIVIDER,
                        "border-t border-border bg-muted/30"
                      )}
                    >
                      {/* Fiyat artık burada: aralık anahtarı değişince NumberFlow
                          99 ↔ 990 arası döner, yani anahtar ile düğme arasındaki
                          bağ görünür kalır. */}
                      <Button asChild size="sm" className={ACTION_BUTTON}>
                        <a
                          href={`/api/checkout?interval=${interval}`}
                          onClick={requireAuth(() => undefined)}
                        >
                          Pro&apos;ya geç
                          <AnimatedAmount
                            value={
                              interval === "month"
                                ? MONTHLY_PRICE
                                : YEARLY_PRICE
                            }
                            className="font-mono tracking-tight opacity-80"
                          />
                        </a>
                      </Button>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </Squircle>
          </div>

          <SubscriptionFaqList />
        </div>
      </div>
    </section>
  )
}

// Değer hücresi: `true` ise tik, UNLIMITED ise sonsuzluk ikonu, aksi halde
// metin/limit. İkonların yanına sr-only karşılığı yazılır ki ekran okuyucu
// hücreyi boş okumasın.
function ValueCell({ value }: { value: Cell }) {
  return (
    <td className={cn(CELL, COL_DIVIDER, "border-t border-border text-center")}>
      {value === true ? (
        <>
          <RiCheckLine className="mx-auto size-4 text-primary" aria-hidden />
          <span className="sr-only">Dahil</span>
        </>
      ) : value === UNLIMITED ? (
        <>
          <RiInfinityLine className="mx-auto size-5 text-primary" aria-hidden />
          <span className="sr-only">Sınırsız</span>
        </>
      ) : (
        <span className="font-mono text-muted-foreground tabular-nums">
          {value}
        </span>
      )}
    </td>
  )
}
