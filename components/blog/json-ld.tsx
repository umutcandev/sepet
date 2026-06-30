// JSON-LD'yi XSS-safe enjekte eden yardımcı: `<` kaçırılır, böylece içerikten
// gelen string'ler script context'ini bozamaz.
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  )
}
