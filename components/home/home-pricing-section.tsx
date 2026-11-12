"use client"

// Ana sayfa fiyatlandırma: tek Pro kartı + SSS. Kap ölçüsü footer ve blog
// bölümüyle aynı (max-w-5xl px-4).

import * as React from "react"
import { RiCheckLine } from "@remixicon/react"

import {
  AnimatedAmount,
  BillingToggle,
  MONTHLY_PRICE,
  PRO_FEATURES,
  YEARLY_PRICE,
  type Interval,
} from "@/components/subscription/plan-cards"
import { HomeFaq } from "@/components/home/home-faq"
import { FairUseMark } from "@/components/subscription/fair-use-mark"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Squircle } from "@/components/ui/squircle"
import { useRequireAuth } from "@/lib/hooks/use-require-auth"

// Her iki planda da olan özellikler; Pro'nun farkı üstteki PRO_FEATURES.
const INCLUDED = [
  "Market fiyatlarını karşılaştır",
  "Ürünleri barkoduyla ara",
  "Fişlerini okut ve kaydet",
  "Fırsatları arkadaşlarınla paylaş",
]

export function HomePricingSection() {
  const [interval, setInterval] = React.useState<Interval>("month")
  const requireAuth = useRequireAuth()

  return (
    <section className="relative z-20 bg-[var(--home-base)]">
      <div className="mx-auto w-full max-w-5xl px-4 pt-2 pb-16 text-foreground">
        <h2 className="mb-5 text-2xl font-medium tracking-tight text-balance">
          Fiyatlandırma
        </h2>

        {/* lg'de kart ve SSS kutusu aynı yüksekliğe gerilir, kenarları çakışır. */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-10">
          <Squircle
            radius="2xl"
            effects
            className="bg-card smooth-shadow-ring-sm lg:h-full"
          >
            {/* Kartın iki sütunu ekran değil kart genişliğine bağlı. */}
            <div className="@container h-full">
              <div className="grid h-full gap-6 p-5 @lg:grid-cols-2 @lg:p-6">
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="default">Pro</Badge>
                      <BillingToggle
                        value={interval}
                        onChange={setInterval}
                        size="sm"
                      />
                    </div>
                    <div className="flex items-baseline gap-1">
                      <AnimatedAmount
                        value={
                          interval === "month" ? MONTHLY_PRICE : YEARLY_PRICE
                        }
                        className="text-3xl font-medium tracking-tight"
                      />
                      <span className="text-sm text-muted-foreground">
                        {interval === "month" ? "/ay" : "/yıl"}
                      </span>
                    </div>
                    <p className="text-sm text-pretty text-muted-foreground">
                      Listendeki her ürünün en ucuz olduğu marketi bul,
                      alışverişini bir ya da iki markette bitir.
                    </p>
                  </div>

                  <Button variant="default" asChild className="w-full @lg:mt-auto">
                    <a
                      href={`/api/checkout?interval=${interval}`}
                      onClick={requireAuth(() => undefined)}
                    >
                      Pro ile başla
                    </a>
                  </Button>
                </div>

                {/* Kart SSS'ye gerilince artan boşluk iki grubun arasına düşer:
                    son satır her yükseklikte düğmenin alt kenarıyla hizalı kalır. */}
                <div className="flex flex-col justify-between gap-4">
                  <ul className="flex flex-col gap-2.5">
                    {PRO_FEATURES.map(({ icon: Icon, label, unlimited }) => (
                      <li
                        key={label}
                        className="flex items-center gap-2.5 text-sm font-medium"
                      >
                        <Icon className="size-4 shrink-0 text-primary" />
                        <span>
                          {label}
                          {unlimited && <FairUseMark />}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex flex-col gap-4">
                    <div
                      role="separator"
                      className="w-full shrink-0 bg-border divider-wave"
                    />
                    <ul className="flex flex-col gap-2.5">
                      {INCLUDED.map((label) => (
                        <li
                          key={label}
                          className="flex items-start gap-2.5 text-sm text-muted-foreground"
                        >
                          <RiCheckLine
                            aria-hidden
                            className="mt-0.5 size-4 shrink-0"
                          />
                          {label}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </Squircle>

          <HomeFaq />
        </div>
      </div>
    </section>
  )
}
