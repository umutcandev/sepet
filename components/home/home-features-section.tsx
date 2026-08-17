import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  CheckIcon,
  ChevronDownIcon,
  PackageIcon,
  PlusIcon,
  TrendingDownIcon,
  XIcon,
} from "lucide-react"

import { AnimateEnter } from "@/components/motion/animate-enter"
import { PressFx } from "@/components/motion/press-fx"
import { Button } from "@/components/ui/button"
import { formatTL } from "@/lib/format"
import { stagger } from "@/lib/motion"
import { cn } from "@/lib/utils"

// Ana sayfada logo şeridi ile blog kartları arasında duran üç özellik kartı.
//
// Düzen Paper'daki "Cheerful forest" bölümünden geliyor: kırpılmış bir kartın
// içinde, karta SIĞMAYAN gerçek boyutta bir arayüz parçası duruyor; parça sağ
// kenardan taşıyor ve sol-üstten açılan radyal maskeyle sağ-alta doğru eriyor.
// Altta başlık + kısa açıklama. Paper'daki ölçüler (16px köşe, 24px metin
// bloğu, 16/14px punto, 24px satır yüksekliği) korundu.
//
// Maketler EKRAN GÖRÜNTÜSÜ DEĞİL: uygulamanın gerçek kartlarının (assistant/
// receipt-approval-card, assistant/product-match-list, assistant/optimization-
// card) statik ikizleri. Sebebi tek: görsel olsalardı temayla birlikte dönmez,
// retina'da bulanır ve arayüz her değiştiğinde bayatlardı. Burada hepsi aynı
// tasarım token'larından besleniyor.
//
// Etkileşim yok, bu yüzden sunucu bileşeni: maketler sayfaya tek bir byte JS
// eklemez. Hepsi `aria-hidden` — ekran okuyucu için başlık ve açıklama zaten
// aynı şeyi söylüyor, arayüz taklidi yalnızca gürültü olurdu.

/* ── Maketlerin ortak geometrisi ─────────────────────────────────────────────

   Üç maket de kartın üstünden AYNI boşlukta başlar, solundan 20px içeriden
   girer, sağ kenardan 20px taşar ve AYNI yükseklikte durur. Satırı az olan
   maket (Sepet Özeti) bu yüksekliği satırlarını gererek doldurur, çok olan
   alttan kırpılır; kutunun sınırları üç kartta da sabit kalır.

   Sağdaki `pr-10` (40px) taşma payından (20px) BÜYÜK: sağa yaslı fiyatlar
   taşan kısma düşüp kırpılmasın diye. Kırpılan tek şey panelin boş sağ payı,
   veri değil. */

/** Maket kutusu: pt-6 + panel h-56 = 24 + 224 = 248, yani kutu tam panelde biter. */
const MOCK_FRAME = "h-[15.5rem] pt-6 pl-5"
/** Panel: pl-5 kadar içeriden başlar, kartın sağından tam 20px taşar. */
const MOCK_PANEL = "flex h-56 w-[calc(100%+1.25rem)] flex-col"
/** Satır içi yatay ritim. */
const ROW_X = "pl-3.5 pr-10"
/** Maket başlığı — üç panelde de birebir aynı. */
const MOCK_HEADER = cn(
  "shrink-0 border-b border-white/10 py-2 text-sm font-medium text-foreground",
  ROW_X,
)

function MarketAvatar({ src, className }: { src: string; className?: string }) {
  return (
    <span
      className={cn(
        "relative flex size-7 shrink-0 overflow-hidden rounded-full bg-background ring-1 ring-white/15",
        className,
      )}
    >
      {/* alt="": kap zaten aria-hidden, logo dekoratif. */}
      <Image
        src={src}
        alt=""
        width={28}
        height={28}
        className="size-full object-contain"
        unoptimized
      />
    </span>
  )
}

/* ── 1. Kalem çıkarma (receipt-approval-card'ın ikizi) ───────────────────── */

const DRAFT_ITEMS = [
  { name: "pirinç", qty: "500", unit: "g" },
  { name: "haşlanmış nohut", qty: "200", unit: "g" },
  { name: "sıvı yağ", qty: "1", unit: "l" },
  { name: "tuz", qty: "1", unit: "paket" },
]

// Alan görünümü: gerçek Input/NativeSelect yerine aynı ölçüde statik kutular.
const FIELD =
  "rounded-md bg-black/25 px-2 py-1 text-xs text-foreground ring-1 ring-white/10"

