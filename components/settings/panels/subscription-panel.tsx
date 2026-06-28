"use client"

import * as React from "react"
import Link from "next/link"
import { motion, useReducedMotion } from "motion/react"
import {
  ArrowRightIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  FileTextIcon,
  ImageIcon,
  InfoIcon,
  MessageSquareIcon,
  ReceiptIcon,
  ShoppingBasketIcon,
} from "lucide-react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { LEGAL_SUPPORT_EMAIL } from "@/components/legal/legal-content"
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

// Free ve Pro özellikleri. Sayılar lib/usage/limits.ts'teki PLAN_LIMITS ile
// hizalıdır; orada değişirse buradaki vitrin metni de güncellenmelidir. Her
// satır, tick yerine ilgili metriği anlatan bir ikonla gösterilir.
type Feature = {
  icon: React.ComponentType<{ className?: string }>
  label: string
}

const FREE_FEATURES: Feature[] = [
  { icon: MessageSquareIcon, label: "Aylık 50 asistan mesajı" },
  { icon: ImageIcon, label: "Aylık 10 görsel analizi" },
  { icon: ShoppingBasketIcon, label: "20 sepet kaydı" },
  { icon: ReceiptIcon, label: "20 fiş kaydı" },
]

const PRO_FEATURES: Feature[] = [
  { icon: MessageSquareIcon, label: "Aylık 500 asistan mesajı" },
  { icon: ImageIcon, label: "Aylık 250 görsel analizi" },
  { icon: ShoppingBasketIcon, label: "Sınırsız sepet kaydı" },
  { icon: ReceiptIcon, label: "Sınırsız fiş kaydı" },
]

// Pro kullanıcıya gösterilen Ücretsiz↔Pro karşılaştırma satırları. Değerler
// yukarıdaki FREE_FEATURES/PRO_FEATURES ile aynı PLAN_LIMITS kaynağından gelir.
const PLAN_COMPARISON: { feature: string; free: string; pro: string }[] = [
  { feature: "Asistan mesajları", free: "50 / ay", pro: "500 / ay" },
  { feature: "Görsel analizleri", free: "10 / ay", pro: "250 / ay" },
  { feature: "Sepet kaydetme", free: "20", pro: "Sınırsız" },
  { feature: "Fiş kaydetme", free: "20", pro: "Sınırsız" },
]

// Abonelik durumunu, kullanıcıya gösterilecek tek bir net etikete + tona
// indirger. cancelAtPeriodEnd, status hâlâ "active" olsa bile önceliklidir:
// "iptal edilecek" bilgisi daha önce yalnızca rozet renginde (sarımsı "Aktif")
// taşınıyordu ve yeşil "Aktif"ten ayırt edilemiyordu; artık doğrudan metne
// yazılır.
type StatusTone = "positive" | "warning" | "negative"

function describeStatus(sub: SubscriptionInfo): {
  label: string
  tone: StatusTone
} {
  if (sub.cancelAtPeriodEnd) return { label: "İptal edilecek", tone: "warning" }
  if (!sub.status || sub.status === "active")
    return { label: "Aktif", tone: "positive" }
  switch (sub.status) {
    case "trialing":
      return { label: "Deneme sürümü", tone: "positive" }
    case "past_due":
      return { label: "Ödeme gecikti", tone: "warning" }
    case "incomplete":
      return { label: "Tamamlanmadı", tone: "warning" }
    case "unpaid":
      return { label: "Ödeme alınamadı", tone: "negative" }
    case "canceled":
      return { label: "İptal edildi", tone: "negative" }
    default:
      return { label: sub.status, tone: "positive" }
  }
}

// Ton → metin rengi. Tokenlar badge'in success/warning/destructive
// varyantlarıyla aynı paletten gelir; renk artık anlamı tek başına taşımaz,
// yalnızca etiketteki durumu pekiştirir.
const STATUS_TONE_CLASS: Record<StatusTone, string> = {
  positive: "text-emerald-700 dark:text-emerald-300",
  warning: "text-amber-700 dark:text-amber-300",
  negative: "text-destructive",
}

