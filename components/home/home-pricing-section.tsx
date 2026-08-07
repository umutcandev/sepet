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
import { CheckIcon, InfinityIcon } from "lucide-react"

import {
  AnimatedAmount,
  BillingToggle,
  MONTHLY_PRICE,
  YEARLY_PRICE,
  type Interval,
} from "@/components/subscription/plan-cards"
import { SubscriptionFaqList } from "@/components/subscription/subscription-faq"
import { Badge } from "@/components/ui/badge"
import { AnimateEnter } from "@/components/motion/animate-enter"
import { STAGGER_STEP } from "@/lib/motion"
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
// ayrı bir zemin verilmez — vurgu yalnızca başlıktaki primary rozettedir.
const CELL = "px-3 py-2 sm:px-4"
// Plan sütunlarının solundaki dikey ayraç — satır ayraçlarıyla aynı ton.
// border-separate kullanıldığı için her hücreye ayrı ayrı verilir.
const COL_DIVIDER = "border-l border-border"

export function HomePricingSection() {
  const [interval, setInterval] = React.useState<Interval>("month")

  return (
    <section className="relative z-20 bg-[var(--home-base)]">
      <div className="dark mx-auto w-full max-w-5xl px-4 pt-2 pb-16 text-foreground">
        <AnimateEnter>
          <h2 className="mb-5 text-2xl font-semibold tracking-tight text-balance text-foreground">
            Fiyatlandırma
          </h2>
        </AnimateEnter>

        {/* Solda karşılaştırma tablosu, sağında başlıksız SSS. lg altında alt
            alta yığılır; tabloya biraz daha pay verilir çünkü üç sütun taşır.
            Tablo ve SSS bir adım arayla girer — başlıkla birlikte üç kademe. */}
        <div className="grid items-start gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
          <AnimateEnter
            delay={STAGGER_STEP}
            className="overflow-hidden rounded-[calc(var(--radius)*1.8)] border border-border bg-card"
          >
            <table className="w-full border-separate border-spacing-0 text-xs sm:text-sm">
              {/* Özellik sütunu geniş, plan sütunları eşit — satır etiketleri
                mobilde iki satıra sarsa da sütunlar kaymaz. */}
              <colgroup>
                <col className="w-[44%]" />
                <col className="w-[28%]" />
                <col className="w-[28%]" />
              </colgroup>

              <thead>
                <tr>
                  {/* Köşe hücresi boş durmasın: faturalandırma anahtarı burada,
                      sola dayalı — plan başlıklarıyla aynı satırı paylaşır. */}
                  <th className="bg-muted/30 px-3 py-2 text-left sm:px-4">
                    <BillingToggle
                      size="sm"
                      value={interval}
                      onChange={setInterval}
                    />
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
                  {/* Pro: primary rozet + aralığa göre değişen fiyat. */}
                  <th
                    scope="col"
                    className={cn(
                      COL_DIVIDER,
                      "bg-muted/30 px-3 py-2 text-center sm:px-4"
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
                      <Badge variant="default">Pro</Badge>
                      {/* text-lg: mono rakamlar aynı puntoda sans başlıktan
                          küçük görünüyor, bir kademe büyütünce "Ücretsiz" ile
                          optik olarak eşitleniyor. leading-none satırı şişirmez. */}
                      <AnimatedAmount
                        value={
                          interval === "month" ? MONTHLY_PRICE : YEARLY_PRICE
                        }
                        className="font-mono text-lg leading-none font-semibold tracking-tight"
                      />
                    </div>
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
            </table>
          </AnimateEnter>

          <AnimateEnter delay={STAGGER_STEP * 2}>
            <SubscriptionFaqList />
          </AnimateEnter>
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
          <CheckIcon className="mx-auto size-4 text-primary" aria-hidden />
          <span className="sr-only">Dahil</span>
        </>
      ) : value === UNLIMITED ? (
        <>
          <InfinityIcon className="mx-auto size-5 text-primary" aria-hidden />
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
