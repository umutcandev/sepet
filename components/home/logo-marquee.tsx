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
      {/* Maske kaydırma kabında: animasyon iç şeritte olduğu için maske
          sabit kalır ve logolar iki uçta sert kesilmek yerine erir. */}
      <div className="logo-marquee-fade overflow-hidden">
        <div className="flex w-max animate-logo-marquee items-center group-hover/marquee:[animation-play-state:paused]">
          {[0, 1].map((copy) => (
            <ul
              key={copy}
              // İkinci kopya yalnız görsel süreklilik için; ekran okuyucu
              // market adlarını iki kez okumasın.
              aria-hidden={copy === 1 || undefined}
              className="flex shrink-0 items-center gap-14 pe-14 md:gap-20 md:pe-20"
            >
              {MARKETS.map(({ Logo, name }) => (
                <li key={name} className="flex shrink-0 items-center">
                  {/* Tek ölçü: yükseklik. Genişlik en/boy oranından gelir,
                      viewBox'lar mürekkebe kırpılı olduğu için hepsi
                      gerçekten aynı yükseklikte oturur. */}
                  <Logo className="h-6 w-auto md:h-7" />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </div>
  )
}
