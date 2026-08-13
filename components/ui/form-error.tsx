import { TriangleAlertIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Form hatası — duyurulan ve renge bağlı OLMAYAN.
 *
 * Üç şey yapıyor, üçü de eskiden eksikti:
 *
 * 1. `role="alert"`. Hata metni ekran okuyucuya duyurulur. Bölge HER ZAMAN
 *    DOM'da: boşken `sr-only`ye düşer, sonra metni doldurulur. Canlı bölgeyi
 *    içeriğiyle birlikte DOM'a sokmak tarayıcı/okuyucu kombinasyonuna göre
 *    tutarsız duyuruluyor; sabit bir bölgeyi güncellemek güvenilir yol.
 *    `sr-only` konumlandırması `absolute` olduğu için boşken flex/gap düzenine
 *    de dokunmaz.
 * 2. İkon. Durumun renk dışında bir taşıyıcısı var; kırmızıyı ayırt edemeyen
 *    kullanıcı da hatayı görür.
 * 3. `id` verildiğinde alan `aria-describedby` ile buraya bağlanabilir, böylece
 *    hata alanın kendisiyle birlikte okunur.
 *
 * Alan bazlı doğrulamada alana `aria-invalid` + `aria-describedby={id}` eklemeyi
 * unutma; sunucudan gelen form geneli hatalarda tek başına yeterli.
 */
export function FormError({
  id,
  children,
  className,
}: {
  id?: string
  children?: React.ReactNode
  className?: string
}) {
  const empty = !children

  return (
    <p
      id={id}
      role="alert"
      data-slot="form-error"
      className={cn(
        empty
          ? "sr-only"
          : "flex items-start gap-1.5 text-xs leading-snug text-destructive",
        className
      )}
    >
      {empty ? null : (
        <>
          {/* 1.5px'lik lucide çizgisi, yanındaki normal ağırlıktaki metinle
              aynı optik ağırlıkta durur. */}
          <TriangleAlertIcon aria-hidden="true" className="mt-px size-3.5 shrink-0" />
          <span>{children}</span>
        </>
      )}
    </p>
  )
}