function DraftItemsMock() {
  return (
    <>
      <div className={MOCK_HEADER}>Sepetindeki Kalemler</div>
      <div className={ROW_X}>
        {/* Sütun başlıkları ve satırlar aynı genişlik yuvalarını kullanır
            (w-11 / w-14 / w-5) — gap'e bırakılsa adet ve birim sütunları
            satırdan satıra kayardı. */}
        <div className="flex items-center gap-2 pt-1.5 pb-1 text-[0.625rem]/[0.875rem] font-medium tracking-wide text-muted-foreground uppercase">
          <span className="min-w-0 flex-1">Ürün</span>
          <span className="w-11 text-right">Adet</span>
          <span className="w-14">Birim</span>
          <span className="w-5" />
        </div>
        {DRAFT_ITEMS.map((item) => (
          <div key={item.name} className="flex items-center gap-2 pb-1">
            <span className={cn("min-w-0 flex-1 truncate", FIELD)}>
              {item.name}
            </span>
            <span className={cn("w-11 text-right tabular-nums", FIELD)}>
              {item.qty}
            </span>
            <span
              className={cn("flex w-14 items-center justify-between", FIELD)}
            >
              <span className="truncate">{item.unit}</span>
              <ChevronDownIcon className="size-3 shrink-0 text-muted-foreground" />
            </span>
            <span className="flex w-5 justify-center">
              <XIcon className="size-3.5 text-muted-foreground" />
            </span>
          </div>
        ))}
      </div>
      {/* mt-auto: kalem sayısı ne olursa olsun eylem çubuğu panelin dibinde. */}
      <div
        className={cn(
          "mt-auto flex shrink-0 items-center gap-2 border-t border-white/10 bg-black/15 py-2",
          ROW_X,
        )}
      >
        <span className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-foreground ring-1 ring-white/15">
          <PlusIcon className="size-3" />
          Yeni kalem
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
            İptal
          </span>
          <span className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
            <CheckIcon className="size-3" />
            Onayla
          </span>
        </span>
      </div>
    </>
  )
}

/* ── 2. Ürün eşleştirme (product-match-list'in ikizi) ────────────────────── */

// Ürünler, fiyatlar ve görseller uydurulmadı: nohutlu pilav sepetinin gerçek
// bir çalıştırmasından. Görseller ürünlerin marketfiyati CDN'indeki kendi
// kareleri (host next.config.mjs'te izinli).
const MATCHES = [
  {
    name: "Anadolu Mutfağı Yerli Pilavlık Pirinç 1 Kg",
    brand: "Anadolu Mutfağı",
    image: "https://cdn.marketfiyati.org.tr/sokimages/85770.png",
    market: "Şok",
    logo: "/market-logos/sok.webp",
    price: 64.5,
  },
  {
    name: "Tarım Kredi Anadolu Nohut 1 Kg",
    brand: "Tarım Kredi",
    image: "https://cdn.marketfiyati.org.tr/tarimkrediimages/104714.png",
    market: "Tarım Kredi",
    logo: "/market-logos/tarim-kredi.webp",
    price: 59.9,
  },
  {
    name: "Tarım Kredi Anadolu Ayçiçek Yağı 1 Lt",
    brand: "Tarım Kredi",
    image: "https://cdn.marketfiyati.org.tr/tarimkrediimages/108707.png",
    market: "Tarım Kredi",
    logo: "/market-logos/tarim-kredi.webp",
    price: 118,
  },
]

function ProductMatchMock() {
  return (
    <>
      <div className={MOCK_HEADER}>Eşleşen Ürünler</div>
      <div className="flex flex-1 flex-col divide-y divide-white/10">
        {MATCHES.map((match) => (
          <div
            key={match.name}
            className={cn("flex flex-1 items-center gap-2.5", ROW_X)}
          >
            {/* Paket ikonu görselin ALTINDA duruyor: CDN karesi bir gün
                düşerse kutu boş kalmaz, bileşenin gerçek fallback'ine iner. */}
            <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/25 ring-1 ring-white/10">
              <PackageIcon className="absolute size-4 text-muted-foreground" />
              <Image
                src={match.image}
                alt=""
                width={40}
                height={40}
                className="relative size-full object-contain"
                unoptimized
              />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[0.8125rem]/[1.125rem] font-medium text-foreground">
                {match.name}
              </span>
              <span className="truncate text-[0.6875rem]/[1rem] text-muted-foreground">
                {match.brand}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              <MarketAvatar src={match.logo} className="size-5" />
              <span className="flex flex-col items-end">
                <span className="text-[0.6875rem]/[1rem] text-muted-foreground">
                  {match.market}
                </span>
                <span className="text-[0.8125rem]/[1.125rem] font-semibold tabular-nums text-foreground">
                  {formatTL(match.price)}
                </span>
              </span>
            </span>
          </div>
        ))}
      </div>
    </>
  )
}

