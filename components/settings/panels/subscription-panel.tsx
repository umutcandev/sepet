"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import {
  ArrowRightIcon,
  CheckIcon,
  CrownIcon,
  ExternalLinkIcon,
  ShieldCheckIcon,
} from "lucide-react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { PanelHeader } from "../settings-row"
import { getSubscription, type SubscriptionInfo } from "@/lib/actions/subscription"

const dateFmt = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

type Interval = "month" | "year"

// Görüntülenen fiyatlar Polar'daki Pro ürünleriyle aynıdır (₺99/ay, ₺990/yıl).
// Tahsilat her zaman Polar tarafından yapılır; bunlar yalnızca vitrin metnidir.
const MONTHLY_PRICE = 99
const YEARLY_PRICE = 990
// Aylık ödemeyle bir yılın liste karşılığı (12 × ₺99) — yıllıkta üzeri çizilir.
const YEARLY_LIST = MONTHLY_PRICE * 12

const priceFmt = new Intl.NumberFormat("tr-TR")
const tl = (n: number) => `₺${priceFmt.format(n)}`

// Free ve Pro özellikleri. Sayılar lib/usage/limits.ts'teki PLAN_LIMITS ile
// hizalıdır; orada değişirse buradaki vitrin metni de güncellenmelidir.
const FREE_FEATURES = [
  "50 asistan mesajı / ay",
  "10 görsel analizi / ay",
  "20 sepet kaydı",
  "20 fiş kaydı",
]

const PRO_FEATURES = [
  "500 asistan mesajı / ay",
  "250 görsel analizi / ay",
  "Sınırsız sepet kaydı",
  "Sınırsız fiş kaydı",
]

// Pro kullanıcıya "sahip olduğun avantajlar" listesi.
const PRO_BENEFITS = [
  "Asistan mesajları: 50 → 500 / ay",
  "Görsel analizleri: 10 → 250 / ay",
  "Sepet kaydetme: sınırsız",
  "Fiş kaydetme: sınırsız",
]

const STATUS_LABEL: Record<string, string> = {
  active: "Aktif",
  trialing: "Deneme",
  past_due: "Gecikti",
  canceled: "İptal",
  unpaid: "Ödenmedi",
  incomplete: "Tamamlanmadı",
}

// SSS — her madde koddaki davranış ve Polar yapılandırmasıyla doğrulanabilir:
// fiyatlar Polar ürünlerinden (₺99 aylık / ₺990 yıllık, TRY), limitler
// lib/usage/limits.ts'ten, iptal/ödeme akışı app/api/webhooks/polar'dan
// (past_due → erişim sürer, revoked → free), portal app/api/portal'dan, aylık
// sıfırlama ise lib/usage/period.ts'ten gelir.
const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "Pro'ya geçince neler değişir?",
    a: "Aylık asistan mesajların 50'den 500'e, görsel analizlerin 10'dan 250'ye çıkar. Sepet ve fiş kaydetme ise sınırsız olur — Ücretsiz planda her biri 20 ile sınırlıdır.",
  },
  {
    q: "Ödeme bilgilerim güvende mi?",
    a: "Evet. Ödeme adımı tamamen Polar'ın güvenli ödeme sayfasında tamamlanır; kart bilgilerin Sepet sunucularında saklanmaz ya da işlenmez. Sepet yalnızca plan durumunu ve yenilenme tarihini saklar.",
  },
  {
    q: "Aboneliğimi nasıl yönetir veya iptal ederim?",
    a: "Abonelik sekmesindeki “Aboneliği yönet” düğmesi seni Polar müşteri portalına götürür; iptal, plan değişikliği ve fatura geçmişi oradan yönetilir. Portal yalnızca ödemeden geçmiş hesaplar için açılır.",
  },
  {
    q: "İptal edersem Pro hemen kapanır mı?",
    a: "Hayır. İptalde aboneliğin, içinde bulunduğun faturalandırma döneminin sonuna kadar açık kalır; o tarihe kadar tüm Pro avantajların sürer, ardından otomatik olarak Ücretsiz plana dönersin. Dönem bitmeden fikrini değiştirirsen iptali geri alabilirsin.",
  },
  {
    q: "Ödemem başarısız olursa ne olur?",
    a: "Bir tahsilat başarısız olursa aboneliğin “Gecikti” durumuna geçer ama Pro erişimin hemen kesilmez; Polar ödemeyi yeniden dener. Tüm denemeler başarısız olursa abonelik iptal edilir ve Ücretsiz plana inersin.",
  },
  {
    q: "Kullanım limitlerim ne zaman yenilenir?",
    a: "Aylık sayaçların (asistan mesajları ve görsel analizleri) her ayın ilk günü otomatik olarak sıfırlanır; ayrı bir işlem gerekmez. Kayıtlı sepet ve fiş sayıların ise anlık toplamdır, ay başında sıfırlanmaz.",
  },
]

