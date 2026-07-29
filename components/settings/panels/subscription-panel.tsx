"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRightIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  FileTextIcon,
  InfoIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BillingToggle,
  FreeCard,
  PLAN_COMPARISON,
  PolarNote,
  ProCard,
  type Interval,
} from "@/components/subscription/plan-cards"
import { SubscriptionFaq } from "@/components/subscription/subscription-faq"
import { cn } from "@/lib/utils"
import { PanelHeader } from "../settings-row"
import { getSubscription, type SubscriptionInfo } from "@/lib/actions/subscription"

const dateFmt = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

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
        <FreeCard
          badge={<Badge variant="secondary">Mevcut</Badge>}
          action={
            <Button variant="outline" size="default" disabled className="w-full">
              Kullanıyorsun
            </Button>
          }
        />
        <ProCard
          interval={interval}
          badge={<Badge variant="default">Önerilen</Badge>}
          action={
            <Button asChild size="default" className="w-full">
              <a href={`/api/checkout?interval=${interval}`}>
                Pro&apos;ya Geç
                <ArrowRightIcon data-icon="inline-end" />
              </a>
            </Button>
          }
        />
      </div>

      {/* Ödeme güvencesi; sözleşmeler yukarıdaki menüde. */}
      <PolarNote />
    </section>
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
              {/* Sağa yaslama artık DropdownMenuItem'dan geliyor (ms-auto). */}
              <ExternalLinkIcon className="size-3.5 text-muted-foreground" />
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
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