/* ── 3. Market dağılımı (optimization-card'ın ikizi) ─────────────────────── */

function OptimizationMock() {
  return (
    <>
      <div className={MOCK_HEADER}>Sepet Özeti</div>
      {/* Diğer iki maketin aksine satırlar GERİLMİYOR (`flex-1` yok): iki
          seçenek 187px'i paylaşınca satır başına 18px dikey pay düşüyordu,
          gerçek karttaki 12px'in bir buçuk katı — kart seyrek görünüyordu.
          Kendi punto ölçüsünde durup panelin dibinde kalan boşluğu bulanık
          dibe bırakıyorlar; orası zaten eriyen bölge. */}
      <div className="flex flex-col divide-y divide-white/10">
        <div className={cn("flex items-center gap-2.5 py-2.5", ROW_X)}>
          <MarketAvatar src="/market-logos/bim.webp" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[0.6875rem]/[1rem] font-medium text-muted-foreground">
              Tek market en ucuz
            </span>
            <span className="truncate text-base/[1.5rem] font-semibold text-foreground">
              BİM
            </span>
            <span className="truncate text-[0.6875rem]/[1rem] text-muted-foreground">
              3/3 kalem
            </span>
          </span>
          <span className="shrink-0 text-lg font-bold tabular-nums text-foreground">
            {formatTL(113.25)}
          </span>
          <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
        </div>

        <div className={cn("flex items-center gap-2.5 py-2.5", ROW_X)}>
          {/* İki logo AvatarGroup'taki gibi bindirmeli; halka panelin kendi
              zeminiyle aynı ki bindirme temiz kessin. */}
          <span className="flex shrink-0 -space-x-1.5">
            <MarketAvatar
              src="/market-logos/migros.webp"
              className="ring-2 ring-muted"
            />
            <MarketAvatar
              src="/market-logos/bim.webp"
              className="ring-2 ring-muted"
            />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex min-w-0 items-center gap-1 text-[0.6875rem]/[1rem] font-medium text-muted-foreground">
              <span className="truncate">İki market</span>
              <span className="flex shrink-0 items-center rounded-md border border-emerald-500/40 px-1 text-[0.625rem]/[0.875rem] text-emerald-300">
                <TrendingDownIcon className="mr-0.5 size-2.5" />
                %7,8
              </span>
            </span>
            <span className="truncate text-base/[1.5rem] font-semibold text-foreground">
              Migros + BİM
            </span>
            <span className="truncate text-[0.6875rem]/[1rem] font-medium text-emerald-300">
              {formatTL(8.8)} tasarruf
            </span>
          </span>
          <span className="shrink-0 text-lg font-bold tabular-nums text-foreground">
            {formatTL(104.45)}
          </span>
          <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
        </div>
      </div>
    </>
  )
}

/* ── Kart kabuğu ─────────────────────────────────────────────────────────── */

type Feature = {
  title: string
  description: string
  mock: React.ReactNode
}

const FEATURES: Feature[] = [
  {
    title: "Aklındaki tarifi yaz",
    description:
      "Tarifini yaz ya da fişini yükle. Sepetindeki kalemleri tek tek çıkarırız.",
    mock: <DraftItemsMock />,
  },
  {
    title: "Kalemlerini eşleştir",
    description:
      "Senin için en doğru ürünü eşleştirir, en hesaplı marketi buluruz.",
    mock: <ProductMatchMock />,
  },
  {
    title: "Market seçeneklerini gör",
    description:
      "Tek market ya da iki market ile en hesaplı sepeti oluştururuz.",
    mock: <OptimizationMock />,
  },
]

