import Link from "next/link"
import { MessagesSquareIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatDateTime } from "@/lib/format"

/**
 * Detay sayfalarının başlık bloğu.
 *
 * Sayfalar geri butonundan doğrudan kartlara geçiyordu — hiçbir <h1> yoktu ve
 * kullanıcının verdiği ad ("İskender sepeti") en alttaki bilgi tablosunda,
 * üstelik sağdan kesik duruyordu. Ad artık sayfanın ilk şeyi.
 *
 * Sohbet bağlantısı: `conversationId` hem yazılıyor hem `set null` ile
 * korunuyor ama hiç okunmuyordu; kullanıcı "bu sepeti neden böyle kurdum"a
 * dönemiyordu. Sohbet silinmişse `conversation` null gelir ve buton hiç render
 * edilmez.
 *
 * Stil notu: sohbet bağlantısı elle kurulmuş border/radius/ikon yerine sayfanın
 * diğer aksiyonlarıyla aynı `Button` primitive'i (outline) ve projenin her
 * yerinde sohbeti temsil eden `MessagesSquareIcon`'dur; birincil aksiyon
 * (`actions`) onun sağında durur.
 */
export function RecordHeader({
  title,
  createdAt,
  conversation,
  meta,
  actions,
}: {
  title: string
  createdAt: Date | string
  conversation?: { id: string; title: string } | null
  /** Tarihin yanında, sessiz tonda gösterilecek kısa bilgi. */
  meta?: React.ReactNode
  actions?: React.ReactNode
}) {
  const hasActions = Boolean(conversation) || Boolean(actions)

  return (
    // Telefonda başlık ÜSTTE tek başına, aksiyonlar ALTINDA; yan yana dizilim
    // ancak `sm`den itibaren. Tek satırda `flex-1` bir başlık + `shrink-0` bir
    // aksiyon bloğu vardı: aksiyonlar (sohbet rozeti + "Fiyatları yenile")
    // 390px'lik bir ekranda tek başına satırı doldurduğu için başlığa sıfır
    // genişlik kalıyor, `flex-wrap` da devreye girmiyordu — `flex-basis: 0`
    // taşıyan bir öğe her zaman "sığıyor" sayılır. Sonuç: `break-words` başlığı
    // harf harf alt alta diziyordu ("İs / ke / nd / er…").
    <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0 space-y-1">
        {/* `text-balance` uzun adları satırlara dengeli dağıtır; `break-words`
            yalnızca tek parça uzun bir kelime için son çare. */}
        <h1 className="text-xl font-semibold text-balance break-words sm:text-2xl">
          {title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="tabular-nums">{formatDateTime(createdAt)}</span>
          {meta ? (
            <>
              <span aria-hidden>·</span>
              {meta}
            </>
          ) : null}
        </div>
      </div>

      {hasActions ? (
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {conversation ? (
            <Button variant="outline" size="sm" asChild className="min-w-0">
              <Link
                href={`/asistan/${conversation.id}`}
                title={`${conversation.title.trim()} sohbetine git`}
              >
                <MessagesSquareIcon className="mr-1.5 size-3.5 shrink-0" />
                {/* Dar ekranda 12rem hâlâ satırın yarısından fazlası; viewport'a
                    da bağlanıyor ki yanındaki birincil aksiyon ezilmesin. */}
                <span className="min-w-0 max-w-[min(12rem,45vw)] truncate">
                  {conversation.title.trim()}
                </span>
              </Link>
            </Button>
          ) : null}
          {actions}
        </div>
      ) : null}
    </header>
  )
}