// SSS — her madde koddaki davranış ve Polar yapılandırmasıyla doğrulanabilir:
// fiyatlar Polar ürünlerinden (₺99 aylık / ₺990 yıllık, TRY), limitler
// lib/usage/limits.ts'ten, iptal/ödeme akışı app/api/webhooks/polar'dan
// (past_due → erişim sürer, revoked → free), portal app/api/portal'dan, aylık
// sıfırlama ise lib/usage/period.ts'ten gelir. Destek e-postası tek kaynak
// olarak legal-content'teki LEGAL_SUPPORT_EMAIL'den alınır. `a` zengin içerik
// (mailto bağlantısı) taşıyabilsin diye ReactNode'dur.
const FAQ_ITEMS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Pro'ya geçince neler değişir?",
    a: "Aylık asistan mesajların 50'den 500'e, görsel analizlerin 10'dan 250'ye çıkar. Sepet ve fiş kaydetme ise sınırsız olur.",
  },
  {
    q: "Ödeme veya abonelikte sorun yaşarsam ne yapmalıyım?",
    a: (
      <>
        Tahsilat, yenilenme veya plan durumuyla ilgili bir sorun yaşarsan{" "}
        <a
          href={`mailto:${LEGAL_SUPPORT_EMAIL}`}
          className="font-medium text-foreground underline underline-offset-2"
        >
          {LEGAL_SUPPORT_EMAIL}
        </a>{" "}
        adresine yazabilirsin; en kısa sürede yardımcı oluruz. Fatura ve ödeme
        geçmişine ayrıca Polar müşteri portalından ulaşabilirsin.
      </>
    ),
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
    q: "Mevcut planımın ödemesi başarısız olursa ne olur?",
    a: "Bir tahsilat başarısız olursa aboneliğin “Gecikti” durumuna geçer ama Pro erişimin hemen kesilmez; Polar ödemeyi yeniden dener. Tüm denemeler başarısız olursa abonelik iptal edilir ve Ücretsiz plana geri dönersin.",
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
          {sub.plan === "pro" ? <ProState sub={sub} /> : <UpgradeState />}
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
        "h-full rounded-[calc(var(--radius)*1.8)] bg-gradient-to-br from-primary via-ring to-primary/50 p-0.5",
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

// ─── Pro kullanıcı: mevcut abonelik + plan avantajları (metin tabanlı) ───
// Kart/kenarlık/gölge yok; diğer panellerle aynı metin + grid kalıbını izler.
function ProState({ sub }: { sub: SubscriptionInfo }) {
  // interval yalnızca Polar'dan tanınan bir Pro ürünü için dolar; elle 'pro'
  // yapılmış (Polar müşterisi olmayan) hesapta null gelir — o durumda yanlış
  // "Aylık" göstermek yerine aralık rozetini hiç göstermeyiz.
  const intervalLabel =
    sub.interval === "year" ? "Yıllık" : sub.interval === "month" ? "Aylık" : null
  const periodEnd = sub.currentPeriodEnd
    ? dateFmt.format(new Date(sub.currentPeriodEnd))
    : null
  // Durum artık rozet renginde değil, açık bir etikette taşınır (aşağıda).
  const status = describeStatus(sub)

  return (
    <section
      data-search-target="abonelik-durumu"
      className="flex flex-col gap-8"
    >
      {/* Plan kimliği + durum + yönetim */}
      <div className="flex flex-col gap-4">
        {/* Başlık solda, sözleşmeler menüsü sağda — Ücretsiz görünümdeki
            (toggle ↔ menü) hizalamanın Pro karşılığı. */}
        <div className="flex flex-wrap items-center justify-between gap-x-2.5 gap-y-3">
          <span className="cn-font-heading text-md font-semibold leading-none">
            Plan detayları
          </span>
          <ContractsMenu />
        </div>

        {/* Abonelik bilgileri — "Plan avantajların" tablosuyla aynı stil:
            text-sm, ince border-t ayraçlar, py-1.5 nefes payı, hover yok.
            Etiket solda (muted), değer sağda. İlk satırda üst ayraç olmaz;
            aralık ve tarih yalnızca Polar'dan biliniyorsa eklenir. */}
        <div className="flex flex-col gap-2.5">
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
              <tbody>
                <tr>
                  <td className="px-4 py-1.5 text-foreground">Plan</td>
                  <td className="px-4 py-1.5 text-right font-semibold text-primary">
                    Pro
                  </td>
                </tr>
                <tr>
                  <td className="border-t border-border px-4 py-1.5 text-foreground">
                    Durum
                  </td>
                  <td
                    className={cn(
                      "border-t border-border px-4 py-1.5 text-right font-medium",
                      STATUS_TONE_CLASS[status.tone],
                    )}
                  >
                    <span className="inline-flex items-center gap-1.5 align-middle">
                      <StatusHintDropdown sub={sub} periodEnd={periodEnd} />
                      {status.label}
                    </span>
                  </td>
                </tr>
                {intervalLabel && (
                  <tr>
                    <td className="border-t border-border px-4 py-1.5 text-foreground">
                      Faturalandırma
                    </td>
                    <td className="border-t border-border px-4 py-1.5 text-right font-medium text-foreground">
                      {intervalLabel}
                    </td>
                  </tr>
                )}
                {periodEnd && (
                  <tr>
                    <td className="border-t border-border px-4 py-1.5 text-foreground">
                      {sub.cancelAtPeriodEnd ? "Sona erme tarihi" : "Sonraki yenilenme"}
                    </td>
                    <td className="border-t border-border px-4 py-1.5 text-right font-medium text-foreground tabular-nums">
                      {periodEnd}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td
                    colSpan={2}
                    className="border-t border-border bg-muted/30 px-4 py-1.5"
                  >
                    <div
                      data-search-target="abonelik-yonet"
                      className="flex items-center justify-between gap-x-3"
                    >
                      {sub.hasCustomer ? (
                        <>
                          <span className="min-w-0 truncate text-xs text-muted-foreground">
                            Plan değişikliği, fatura geçmişi ve iptal işlemleri
                          </span>
                          <Button asChild variant="outline" size="xs" className="shrink-0">
                            <a href="/api/portal">
                              Aboneliği yönet
                              <ExternalLinkIcon data-icon="inline-end" />
                            </a>
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Bu plan elle tanımlandığı için Polar üzerinden
                          yönetilemiyor.
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

        </div>
      </div>

      {/* Ücretsiz↔Pro karşılaştırması; Pro sütunu hafif bir zeminle vurgulanır */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Plan avantajların</h3>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-xs font-medium text-muted-foreground">
                <th className="px-4 py-1.5 text-left font-medium">Özellik</th>
                <th className="px-4 py-1.5 text-center font-medium">Ücretsiz</th>
                <th className="bg-primary/[0.07] px-4 py-1.5 text-center font-semibold text-primary">
                  Pro
                </th>
              </tr>
            </thead>
            <tbody>
              {PLAN_COMPARISON.map((row) => (
                <tr key={row.feature}>
                  <td className="border-t border-border px-4 py-1.5 text-foreground">
                    {row.feature}
                  </td>
                  <td className="border-t border-border px-4 py-1.5 text-center text-muted-foreground tabular-nums">
                    {row.free}
                  </td>
                  <td className="border-t border-border bg-primary/[0.07] px-4 py-1.5 text-center font-medium text-foreground tabular-nums">
                    {row.pro}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

// ─── Free kullanıcı: billing toggle + Free vs Pro karşılaştırması ───
function UpgradeState() {
  const [interval, setInterval] = React.useState<Interval>("month")

  return (
    <section data-search-target="pro-yukselt" className="flex flex-col gap-5">
      {/* Faturalandırma aralığı solda, tüm sözleşmeleri açan menü sağda. */}
      <div className="flex items-center justify-between gap-3">
        <BillingToggle value={interval} onChange={setInterval} />
        <ContractsMenu />
      </div>

      <div className="grid items-stretch gap-3 sm:grid-cols-2">
        <FreeCard />
        <ProCard interval={interval} />
      </div>

      {/* Ödeme güvencesi. Tahsilat tamamen Polar'ın barındırdığı sayfada
          yapıldığı için kart bilgisi Sepet'e ulaşmaz; sözleşmeler yukarıdaki
          menüde. "Polar" sözcüğü polar.sh'a gider. */}
      <p className="text-center text-xs text-muted-foreground">
        Ödemeler{" "}
        <a
          href="https://polar.sh"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 align-middle underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          <PolarIcon className="size-3.5 shrink-0" />
          Polar
        </a>{" "}
        altyapısı ile güvenli şekilde alınır.
      </p>
    </section>
  )
}

// Polar logosu. fill="currentColor" olduğundan içinde bulunduğu metnin
// rengini (muted-foreground) alır ve "Polar" sözcüğünün soluna oturur.
function PolarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 300" className={className} fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M66.4284 274.26C134.876 320.593 227.925 302.666 274.258 234.219C320.593 165.771 302.666 72.7222 234.218 26.3885C165.77 -19.9451 72.721 -2.0181 26.3873 66.4297C-19.9465 134.877 -2.01938 227.927 66.4284 274.26ZM47.9555 116.67C30.8375 169.263 36.5445 221.893 59.2454 256.373C18.0412 217.361 7.27564 150.307 36.9437 92.318C55.9152 55.2362 87.5665 29.3937 122.5 18.3483C90.5911 36.7105 62.5549 71.8144 47.9555 116.67ZM175.347 283.137C211.377 272.606 244.211 246.385 263.685 208.322C293.101 150.825 282.768 84.4172 242.427 45.2673C264.22 79.7626 269.473 131.542 252.631 183.287C237.615 229.421 208.385 265.239 175.347 283.137ZM183.627 266.229C207.945 245.418 228.016 210.604 236.936 168.79C251.033 102.693 232.551 41.1978 195.112 20.6768C214.97 47.3945 225.022 99.2902 218.824 157.333C214.085 201.724 200.814 240.593 183.627 266.229ZM63.7178 131.844C49.5155 198.43 68.377 260.345 106.374 280.405C85.9962 254.009 75.5969 201.514 81.8758 142.711C86.5375 99.0536 99.4504 60.737 116.225 35.0969C92.2678 55.983 72.5384 90.4892 63.7178 131.844ZM199.834 149.561C200.908 217.473 179.59 272.878 152.222 273.309C124.853 273.742 101.797 219.039 100.724 151.127C99.6511 83.2138 120.968 27.8094 148.337 27.377C175.705 26.9446 198.762 81.648 199.834 149.561Z"
      />
    </svg>
  )
}

// Menüde listelenen tüm yasal sözleşmeler. Her biri public bir sayfaya bağlanır
// ve yeni sekmede açılır (target=_blank). Sıra: önce ödeme sözleşmeleri.
const CONTRACTS: { href: string; label: string }[] = [
  { href: "/mesafeli-satis", label: "Mesafeli Satış Sözleşmesi" },
  { href: "/iptal-iade", label: "İptal ve İade Politikası" },
  { href: "/gizlilik", label: "Gizlilik Politikası" },
  { href: "/kullanim-sartlari", label: "Kullanım Şartları" },
]

// "Sözleşmeler" bölünmüş düğmesi: sol tarafta etiket, dikey bir sınırla ayrılmış
// sağ tarafta açılır menüyü tetikleyen ok. Menü öğeleri sözleşme sayfalarına
// yeni sekmede gider; sağlarındaki ikon bunu (target=_blank) belli eder.
function ContractsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="default"
          data-search-target="sozlesmeler"
          className="gap-0 px-0"
        >
          <span className="flex items-center gap-1.5 pr-2 pl-2.5">
            <FileTextIcon className="size-3.5" />
            Sözleşmeler
          </span>
          <span className="flex items-center self-stretch border-l border-border px-1.5">
            <ChevronDownIcon className="size-3.5 transition-transform group-aria-expanded/button:rotate-180" />
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-60">
        {CONTRACTS.map((contract) => (
          <DropdownMenuItem key={contract.href} asChild>
            <Link
              href={contract.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {contract.label}
              <ExternalLinkIcon className="ml-auto size-3.5 text-muted-foreground" />
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
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
      className="inline-flex h-8 w-fit items-center gap-0.5 rounded-lg border border-border bg-muted/60 p-0.5 text-sm"
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
              "flex items-center gap-1 self-stretch rounded-md px-3 font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {iv === "month" ? "Aylık" : "Yıllık"}
            {iv === "year" && (
              <span
                className={cn(
                  "rounded-full px-1 py-px font-mono text-[10px] font-medium leading-none transition-colors",
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
          <span className="font-mono text-3xl font-semibold tracking-tight">
            <Amount value={0} />
          </span>
          <span className="pb-1 text-sm text-muted-foreground">/ ay</span>
        </div>
      </div>

      <FeatureList items={FREE_FEATURES} muted />

      <Button
        variant="outline"
        size="default"
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

      <Button asChild size="default" className="mt-auto w-full">
        <a href={`/api/checkout?interval=${interval}`}>
          Pro&apos;ya Geç
          <ArrowRightIcon data-icon="inline-end" />
        </a>
      </Button>
    </GradientCard>
  )
}

// Fiyat tutarı: rakamlar sarmalayan span'in font-mono'sundan gelir, ₺ simgesi
// ise ana fonta (sans) alınır — Geist Mono'nun ₺ glyph'i bozuk göründüğü için.
function Amount({ value }: { value: number }) {
  return (
    <>
      <span className="font-sans">₺</span>
      {priceFmt.format(value)}
    </>
  )
}

// Fiyat gösterimi. Aylıkta sade ₺99/ay; yıllıkta önce liste fiyatı (₺1.188)
// belirir, motion ile üzerine bir çizgi çekilir ve ardından ₺990 yazılır.
function ProPrice({ interval }: { interval: Interval }) {
  const reduce = useReducedMotion()

  if (interval === "month") {
    return (
      <div className="flex items-end gap-1.5">
        <span className="font-mono text-3xl font-semibold tracking-tight">
          <Amount value={MONTHLY_PRICE} />
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
        <span className="font-mono text-sm font-medium text-muted-foreground">
          <Amount value={YEARLY_LIST} />
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
          className="font-mono text-3xl font-semibold tracking-tight"
          initial={reduce ? false : { opacity: 0, y: 8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.45, duration: 0.35, ease: "easeOut" }}
        >
          <Amount value={YEARLY_PRICE} />
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
  items: Feature[]
  muted?: boolean
}) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map(({ icon: Icon, label }) => (
        <li key={label} className="flex items-center gap-2.5 text-sm">
          <Icon
            className={cn(
              "size-4 shrink-0",
              muted ? "text-muted-foreground" : "text-primary",
            )}
          />
          <span className={muted ? "text-muted-foreground" : "text-foreground"}>
            {label}
          </span>
        </li>
      ))}
    </ul>
  )
}

// ─── Durum ipucu dropdown'u ───
// Durum etiketinin (ör. "İptal edilecek") yanında küçük bir info circle ikonu
// gösterilir. Tıklanınca dropdown açılır ve duruma özgü açıklama metni
// okunabilir. Popover yerine dropdown tercih edilmiştir çünkü mobilde
// dokunma deneyimi daha güvenilirdir.
function getStatusHint(
  sub: SubscriptionInfo,
  periodEnd: string | null,
): string | null {
  if (sub.cancelAtPeriodEnd && periodEnd) {
    return `${periodEnd} tarihine kadar Pro avantajların açık kalır; dilersen iptali geri alabilirsin.`
  }
  switch (sub.status) {
    case "past_due":
      return "Son ödeme tahsil edilemedi. Polar ödemeyi yeniden deneyecek; bu süre zarfında Pro erişimin devam eder."
    case "incomplete":
      return "Abonelik ödeme işlemi tamamlanamadı. Lütfen ödeme bilgilerini kontrol et."
    case "trialing":
      return periodEnd
        ? `Deneme süren ${periodEnd} tarihine kadar geçerli. Süre bitiminde otomatik olarak faturalandırılırsın.`
        : "Deneme sürümünü kullanıyorsun. Süre bitiminde otomatik olarak faturalandırılırsın."
    case "unpaid":
      return "Tüm ödeme denemeleri başarısız oldu. Aboneliğin yakında iptal edilebilir."
    default:
      return null
  }
}

function StatusHintDropdown({
  sub,
  periodEnd,
}: {
  sub: SubscriptionInfo
  periodEnd: string | null
}) {
  const hint = getStatusHint(sub, periodEnd)
  if (!hint) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Durum hakkında bilgi"
          className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <InfoIcon className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-w-72 px-3 py-2.5"
      >
        <p className="text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
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
            <AccordionTrigger className="font-normal">{item.q}</AccordionTrigger>
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
