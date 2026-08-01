"use client"

// Free/Pro fiyat kartları ve faturalandırma anahtarı — tek kaynak.
// Hem Ayarlar > Abonelik panelinde hem de ana sayfadaki fiyatlandırma
// bölümünde kullanılır; vitrin metni ikiye ayrılmasın diye kartların gövdesi
// (fiyat, özellik listesi, degrade kenar) burada yaşar. Kartın altındaki
// eylem düğmesi bağlama göre değiştiğinden `action` prop'uyla dışarıdan verilir.

import * as React from "react"
import NumberFlow from "@number-flow/react"
import { motion, useReducedMotion } from "motion/react"
import {
  ImageIcon,
  MessageSquareIcon,
  ReceiptIcon,
  ShoppingBasketIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

export type Interval = "month" | "year"

// Görüntülenen fiyatlar Polar'daki Pro ürünleriyle aynıdır (₺99/ay, ₺990/yıl).
// Tahsilat her zaman Polar tarafından yapılır; bunlar yalnızca vitrin metnidir.
export const MONTHLY_PRICE = 99
export const YEARLY_PRICE = 990
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

export const FREE_FEATURES: Feature[] = [
  { icon: MessageSquareIcon, label: "Aylık 50 asistan mesajı" },
  { icon: ImageIcon, label: "Aylık 10 görsel analizi" },
  { icon: ShoppingBasketIcon, label: "20 sepet kaydı" },
  { icon: ReceiptIcon, label: "20 fiş kaydı" },
]

export const PRO_FEATURES: Feature[] = [
  { icon: MessageSquareIcon, label: "Aylık 500 asistan mesajı" },
  { icon: ImageIcon, label: "Aylık 250 görsel analizi" },
  { icon: ShoppingBasketIcon, label: "Sınırsız sepet kaydı" },
  { icon: ReceiptIcon, label: "Sınırsız fiş kaydı" },
]

// Pro kullanıcıya gösterilen Ücretsiz↔Pro karşılaştırma satırları. Değerler
// yukarıdaki FREE_FEATURES/PRO_FEATURES ile aynı PLAN_LIMITS kaynağından gelir.
export const PLAN_COMPARISON: { feature: string; free: string; pro: string }[] =
  [
    { feature: "Asistan mesajları", free: "50 / ay", pro: "500 / ay" },
    { feature: "Görsel analizleri", free: "10 / ay", pro: "250 / ay" },
    { feature: "Sepet kaydetme", free: "20", pro: "Sınırsız" },
    { feature: "Fiş kaydetme", free: "20", pro: "Sınırsız" },
  ]

// ─── Sıcak gradyan kenar + parıltı sarmalayıcı (Pro vurgusu) ───
// Dış katman degrade "kenar"ı çizer (2px), iç katman kart zeminini taşır.
// İç köşe yarıçapı = dış yarıçap − kenar kalınlığı; böylece degrade köşelerde
// taşmaz. --radius gerçek bir CSS değişkeni olduğundan tema/ölçek değişse de
// hizalama korunur.
export function GradientCard({
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

export function BillingToggle({
  value,
  onChange,
  size = "default",
}: {
  value: Interval
  onChange: (next: Interval) => void
  /** "sm": dar alanlar için (ör. ana sayfa tablosunun başlık hücresi). */
  size?: "default" | "sm"
}) {
  const sm = size === "sm"

  return (
    <div
      role="group"
      aria-label="Faturalandırma aralığı"
      className={cn(
        "inline-flex w-fit items-center gap-0.5 rounded-lg border border-border bg-muted/60 p-0.5",
        sm ? "h-7 text-xs" : "h-8 text-sm",
      )}
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
              "flex items-center self-stretch rounded-md font-medium transition-colors",
              sm ? "gap-0.5 px-2" : "gap-1 px-3",
              active
                ? "bg-background text-foreground smooth-shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {iv === "month" ? "Aylık" : "Yıllık"}
            {iv === "year" && (
              <span
                className={cn(
                  "rounded-full px-1 py-px font-mono font-medium leading-none transition-colors",
                  sm ? "text-[9px]" : "text-[10px]",
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

// `badge` sağ üstteki rozet ("Mevcut" / "Önerilen" vb.), `action` ise kartın
// dibindeki düğmedir; ikisi de bağlama göre değiştiği için dışarıdan gelir.
export function FreeCard({
  badge,
  action,
}: {
  badge?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="flex h-full flex-col gap-5 rounded-[calc(var(--radius)*1.8)] border border-border bg-muted/30 p-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="cn-font-heading text-lg font-semibold leading-none">
            Ücretsiz
          </span>
          {badge}
        </div>
        <div className="flex items-end gap-1.5">
          <span className="font-mono text-3xl font-semibold tracking-tight">
            <Amount value={0} />
          </span>
          <span className="pb-1 text-sm text-muted-foreground">/ ay</span>
        </div>
      </div>

      <FeatureList items={FREE_FEATURES} muted />

      {action && <div className="mt-auto">{action}</div>}
    </div>
  )
}

export function ProCard({
  interval,
  badge,
  action,
}: {
  interval: Interval
  badge?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <GradientCard>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="cn-font-heading text-lg font-semibold leading-none">
            Pro
          </span>
          {badge}
        </div>
        {/* key YOK: ProPrice mount'ta kalmalı ki tutar NumberFlow ile
            animasyonlu geçsin. Üzeri-çizme animasyonu, kendisi yalnızca
            yıllıkta render edildiği için zaten her geçişte baştan oynar. */}
        <ProPrice interval={interval} />
      </div>

      <FeatureList items={PRO_FEATURES} />

      {action && <div className="mt-auto">{action}</div>}
    </GradientCard>
  )
}

// ₺ (U+20BA) simgesinin ortak stili. Simge NE Geist'te NE Geist Mono'da var;
// her iki ailede de sistem yedeğine düşüyor. Yani buradaki `font-sans`
// Geist'in ₺'sini seçmiyor — mono yedeği yerine sans yedeğinin çizmesini
// sağlıyor, çevresindeki metinle tutarlı duran da o. Rakamlardan hafifçe
// ayrılır ve bir tık küçülür; em cinsinden olduğu için hangi punto ile
// kullanılırsa kullanılsın oran korunur.
const LIRA = "ml-0.5 font-sans text-[0.8em]"

// Fiyat tutarı. Simge tr-TR yazımındaki gibi tutarın sonunda durur (990₺).
export function Amount({ value }: { value: number }) {
  return (
    <>
      {priceFmt.format(value)}
      <span className={LIRA}>₺</span>
    </>
  )
}

// Amount'ın animasyonlu hâli: tutar değiştiğinde NumberFlow rakamları odometre
// gibi çevirir, basamak sayısı değişse de (99 ↔ 990) genişlik yumuşakça açılır.
// Elle yazılmış blur/slide geçişlerinden daha okunur; NumberFlow ayrıca
// prefers-reduced-motion'a kendisi saygı gösterir.
//
// ÖNEMLİ: Bunu kullanan ağaçta `key={interval}` gibi remount tetikleyicisi
// olmamalı — bileşen yeniden mount olursa animasyon değil, sıfırdan çizim olur.
export function AnimatedAmount({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  return (
    <span className={cn("inline-flex items-baseline", className)}>
      <NumberFlow
        value={value}
        locales="tr-TR"
        transformTiming={{
          duration: 550,
          easing: "cubic-bezier(0.22,1,0.36,1)",
        }}
        opacityTiming={{ duration: 250, easing: "ease-out" }}
      />
      <span className={LIRA}>₺</span>
    </span>
  )
}

// Fiyat gösterimi. Büyük tutar iki aralık arasında NumberFlow ile döner
// (99 ↔ 990). Yıllıkta ayrıca üstte liste fiyatı (1.188₺) belirir ve motion ile
// üzerine bir çizgi çekilir — bu blok yalnızca yıllıkta render edildiği için
// aralık her değiştiğinde animasyonu baştan oynar.
function ProPrice({ interval }: { interval: Interval }) {
  const reduce = useReducedMotion()
  const price = interval === "month" ? MONTHLY_PRICE : YEARLY_PRICE

  return (
    <div className="flex flex-col gap-0.5">
      {interval === "year" && (
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
      )}
      <div className="flex items-end gap-1.5">
        <AnimatedAmount
          value={price}
          className="font-mono text-3xl font-semibold tracking-tight"
        />
        <span className="pb-1 text-sm text-muted-foreground">
          {interval === "month" ? "/ ay" : "/ yıl"}
        </span>
      </div>
    </div>
  )
}

function FeatureList({ items, muted }: { items: Feature[]; muted?: boolean }) {
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

// Polar logosu. fill="currentColor" olduğundan içinde bulunduğu metnin
// rengini (muted-foreground) alır ve "Polar" sözcüğünün soluna oturur.
function PolarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 300"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M66.4284 274.26C134.876 320.593 227.925 302.666 274.258 234.219C320.593 165.771 302.666 72.7222 234.218 26.3885C165.77 -19.9451 72.721 -2.0181 26.3873 66.4297C-19.9465 134.877 -2.01938 227.927 66.4284 274.26ZM47.9555 116.67C30.8375 169.263 36.5445 221.893 59.2454 256.373C18.0412 217.361 7.27564 150.307 36.9437 92.318C55.9152 55.2362 87.5665 29.3937 122.5 18.3483C90.5911 36.7105 62.5549 71.8144 47.9555 116.67ZM175.347 283.137C211.377 272.606 244.211 246.385 263.685 208.322C293.101 150.825 282.768 84.4172 242.427 45.2673C264.22 79.7626 269.473 131.542 252.631 183.287C237.615 229.421 208.385 265.239 175.347 283.137ZM183.627 266.229C207.945 245.418 228.016 210.604 236.936 168.79C251.033 102.693 232.551 41.1978 195.112 20.6768C214.97 47.3945 225.022 99.2902 218.824 157.333C214.085 201.724 200.814 240.593 183.627 266.229ZM63.7178 131.844C49.5155 198.43 68.377 260.345 106.374 280.405C85.9962 254.009 75.5969 201.514 81.8758 142.711C86.5375 99.0536 99.4504 60.737 116.225 35.0969C92.2678 55.983 72.5384 90.4892 63.7178 131.844ZM199.834 149.561C200.908 217.473 179.59 272.878 152.222 273.309C124.853 273.742 101.797 219.039 100.724 151.127C99.6511 83.2138 120.968 27.8094 148.337 27.377C175.705 26.9446 198.762 81.648 199.834 149.561Z"
      />
    </svg>
  )
}

// Ödeme güvencesi. Tahsilat tamamen Polar'ın barındırdığı sayfada yapıldığı
// için kart bilgisi Sepet'e ulaşmaz. "Polar" sözcüğü polar.sh'a gider.
export function PolarNote({ className }: { className?: string }) {
  return (
    <p className={cn("text-center text-xs text-muted-foreground", className)}>
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
  )
}