export function SubscriptionPanel() {
  const [sub, setSub] = React.useState<SubscriptionInfo | null>(null)
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">(
    "loading",
  )

  React.useEffect(() => {
    let active = true
    getSubscription()
      .then((s) => {
        if (!active) return
        if (!s) {
          setStatus("error")
          return
        }
        setSub(s)
        setStatus("ready")
      })
      .catch(() => active && setStatus("error"))
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="flex flex-col gap-8">
      <PanelHeader
        title="Abonelik"
        description="Planını yönet, Pro'ya yükselt veya aboneliğini güncelle."
      />

      {status === "loading" && <SubscriptionSkeleton />}

      {status === "error" && (
        <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Abonelik bilgisi şu an yüklenemedi. Lütfen tekrar dene.
        </div>
      )}

      {status === "ready" && sub && (
        <>
          {sub.plan === "pro" ? (
            <>
              <ProState sub={sub} />
              <BenefitsCard />
            </>
          ) : (
            <UpgradeState />
          )}
          <SubscriptionFaq />
        </>
      )}
    </div>
  )
}

// ─── Sıcak gradyan kenar + parıltı sarmalayıcı (Pro vurgusu) ───
// Dış katman degrade "kenar"ı çizer (2px), iç katman kart zeminini taşır.
// İç köşe yarıçapı = dış yarıçap − kenar kalınlığı; böylece degrade köşelerde
// taşmaz. --radius gerçek bir CSS değişkeni olduğundan tema/ölçek değişse de
// hizalama korunur.
function GradientCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "h-full rounded-[calc(var(--radius)*1.8)] bg-gradient-to-br from-primary via-ring to-primary/50 p-0.5 shadow-xl shadow-primary/25",
        className,
      )}
    >
      <div className="relative h-full overflow-hidden rounded-[calc(var(--radius)*1.8-2px)] bg-card">
        {/* Çok hafif sıcak iç degrade — kartın üst kısmına yumuşak bir parlama. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/[0.07] via-transparent to-transparent"
        />
        <div className="relative z-[1] flex h-full flex-col gap-5 p-5">
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Pro kullanıcı: mevcut abonelik (hero kart) ───
function ProState({ sub }: { sub: SubscriptionInfo }) {
  const intervalLabel = sub.interval === "year" ? "Yıllık" : "Aylık"
  const periodEnd = sub.currentPeriodEnd
    ? dateFmt.format(new Date(sub.currentPeriodEnd))
    : null
  const statusLabel = sub.status ? (STATUS_LABEL[sub.status] ?? sub.status) : null

  return (
    <section data-search-target="abonelik-durumu">
      <GradientCard>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CrownIcon className="size-4" />
            </span>
            <div className="flex flex-col gap-1">
              <span className="cn-font-heading text-lg font-semibold leading-none">
                Sepet Pro
              </span>
              <Badge variant="secondary" className="w-fit">
                {intervalLabel}
              </Badge>
            </div>
          </div>
          {statusLabel && (
            <Badge variant={sub.cancelAtPeriodEnd ? "warning" : "secondary"}>
              {statusLabel}
            </Badge>
          )}
        </div>

        {periodEnd && (
          <p className="text-sm text-muted-foreground">
            {sub.cancelAtPeriodEnd ? (
              <>
                Aboneliğin{" "}
                <span className="font-medium text-foreground">{periodEnd}</span>{" "}
                tarihinde sona erecek; o güne kadar Pro avantajları açık kalır.
              </>
            ) : (
              <>
                Bir sonraki yenilenme:{" "}
                <span className="font-medium text-foreground">{periodEnd}</span>
              </>
            )}
          </p>
        )}

        <div data-search-target="abonelik-yonet" className="mt-auto">
          {sub.hasCustomer ? (
            <Button asChild variant="outline" size="sm">
              <a href="/api/portal">
                Aboneliği yönet
                <ExternalLinkIcon data-icon="inline-end" />
              </a>
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Bu plan elle ayarlandığı için Polar üzerinden yönetilemiyor.
            </p>
          )}
        </div>
      </GradientCard>
    </section>
  )
}

// ─── Free kullanıcı: billing toggle + Free vs Pro karşılaştırması ───
function UpgradeState() {
  const [interval, setInterval] = React.useState<Interval>("month")

  return (
    <section data-search-target="pro-yukselt" className="flex flex-col gap-5">
      <BillingToggle value={interval} onChange={setInterval} />

      <div className="grid items-stretch gap-3 sm:grid-cols-2">
        <FreeCard />
        <ProCard interval={interval} />
      </div>

      {/* Sözleşme sayfaları (Mesafeli Satış, İptal & İade, Gizlilik) hazır
          olunca buraya "·" ile ayrılmış linkler olarak eklenir. */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheckIcon className="size-3.5 shrink-0" />
        <span>Ödemeler Polar altyapısı ile sağlanır.</span>
      </div>
    </section>
  )
}

