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
import {
  limitCell,
  planLimit,
  type Plan,
  type UsageMetric,
} from "@/lib/usage/limits"
import { cn } from "@/lib/utils"

// Karşılaştırma satırları. `true` = plana dahil (tik), UNLIMITED = sonsuzluk
// ikonu, metin = değer/limit. Sayısal limitler PLAN_LIMITS'ten TÜRETİLİR;
// buraya elle yazılmaz (yazılıyordu ve limit değişince vitrin bayatladı).
const UNLIMITED = "unlimited"
type Cell = true | typeof UNLIMITED | string

/** Sayılar PLAN_LIMITS'ten gelir; `null` limit sonsuzluk ikonuna çevrilir. */
const cell = (plan: Plan, metric: UsageMetric): Cell =>
  planLimit(plan, metric) === null ? UNLIMITED : limitCell(plan, metric).replace(" / ", "/")

const ROWS: { label: string; free: Cell; pro: Cell }[] = [
  { label: "Market fiyat karşılaştırması", free: true, pro: true },
  { label: "Barkod ile ürün arama", free: true, pro: true },
  { label: "Fiş analizi ve geçmişi", free: true, pro: true },
  {
    label: "Asistan mesajları",
    free: cell("free", "textMessages"),
    pro: cell("pro", "textMessages"),
  },
  {
    label: "Görsel analizi",
    free: cell("free", "imageAnalyses"),
    pro: cell("pro", "imageAnalyses"),
  },
  {
    label: "Sepet kaydetme",
    free: cell("free", "savedBaskets"),
    pro: cell("pro", "savedBaskets"),
  },
  {
    label: "Fiş kaydetme",
    free: cell("free", "savedReceipts"),
    pro: cell("pro", "savedReceipts"),
  },
]

// Hücre ritmi: kompakt dikey padding, mobilde dar yatay padding. Pro sütununa
// ayrı bir zemin verilmez — vurgu yalnızca alttaki primary düğmededir.
// Mobilde dolgu kısılır: plan sütunları zaten dar ve satın alma düğmesi
// oradan besleniyor. sm'den itibaren nefes payı geri gelir.
const CELL = "px-2 py-2 sm:px-4"
// Plan sütunlarının solundaki dikey ayraç — satır ayraçlarıyla aynı ton.
// border-separate kullanıldığı için her hücreye ayrı ayrı verilir.
const COL_DIVIDER = "border-l border-border"
// Satın alma düğmeleri: sütunu tam doldurur, mobilde bir punto küçülür. Tek
// satırda kalırlar (Button base'indeki `whitespace-nowrap`) — bu yüzden içlerine
// fiyat KOYULMAZ, o başlıktaki plan hücresinde durur.
const ACTION_BUTTON = "w-full gap-1 px-1.5 text-xs sm:px-2.5 sm:text-[0.8rem]"
// Pro başlığındaki fiyat — değer hücreleriyle aynı mono ritim. Rozete yapışık
// durur ki ad + fiyat tek bir blok gibi okunsun.
const HEADER_PRICE =
  "relative mt-0.5 block font-mono text-xs tabular-nums text-foreground"

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
              {/* `table-fixed` ŞART: otomatik düzende tablo, en geniş hücrenin
                  min-content'ine göre büyür ve alttaki colgroup yüzdelerini yok
                  sayar. Satın alma düğmesi sarmayan bir metin taşıdığı için
                  tablo dar ekranda kabından taşıp sağdan kırpılıyordu. Sabit
                  düzende yüzdeler bağlayıcı olur, içerik hücrenin içinde sarar. */}
              <table className="w-full table-fixed border-separate border-spacing-0 text-xs sm:text-sm">
                <colgroup>
                  <col className="w-[44%]" />
                  <col className="w-[26%] sm:w-[28%]" />
                  <col className="w-[30%] sm:w-[28%]" />
                </colgroup>

                <thead>
                  <tr>
                    {/* Sütun başlığı solda, faturalandırma anahtarı sağa yaslı —
                      böylece anahtar "Ücretsiz" sütununun kenarına komşu olur.
                      sm altında anahtar h2'nin yanına taşınır (yukarı bkz.). */}
                    <th
                      scope="col"
                      className="bg-muted/30 px-2 py-2 text-left sm:px-4"
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
                    {/* Ücretsiz: yalnızca ad — fiyatı zaten sıfır. Rozet dikeyde
                        ortalanır (varsayılan hizalama); satır yüksekliğini
                        Pro'nun iki satırlık başlığı belirler. */}
                    <th
                      scope="col"
                      className={cn(
                        COL_DIVIDER,
                        "bg-muted/30 px-2 py-2 text-center sm:px-4"
                      )}
                    >
                      {/* Pro ile aynı rozet kalıbı, açık varyantta. İkisi de
                          `surface-raised-chip` taşıdığı için aynı kotta durur;
                          fark yalnızca dolgu tonunda, yani vurgu Pro'da kalır.
                          Mobilde yatay dolgu kısılır: "Ücretsiz" uzun bir kelime
                          ve bu sütun en dar olanı. */}
                      <Badge
                        variant="secondary"
                        className="my-0.5 px-1.5 sm:px-2"
                      >
                        Ücretsiz
                      </Badge>
                    </th>
                    {/* Pro: primary rozet, arkasında `pro-sheen` (sıcak yıkama +
                      köşegen tarama). Fiyat rozetin altında: düğmedeyken sütunu
                      dört haneli tutara (2.490₺) göre genişletiyordu. */}
                    <th
                      scope="col"
                      className={cn(
                        COL_DIVIDER,
                        "relative bg-muted/30 px-2 py-2 text-center sm:px-4"
                      )}
                    >
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 pro-sheen"
                      />
                      <Badge variant="default" className="relative">
                        Pro
                      </Badge>
                      <span className={HEADER_PRICE}>
                        <AnimatedAmount
                          value={
                            interval === "month" ? MONTHLY_PRICE : YEARLY_PRICE
                          }
                          className="font-medium"
                        />
                        <span className="ml-0.5 font-sans text-[0.9em] text-muted-foreground">
                          {interval === "month" ? "/ay" : "/yıl"}
                        </span>
                      </span>
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
                          // Sütun mobilde çok daraldığı için uzun Türkçe
                          // kelimeler ("karşılaştırması") hücreye sığmıyor.
                          // `break-words` taşma yerine kelime içinden böler.
                          "border-t border-border text-left font-normal break-words text-foreground"
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
                        {/* Dar sütunda tek kelime; sm'den itibaren tam etiket. */}
                        <Link href="/asistan">
                          <span className="sm:hidden">Başla</span>
                          <span className="hidden sm:inline">Hemen başla</span>
                        </Link>
                      </Button>
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
                        size="sm"
                        className={ACTION_BUTTON}
                      >
                        <a
                          href={`/api/checkout?interval=${interval}`}
                          onClick={requireAuth(() => undefined)}
                        >
                          Pro&apos;ya geç
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