function FeatureCard({ feature }: { feature: Feature }) {
  return (
    // Maket AKIŞTA duruyor, `absolute` değil: metin bloğunun yüksekliği
    // başlığın kaç satır sardığına göre değişiyor ve konumlanmış bir maket
    // dar kartlarda metnin ÜSTÜNE biniyordu. Akışta maketin kutusu sabit,
    // metin her zaman onun altından başlıyor.
    //
    // Kenar + gölge tek katmanda (smooth-shadow-ring): ayrıca `border`
    // EKLENMEZ, halka zaten gölgenin içinde. `smooth-ring-border` şart —
    // bu bölüm sayfa içi bir `dark` sarmalayıcıda ve plugin'in nötr beyaz
    // halkası yoksa kazanıyor (bkz. logo-marquee'deki uzun not).
    <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-card smooth-shadow-ring-sm smooth-ring-border">
      {/* Maket kutusu. Radyal maske sol-üstten açılıp sağ-alta doğru eritir. */}
      <div
        aria-hidden
        className={cn(
          "relative shrink-0 overflow-hidden",
          "[mask-image:radial-gradient(140%_130%_at_0%_0%,#000_60%,transparent_100%)]",
          MOCK_FRAME,
        )}
      >
        <div
          className={cn(
            "overflow-hidden rounded-xl bg-muted smooth-shadow-ring-lg smooth-ring-white/15",
            MOCK_PANEL,
          )}
        >
          {feature.mock}
        </div>
        {/* Bulanık dip. Üç iş birden yapıyor, üçü de aynı rampada:

            1. `backdrop-blur` arkasını kademeli bulandırır — radyal maske yalnız
               SÖNDÜRÜYORDU, kesildiği yerde satır kenarları keskin kalıyordu.
            2. `bg-gradient` aynı yerde zemini kart rengine çeker. Yalnız
               bulanıklık yetmiyordu: silik de olsa net renkli lekeler (fiyatlar,
               market logoları) hemen altındaki başlıkla yarışıyordu. Renkle
               karışınca maket kartın zeminine dönüşüyor, metin temiz bir yüzeyde
               başlıyor.
            3. Dip yumuşadığı için kutuyu kısaltıp metni yukarı alabildik.

            Saydam uç `from-card/0`: düz `transparent` saydam SİYAHTIR, oklab
            interpolasyonunda çamurlu bir bant açardı (aynı sebep globals.css'te
            --home-base-clear'ın var oluş sebebi).

            `backdrop-blur` burada güvenli: maskeli ata kendi backdrop kökünü
            kurar, bulanıklık yalnız o kutunun içindekini örnekler, kartın
            zeminine taşmaz. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-card/0 to-card backdrop-blur-lg [mask-image:linear-gradient(to_bottom,transparent,#000_70%)]" />
      </div>

      <div className="relative -mt-[1.625rem] px-5 pb-5 sm:px-6 sm:pb-6">
        <h3 className="text-base font-semibold tracking-tight text-balance text-foreground">
          {feature.title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-pretty text-muted-foreground">
          {feature.description}
        </p>
      </div>
    </article>
  )
}

export function HomeFeaturesSection() {
  return (
    // Kap ölçüsü şerit, blog ve footer ile birebir aynı (max-w-5xl px-4);
    // `dark` metin/kart paletini koyu tutar — bölüm zemini her iki temada da
    // --home-base olduğu için.
    <div className="dark mx-auto w-full max-w-5xl px-4 pt-10 text-foreground md:pt-14">
      {/* Başlık + eylem satırı blog bölümüyle aynı kalıpta: iki bölüm arka
          arkaya geldiği için aynı ritmi paylaşmaları gerekiyor. */}
      <AnimateEnter className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight text-balance text-foreground">
          Belirle. Eşleştir. Tasarruf et.
        </h2>
        <PressFx className="shrink-0">
          <Button asChild size="sm" className="group shrink-0">
            <Link href="/asistan">
              Asistanı dene
              <ArrowRight
                className="transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </Button>
        </PressFx>
      </AnimateEnter>

      {/* lg altında tek sütun: üç sütuna sıkışan kartta maketin fiyat sütunu
          okunmaz hâle geliyordu. */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {FEATURES.map((feature, i) => (
          <AnimateEnter
            key={feature.title}
            delay={stagger(i)}
            className="h-full"
          >
            <FeatureCard feature={feature} />
          </AnimateEnter>
        ))}
      </div>
    </div>
  )
}