function BillingToggle({
  value,
  onChange,
}: {
  value: Interval
  onChange: (next: Interval) => void
}) {
  return (
    <div
      role="group"
      aria-label="Faturalandırma aralığı"
      className="inline-flex w-fit items-center gap-0.5 rounded-full border border-border bg-muted/60 p-0.5 text-sm"
    >
      {(["month", "year"] as const).map((iv) => {
        const active = value === iv
        return (
          <button
            key={iv}
            type="button"
            onClick={() => onChange(iv)}
            aria-pressed={active}
            className={cn(
              "flex items-center gap-1 rounded-full px-3 py-1 font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {iv === "month" ? "Aylık" : "Yıllık"}
            {iv === "year" && (
              <span
                className={cn(
                  "rounded-full px-1 py-px text-[10px] font-medium leading-none transition-colors",
                  active
                    ? "bg-primary/15 text-primary"
                    : "bg-muted-foreground/10 text-muted-foreground",
                )}
              >
                %17
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function FreeCard() {
  return (
    <div className="flex h-full flex-col gap-5 rounded-[calc(var(--radius)*1.8)] border border-border bg-muted/30 p-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="cn-font-heading text-lg font-semibold leading-none">
            Ücretsiz
          </span>
          <Badge variant="secondary">Mevcut</Badge>
        </div>
        <div className="flex items-end gap-1.5">
          <span className="cn-font-heading text-3xl font-semibold tracking-tight">
            ₺0
          </span>
          <span className="pb-1 text-sm text-muted-foreground">/ ay</span>
        </div>
      </div>

      <FeatureList items={FREE_FEATURES} muted />

      <Button
        variant="outline"
        size="sm"
        disabled
        className="mt-auto w-full"
      >
        Kullanıyorsun
      </Button>
    </div>
  )
}

function ProCard({ interval }: { interval: Interval }) {
  return (
    <GradientCard>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="cn-font-heading text-lg font-semibold leading-none">
            Pro
          </span>
          <Badge variant="default">Önerilen</Badge>
        </div>
        {/* key={interval} → her aralık değişiminde yeniden mount olur, böylece
            yıllıktaki üzeri-çizme animasyonu baştan oynar. */}
        <ProPrice key={interval} interval={interval} />
      </div>

      <FeatureList items={PRO_FEATURES} />

      <Button asChild size="sm" className="mt-auto w-full">
        <a href={`/api/checkout?interval=${interval}`}>
          Pro&apos;ya Geç
          <ArrowRightIcon data-icon="inline-end" />
        </a>
      </Button>
    </GradientCard>
  )
}

// Fiyat gösterimi. Aylıkta sade ₺99/ay; yıllıkta önce liste fiyatı (₺1.188)
// belirir, motion ile üzerine bir çizgi çekilir ve ardından ₺990 yazılır.
function ProPrice({ interval }: { interval: Interval }) {
  const reduce = useReducedMotion()

  if (interval === "month") {
    return (
      <div className="flex items-end gap-1.5">
        <span className="cn-font-heading text-3xl font-semibold tracking-tight">
          {tl(MONTHLY_PRICE)}
        </span>
        <span className="pb-1 text-sm text-muted-foreground">/ ay</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      {/* Üstte: küçük liste fiyatı + üzerini çizen animasyonlu çizgi */}
      <motion.span
        className="relative inline-flex w-fit"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <span className="cn-font-heading text-sm font-medium text-muted-foreground">
          {tl(YEARLY_LIST)}
        </span>
        <motion.span
          aria-hidden
          className="absolute inset-x-0 top-1/2 h-px origin-left -translate-y-1/2 rounded-full bg-destructive/70"
          initial={reduce ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.18, duration: 0.4, ease: [0.65, 0, 0.35, 1] }}
        />
      </motion.span>
      {/* Altta: indirimli fiyat, kendi büyük boyutunda */}
      <div className="flex items-end gap-1.5">
        <motion.span
          className="cn-font-heading text-3xl font-semibold tracking-tight"
          initial={reduce ? false : { opacity: 0, y: 8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.45, duration: 0.35, ease: "easeOut" }}
        >
          {tl(YEARLY_PRICE)}
        </motion.span>
        <span className="pb-1 text-sm text-muted-foreground">/ yıl</span>
      </div>
    </div>
  )
}

function FeatureList({
  items,
  muted,
}: {
  items: string[]
  muted?: boolean
}) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-2.5 text-sm">
          <CheckIcon
            className={cn(
              "size-4 shrink-0",
              muted ? "text-muted-foreground" : "text-primary",
            )}
          />
          <span className={muted ? "text-muted-foreground" : "text-foreground"}>
            {item}
          </span>
        </li>
      ))}
    </ul>
  )
}

function BenefitsCard() {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Pro avantajların</h3>
      <ul className="flex flex-col gap-2">
        {PRO_BENEFITS.map((b) => (
          <li key={b} className="flex items-center gap-2.5 text-sm">
            <CheckIcon className="size-4 shrink-0 text-primary" />
            <span className="text-muted-foreground">{b}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

// Kod ve Polar yapılandırmasından doğrulanabilir SSS (içerik FAQ_ITEMS'ta).
function SubscriptionFaq() {
  return (
    <section data-search-target="sss" className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Sıkça sorulan sorular</h3>
      <Accordion type="single" collapsible>
        {FAQ_ITEMS.map((item) => (
          <AccordionItem key={item.q} value={item.q}>
            <AccordionTrigger>{item.q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}

function SubscriptionSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-9 w-44 rounded-full" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-72 rounded-[calc(var(--radius)*1.8)]" />
        <Skeleton className="h-72 rounded-[calc(var(--radius)*1.8)]" />
      </div>
    </div>
  )
}
