import { Squircle } from "@/components/ui/squircle"
import {
  A101Wordmark,
  BimWordmark,
  CarrefourSaWordmark,
  MigrosWordmark,
  SokWordmark,
  TarimKrediWordmark,
} from "@/components/market-wordmarks"
import { cn } from "@/lib/utils"

// Ana sayfada blog bölümünün üstünde duran, sonsuz kayan market logosu şeridi.
//
// Döngü: şerit logo setini İKİ kez basar ve `translateX(-50%)`e kadar kayar.
// İkinci kopya tam olarak birincinin başladığı yere oturduğu için tekrar
// başa dönüş görünmez — sıçrama yok. Aradaki boşluk da set içi boşlukla aynı
// olmalı, o yüzden `gap` ve sondaki `pe` aynı değerde.
const MARKETS = [
  { Logo: BimWordmark, name: "BİM" },
  { Logo: A101Wordmark, name: "A101" },
  { Logo: SokWordmark, name: "ŞOK" },
  { Logo: MigrosWordmark, name: "Migros" },
  { Logo: CarrefourSaWordmark, name: "CarrefourSA" },
  { Logo: TarimKrediWordmark, name: "Tarım Kredi KOOP" },
]

export function LogoMarquee({ className }: { className?: string }) {
  return (
    <div className={cn("group/marquee relative", className)}>
      <h2 className="sr-only">Fiyatları karşılaştırılan marketler</h2>
      {/* Maske kaydırma kabında: animasyon iç şeritte olduğu için maske sabit
          kalır ve kartlar iki uçta sert kesilmek yerine erir. Dikey `py`,
          kartların gölgesine yer açmak için — `overflow-hidden` yatayda
          kırpıyor, gölge de kırpılmasın. */}
      <div className="logo-marquee-fade overflow-hidden py-3">
        <div className="flex w-max animate-logo-marquee items-stretch group-hover/marquee:[animation-play-state:paused]">
          {[0, 1].map((copy) => (
            <ul
              key={copy}
              // İkinci kopya yalnız görsel süreklilik için; ekran okuyucu
              // market adlarını iki kez okumasın.
              aria-hidden={copy === 1 || undefined}
              className="flex shrink-0 items-stretch gap-3 pe-3 md:gap-4 md:pe-4"
            >
              {MARKETS.map(({ Logo, name }) => (
                <li
                  key={name}
                  // Kenar + gölge tek katmanda: `smooth-shadow-ring-*` 1px'lik
                  // hairline'ı gölgenin son katmanı olarak taşıyor. Ayrıca
                  // `border`/`ring` EKLENMEZ — halka zaten içinde, ikincisi
                  // çift kenar yapardı (bkz. app/globals.css'teki not).
                  //
                  // Halka rengi `smooth-ring-*` ile `--border`a sabitleniyor.
                  // Sebebi globals.css'teki sıcak halka override'ının BURAYA
                  // ULAŞMAMASI: o override `--smooth-ring-color`ı `:root`ta
                  // kurar, ama plugin kendi `.dark` kuralında aynı değişkeni
                  // nötr `rgba(255,255,255,.18)` yapar. Bu bölüm `dark`
                  // sarmalayıcı içinde (bkz. home-blog-section), dolayısıyla
                  // plugin'in kuralı kazanıyordu ve kart kenarı her iki temada
                  // da nötr griye kayıyordu. globals.css'in `.dark` bloğu
                  // yalnız `--smooth-ring-alpha`yı set ettiği için de bunu
                  // düzeltmiyor: `--smooth-ring-color` zaten `:root`ta
                  // hesaplanıp indiği için alfayı sonradan değiştirmek etkisiz.
                  //
                  // `--border` ise yanındaki blog kartlarının kenarıyla aynı
                  // token: iki kart tipi tek kenar dilinde buluşuyor.
                  //
                  // Yüzey içerideki `Squircle`da: `effects` açıkken Lisse SVG
                  // katmanı için bir sarmalayıcı div doğuruyor ve `div` bir
                  // `ul`nin doğrudan çocuğu olamaz. `li` flex öğesi olarak
                  // kalıyor, kırpma onun içinde.
                  className="flex shrink-0"
                >
                  <Squircle
                    radius="xl"
                    effects
                    className="flex h-14 min-w-36 items-center justify-center bg-card px-6 smooth-shadow-ring-xs smooth-ring-border md:h-16 md:min-w-40 md:px-7"
                  >
                    {/* Tek ölçü: yükseklik. Genişlik en/boy oranından gelir,
                        viewBox'lar mürekkebe kırpılı olduğu için hepsi
                        gerçekten aynı yükseklikte oturur. */}
                    <Logo className="h-5 w-auto md:h-6" />
                  </Squircle>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </div>
  )
}
