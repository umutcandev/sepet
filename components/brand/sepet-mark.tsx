import { MARK_PATHS, MARK_VIEWBOX } from "@/lib/brand/mark"
import { cn } from "@/lib/utils"

/**
 * Sepet'in işareti — wordmark (`/brand/sepet-*.svg`) DEĞİL. Yazının sığmadığı
 * dar yuvalarda kullanılır; şu an daraltılmış kenar çubuğunun başlığında
 * duruyor (bkz. components/app-sidebar.tsx).
 *
 * Çizim verisi `lib/brand/mark.ts`te: aynı yollardan hem bu bileşen hem de
 * `public/brand/sepet-logo-*.svg` dosyaları (scripts/build-brand-kit.mjs)
 * üretiliyor, böylece indirilen varlık ekrandakinden sapmıyor.
 *
 * MÜREKKEP wordmark'takinin aynısı. Kaynak dosyadaki sabit `#E2E2E2` yalnız
 * koyu zeminde okunuyordu; `currentColor`a bağlanıp iki marka rengiyle
 * sürülüyor. Wordmark statik bir dosya olduğu için token'a bağlanamıyor; o
 * dosyalar değişirse `lib/brand/mark.ts` de elle güncellenmeli.
 *
 * viewBox çizimin kendi sınırlarına daraltıldı. Böylece `h-6` demek "çizim 24
 * piksel" demek oluyor ve işaret, yerini aldığı `h-6` wordmark ile TAM aynı
 * yükseklikte duruyor — kenar çubuğu açılıp kapanırken logo büyüyüp küçülmüyor.
 */
export function SepetMark({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox={MARK_VIEWBOX}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      // Sınıflar LİTERAL yazılmak zorunda: Tailwind kaynağı metin olarak
      // tarar, template literal içindeki değişkenden utility üretmez. Değerler
      // `MARK_INK` ile aynı olmalı (#6D4530 / #F2C897) — orası script'in,
      // burası ekranın kaynağı.
      className={cn(
        "w-auto shrink-0 text-[#6D4530] dark:text-[#F2C897]",
        className,
      )}
      {...props}
    >
      {MARK_PATHS.map((d) => (
        <path key={d.slice(0, 24)} d={d} fill="currentColor" />
      ))}
    </svg>
  )
}
