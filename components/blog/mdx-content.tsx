"use client"

import * as React from "react"
import * as runtime from "react/jsx-runtime"
import Link from "next/link"
import { CheckIcon, CopyIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type MdxComponents = Record<string, React.ComponentType<unknown>>
type MdxRenderer = (props: { components?: MdxComponents }) => React.ReactElement

// Velite `s.mdx()` çıktısı, function-body string'idir; runtime'ı arguments[0]
// olarak alır ve { default: MDXContent } döndürür. (contentlayer/velite deseni.)
function useMDXComponent(code: string): MdxRenderer {
  return React.useMemo(() => {
    const fn = new Function(code)
    return fn({ ...runtime }).default as MdxRenderer
  }, [code])
}

// MDX gövdesinde kullanılabilecek özel bileşenler.
function MdxLink({
  href = "",
  ...props
}: React.ComponentProps<"a">) {
  // İç bağlantı: kök-göreli ("/…", ama protokol-göreli "//…" DEĞİL) veya çapa.
  const isInternal =
    (href.startsWith("/") && !href.startsWith("//")) || href.startsWith("#")
  if (isInternal) {
    return <Link href={href} {...props} />
  }
  // Dış bağlantı yalnız güvenli şemalara izinli; javascript:/data: gibi şemalar
  // (ileride dış katkı gelirse XSS vektörü) href'siz düz metne indirgenir.
  const isSafeExternal = /^(https?:|mailto:)/i.test(href)
  if (!isSafeExternal) {
    return <a {...props} />
  }
  return <a href={href} target="_blank" rel="noopener noreferrer" {...props} />
}

function MdxImage({
  className,
  alt = "",
  ...props
}: React.ComponentProps<"img">) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      loading="lazy"
      className={cn("rounded-lg border border-border", className)}
      {...props}
    />
  )
}

/** Bilgi/uyarı kutusu — MDX'te `<Callout>...</Callout>` ile kullanılır. */
function Callout({
  children,
  variant = "info",
}: {
  children: React.ReactNode
  variant?: "info" | "warning"
}) {
  return (
    <div
      className={cn(
        "not-prose my-6 border-l-2 px-4 py-3 text-sm leading-relaxed text-foreground",
        variant === "warning"
          ? "border-l-destructive bg-destructive/[0.06]"
          : "border-l-primary bg-muted/60",
      )}
    >
      {children}
    </div>
  )
}

/**
 * Kod bloğu: rehype-pretty-code'un <pre>'sini saran konumlandırma kabı + sağ
 * üstte kopyala butonu (hover'da belirir; dokunmatikte hep görünür). Kopyalanan
 * metin pre'nin textContent'inden okunur, böylece vurgulama span'leri sorun
 * çıkarmaz.
 */
function Pre({ children, ...props }: React.ComponentProps<"pre">) {
  const ref = React.useRef<HTMLPreElement>(null)
  const [copied, setCopied] = React.useState(false)

  const copy = React.useCallback(() => {
    const text = ref.current?.textContent ?? ""
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    })
  }, [])

  return (
    <div className="group/code relative">
      <pre ref={ref} {...props}>
        {children}
      </pre>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Kopyalandı" : "Kodu kopyala"}
        className={cn(
          "absolute right-2.5 top-2.5 inline-flex size-7 items-center justify-center rounded-md border border-border bg-background/70 text-muted-foreground backdrop-blur transition-all",
          "opacity-0 group-hover/code:opacity-100 focus-visible:opacity-100 max-md:opacity-100",
          "hover:border-foreground/30 hover:text-foreground",
        )}
      >
        {copied ? (
          <CheckIcon className="size-3.5 text-primary" />
        ) : (
          <CopyIcon className="size-3.5" />
        )}
      </button>
    </div>
  )
}

const components = {
  a: MdxLink,
  img: MdxImage,
  pre: Pre,
  Callout,
} as unknown as MdxComponents

export function MdxContent({ code }: { code: string }) {
  // MDX render fonksiyonunu JSX <Component/> yerine doğrudan çağırıyoruz: MDX
  // çıktısı kendi içinde hook kullanmaz, böylece "render'da component oluşturma"
  // (react-hooks/static-components) uyarısı doğmaz.
  const render = useMDXComponent(code)
  return render({ components })
}
