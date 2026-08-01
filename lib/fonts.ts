import localFont from "next/font/local"

// Geist ve Geist Mono self-host edilir (bkz. fonts/README.md). Daha önce
// `next/font/google` + `subsets: ["latin"]` kullanılıyordu; Google'ın `latin`
// unicode-range'i `ğ Ğ ş Ş İ` içermez (onlar `latin-ext`), yani Türkçe bir
// sitede tam da Türkçe harfler sistem fontundan çiziliyordu. Repodaki dosyalar
// alt kümelenmemiş tam karakter setidir, o yüzden burada subset kavramı yok.

// next/font üretilen @font-face'in aile adını DEĞİŞKEN ADINDAN türetir, yani
// hesaplanmış `font-family` burada `geistSans` / `geistMono` olarak görünür.
// Adları bu yüzden fonta göre seçildi; devtools'ta ne olduğu okunabilsin.

// Değişken (variable) yüzler: site 400–700 arasını birlikte kullanıyor, tek
// dosya ayrı statik ağırlıklardan hafif. `fallback` listesi next/font'un
// ürettiği `--font-*` değerine yazılır; metrik-uyumlu ara yüz (size-adjust'lı
// Arial türevi) next/font tarafından bunun önüne eklenir → font yüklenene dek
// layout kayması (CLS) sınırlı kalır.
export const geistSans = localFont({
  src: "../fonts/Geist-Variable.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-sans",
  display: "swap",
  fallback: [
    "ui-sans-serif",
    "system-ui",
    "-apple-system",
    "Segoe UI",
    "Roboto",
    "Helvetica Neue",
    "Arial",
    "sans-serif",
  ],
})

// Mono için otomatik metrik yedeği kapalı: next/font o yedeği Arial (orantılı
// bir yüz) metriklerinden türetir, monospace bir aile için yanlış bir taban
// olur. Yedek zinciri aşağıdaki gerçek monospace listesidir.
export const geistMono = localFont({
  src: "../fonts/GeistMono-Variable.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-mono",
  display: "swap",
  adjustFontFallback: false,
  fallback: [
    "ui-monospace",
    "SFMono-Regular",
    "Menlo",
    "Consolas",
    "Liberation Mono",
    "monospace",
  ],
})
