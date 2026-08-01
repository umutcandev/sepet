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
