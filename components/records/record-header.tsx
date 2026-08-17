import { formatDateTime } from "@/lib/format"

/**
 * Detay sayfalarının başlık bloğu.
 *
 * Sayfalar geri butonundan doğrudan kartlara geçiyordu — hiçbir <h1> yoktu ve
 * kullanıcının verdiği ad ("İskender sepeti") en alttaki bilgi tablosunda,
 * üstelik sağdan kesik duruyordu. Ad artık sayfanın ilk şeyi.
 *
 * Aksiyonlar (sohbete git, fiyat yenile, sil) tek bir "İşlem Yap" menüsünde
 * toplandığı için `actions` tek ve dar bir hedef — başlığa yer bırakır. Yine de
 * `min-w-[12rem]`: kalan genişlik başlığa yetmezse aksiyon alt satıra iner,
 * başlık kelime ortasından kırılmaz.
 */
export function RecordHeader({
  title,
  createdAt,
  meta,
  actions,
}: {
  title: string
  createdAt: Date | string
  /** Tarihin yanında, sessiz tonda gösterilecek kısa bilgi. */
  meta?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <header className="mb-5 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <h1 className="min-w-[12rem] flex-1 text-xl font-semibold break-words sm:text-2xl">
          {title}
        </h1>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className="tabular-nums">{formatDateTime(createdAt)}</span>
        {meta ? (
          <>
            <span aria-hidden>·</span>
            {meta}
          </>
        ) : null}
      </div>
    </header>
  )
}
