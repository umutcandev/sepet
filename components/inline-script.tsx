"use client"

// Next dokümanındaki kalıp: sunucuda çalışır, istemci render'ında text/plain olur
// ki React "script tag" uyarısı vermesin. Client bileşeni olmalı, yoksa RSC payload
// sunucunun type'ını taşır.
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
