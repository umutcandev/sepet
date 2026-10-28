"use client"

import * as React from "react"
import { RiTwitterXLine } from "@remixicon/react"

import { useDocumentTheme } from "@/hooks/use-document-theme"

// MDX içinde X gönderisi:
//
//   <XPost url="https://x.com/kullanici/status/123" />
//
// X'in widgets.js betiği yerine kendi gömme sayfası doğrudan iframe olarak
// yükleniyor: sayfaya üçüncü taraf betik girmiyor, CSP'de yalnız frame-src
// açık (lib/security/headers.ts). Gömme sayfası yüksekliğini widgets.js'in
// dinlediği "twttr.private.resize" mesajıyla bildiriyor; gelene kadar iskelet
// görünür. Genişlik kaba göre esner, X'in kart tavanı 550px.

const EMBED_ORIGIN = "https://platform.twitter.com"
const MIN_HEIGHT = 220

type EmbedRpc = { method?: string; params?: Array<{ height?: unknown }> }

function readEmbedRpc(data: unknown): EmbedRpc | undefined {
  let value = data
  if (typeof value === "string") {
    try {
      value = JSON.parse(value)
    } catch {
      return undefined
    }
  }
  return (value as { "twttr.embed"?: EmbedRpc } | null)?.["twttr.embed"]
}

export function XPost({ url }: { url: string }) {
  const id = /\/status(?:es)?\/(\d+)/.exec(url)?.[1]
  const theme = useDocumentTheme()
  const ref = React.useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = React.useState<number | null>(null)

  React.useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== EMBED_ORIGIN) return
      if (event.source !== ref.current?.contentWindow) return
      const rpc = readEmbedRpc(event.data)
      if (rpc?.method !== "twttr.private.resize") return
      const next = Number(rpc.params?.[0]?.height)
      if (next > 0) setHeight(Math.ceil(next))
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [])

  // Kimliği okunamayan bağlantı ve SSR (tema henüz bilinmiyor) düz bağlantıya düşer.
  if (!id || !theme) {
    return (
      <p className="not-prose my-6">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4"
        >
          <RiTwitterXLine className="size-4" aria-hidden />
          Gönderiyi X&apos;te görüntüle
        </a>
      </p>
    )
  }

  const src = `${EMBED_ORIGIN}/embed/Tweet.html?${new URLSearchParams({
    id,
    theme,
    dnt: "true",
    lang: "tr",
    embedId: `x-post-${id}`,
  })}`

  return (
    <div className="not-prose relative mx-auto my-6 w-full max-w-[550px]">
      {height === null ? (
        <div
          aria-hidden
          className="absolute inset-0 animate-pulse rounded-2xl border border-border bg-muted/40"
        />
      ) : null}
      <iframe
        // Tema değişince gömme sayfası yeniden yüklenir; eski yükseklik yeni
        // ölçüm gelene kadar korunur, yazı zıplamaz.
        key={theme}
        ref={ref}
        src={src}
        title="X gönderisi"
        loading="lazy"
        // widgets.js ile aynı: yükseklik içerikten geldiği için iç kaydırma çubuğu olmamalı.
        scrolling="no"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        className="relative block w-full max-w-full border-0"
        style={{
          height: height ?? MIN_HEIGHT,
          opacity: height === null ? 0 : 1,
          // Koyu temada tarayıcı iframe'in arkasına opak beyaz zemin boyamasın.
          colorScheme: "normal",
        }}
      />
    </div>
  )
}
