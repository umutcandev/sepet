Sitenin self-host edilen bütün font dosyaları bu klasörde durur; hepsi
`lib/fonts.ts` üzerinden `next/font/local` ile tanımlanır. İki aile var:
arayüzün tamamını taşıyan **Geist** ve yalnız ana sayfanın iki büyük cümlesinde
kullanılan vitrin yüzü **Cooper**.

# Geist / Geist Mono (self-hosted)

Kaynak: [vercel/geist-font](https://github.com/vercel/geist-font) —
`fonts/Geist` ve `fonts/GeistMono`. Buradaki dosyalar Vercel'in aynı repodan
yayınladığı `geist@1.7.2` dağıtımından alınmıştır (`dist/fonts/geist-sans`,
`dist/fonts/geist-mono`).

Sürümler: Geist 1.800, Geist Mono 1.700. Lisans: SIL OFL 1.1 (`LICENSE.txt`).
Lisans, fontlar yeniden dağıtıldığında telif ve lisans metninin de birlikte
taşınmasını şart koşar; `LICENSE.txt` bu yüzden burada duruyor.

## Neden self-host

Önceden `next/font/google` + `subsets: ["latin"]` kullanılıyordu. Google'ın
`latin` unicode-range'i `U+0000-00FF, U+0131, U+0152-0153, …` — yani `ı ç ö ü`
kapsanıyor ama **`ğ Ğ ş Ş İ` kapsanmıyor**; onlar `latin-ext` alt kümesinde.
Türkçe bir sitede tam da Türkçe harfler sistem fontundan çiziliyordu (aynı
kusur Mono'da da vardı, kod bloklarındaki Türkçe yorumlar karışık fontla
render oluyordu).

Self-host edilen dosyalar alt kümelenmemiştir: her ikisi de tam karakter
setini taşır (Geist 728, Geist Mono 889 kod noktası), Türkçe harflerin hepsi
içeride. Böylece subset seçimi diye bir karar noktası kalmıyor.

> Not: `₺` (U+20BA) **ne Geist'te ne de Geist Mono'da** yok; her iki ailede de
> sistem yedeğine düşer. Bkz. `components/subscription/plan-cards.tsx`.

## Dosyalar

| Dosya | Kullanım |
| --- | --- |
| `Geist-Variable.woff2` | Tarayıcı — `lib/fonts.ts`, `--font-sans` (wght 100–900) |
| `GeistMono-Variable.woff2` | Tarayıcı — `lib/fonts.ts`, `--font-mono` (wght 100–900) |
| `Geist-Regular.ttf` | `app/blog/[slug]/opengraph-image.tsx` (weight 400) |
| `Geist-SemiBold.ttf` | `app/blog/[slug]/opengraph-image.tsx` (weight 600) |

Tarayıcı tarafı yalnız woff2: 2016'dan beri evrensel destekli, en küçük çıktı.
`woff`/`otf`/`ttf` tarayıcı için gereksiz ağırlık olurdu. OG tarafında ise TTF
zorunlu — Satori woff2 çözemez, yalnız ttf/otf/woff kabul eder.

Değişken (variable) sürümler tercih edildi: site 400/500/600/700 ağırlıklarını
birlikte kullanıyor, tek değişken dosya dört statik dosyadan hafif kalıyor.

İtalik yüzler bilinçli olarak alınmadı. `next/font/local` bir ailedeki tüm
dosyaları preload eder; italik variable woff2 her sayfaya ~70 KB ekler ve şu an
içerikte hiç italik kullanımı yok. Gerçek italik gerekirse
`Geist-Italic[wght].woff2` / `GeistMono-Italic[wght].woff2` aynı kaynaktan
eklenip `lib/fonts.ts`'te `style: "italic"` girdisi olarak tanımlanabilir.

# Cooper (vitrin yüzü)

Dosyaların taşıdığı ad `Cooper Lt BT` (Bitstream'in Cooper Light kesimi; name
tablosundaki sürüm damgaları 1992–93). Ağırlık sınıfları dosya adlarıyla
uyumlu: `Cooper-400.woff2` → `usWeightClass 400`, `Cooper-600.woff2` → 600.

> Dosyaların içinde lisans (name ID 13/14) ya da üretici alanı YOK. Geist'in
> aksine bu aile için repoda dayanak bir lisans metni yok; Cooper Light ticari
> bir kesim, dağıtım hakkı ayrıca doğrulanmalı. Gerekirse lisanslı bir kopya
> veya açık lisanslı bir muadille (ör. Cooper Hewitt değil — o gotik; benzer
> yumuşak serif için Bitter/Zilla Slab) değiştirilir.

## Nerede kullanılıyor

Yalnız ana sayfanın iki büyük cümlesinde:

| Yer | Metin |
| --- | --- |
| `components/home/home-hero.tsx` | `… , alışveriş listesi yapalım mı?` (dönen h1) |
| `components/home/home-cta-section.tsx` | `Hemen Sepet'i dene.` |

Bağlantı: `lib/fonts.ts` → `--font-display` → app/globals.css.

Kullanılacak sınıf **`cn-font-display`**: yüzü uygular ve optik ayarlarını da
birlikte getirir — harf aralığı `-0.0167em`, satır yüksekliği `1.06`
(tasarımdaki %106 ve -0.5px değerleri; aralık 30px taban punto üzerinden em'e
çevrildi, punto basamakları arasında oran korunsun diye). `--font-display`
token'ı ayrıca çıplak bir `font-display` utility'si de üretir; onu yalnız optik
ayarları bilerek istemediğin bir yerde kullan.

Harf aralığını değiştirirsen hero'nun punto/kap basamakları ve h1'in yükseklik
rezervi de gözden geçirilmeli: aralık gevşedikçe en uzun dönen başlık uzuyor,
tek satıra sığmayıp ikiye düşebiliyor ve rotasyonda kabın boyu oynuyor. İkisi de
`components/home/home-hero.tsx` içinde, gerekçeleriyle birlikte.

**`--font-heading` ile karıştırma:** o hâlâ `--font-sans`a eşit ve
`cn-font-heading` üzerinden bir düzine kart/dialog başlığını besliyor; onlar
Geist kalmalı.

## Ağırlık: şimdilik yalnız 400

`lib/fonts.ts`te sadece `Cooper-400.woff2` kayıtlı. `Cooper-600.woff2` burada
duruyor ama bilinçli olarak kaydedilmedi — italik yüzlerdeki gerekçenin aynısı:
next/font ailedeki tüm dosyaları preload eder, kullanılmayan bir ağırlık her
sayfaya ~25 KB bindirir. Gerçekten gerekirse `src` bir diziye çevrilir:

```ts
src: [
  { path: "../fonts/Cooper-400.woff2", weight: "400", style: "normal" },
  { path: "../fonts/Cooper-600.woff2", weight: "600", style: "normal" },
]
```

Bu yapılana kadar bu yüzle `font-semibold`/`font-bold` KULLANMA: ailede tek
ağırlık var, tarayıcı sahte (sentetik) bold çizer. İki başlık da bu yüzden
`font-normal`a çekildi.

## Karakter kümesi

257 kod noktası: `U+0020-007E`, `U+00A0-00FF` ve Türkçe için gereken
`Ğ ğ İ ı Ş ş` dâhil seçili Latin Extended-A. Yani Geist'te olduğu gibi burada da
Türkçe harfler sistem fontuna düşmez, kesme işareti (`'` ve `’`) de içeride.

Buna karşılık kapsam Latin-1 civarıyla sınırlı — bu bir başlık yüzü, arayüzün
genelinde kullanmaya uygun değil. `₺` (U+20BA) burada da yok (Geist'te de yoktu).
