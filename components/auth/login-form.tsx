"use client"

import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { signInWithGoogleAction } from "@/lib/actions/auth"
import { cn } from "@/lib/utils"

const FEATURES = [
  "162.929 ürünün canlı fiyatı",
  "Yapay zeka destekli alışveriş listesi",
  "Fiş fotoğrafından en hızlı fiyat karşılaştırması",
]

/**
 * The form transitions from "image-background overlay" style (text on image)
 * to "white panel" style (text on background) at the variant breakpoint.
 * - "md" (768px): used by the login dialog (narrower transition because
 *   the dialog reaches its two-column layout earlier)
 * - "lg" (1024px): default
 */
type Variant = "lg" | "md"

type Props = {
  variant?: Variant
  callbackUrl?: string
}

export function LoginForm({ variant = "lg", callbackUrl }: Props) {
  const headingText =
    variant === "md"
      ? "text-background md:text-foreground"
      : "text-background lg:text-foreground"
  const descText =
    variant === "md"
      ? "text-background/85 md:text-muted-foreground"
      : "text-background/85 lg:text-muted-foreground"
  const topGap =
    variant === "md" ? "mt-8 flex flex-col md:mt-0" : "mt-[110px] flex flex-col lg:mt-20"

  return (
    <div className="flex w-full max-w-[402px] flex-col px-5 pt-8 pb-5 md:pt-10 md:pb-6">
      <div className={topGap}>
        <h1
          className={cn(
            "text-[48px] font-semibold leading-[48px] tracking-[-0.04em] md:text-[36px] md:leading-[36px]",
            headingText,
          )}
        >
          Sepet
        </h1>
        <p
          className={cn(
            "mt-[18px] max-w-[260px] text-[17px] leading-[1.35] tracking-[-0.01em] md:mt-4 md:text-[15px]",
            descText,
          )}
        >
          Yapay zeka ile akıllı alışverişin tadını çıkarın.
        </p>
      </div>

      <ul className="mt-auto mb-6 flex flex-col gap-3 text-[13px] text-muted-foreground md:mt-10">
        {FEATURES.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <Check className="h-3 w-3 shrink-0" strokeWidth={2.5} />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <form
        action={async () => {
          await signInWithGoogleAction(callbackUrl)
        }}
      >
        <Button
          type="submit"
          size="lg"
          className="h-[52px] w-full gap-2 rounded-[14px] px-[6px] text-[15px] font-medium tracking-[-0.01em] md:h-[44px] md:rounded-xl md:text-[14px]"
        >
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white">
            <GoogleIcon />
          </span>
          Google ile devam et
        </Button>
      </form>

      <p className="mt-3.5 text-center text-[11px] leading-[1.5] tracking-[-0.005em] text-muted-foreground/60">
        Devam ederek <u>Şartlar</u> ve <u>Gizlilik</u>&apos;i kabul ediyorsun.
      </p>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" className="h-[18px] w-[18px]" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}
