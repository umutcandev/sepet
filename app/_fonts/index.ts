import localFont from "next/font/local"

// Arayüz tipografisinin tek kaynağı. Dosyalar repoda duruyor (bkz. README.md);
// next/font build'de bunları hash'li olarak `/_next/static/media/` altına taşır,
// yani font istekleri kendi origin'imizden gider ve CSP'deki
// `font-src 'self' data:` (lib/security/headers.ts) yeterli kalır.

/**
 * Hasköy: arayüz ve başlık fontu (`--font-sans`, `--font-heading`).
 *
 * Tek değişken eksen dosyası (wght 100-800) tüm ağırlıkları karşılar ve Latin
 * Extended'ı bütün olarak içerir, yani `ğ ş İ Ğ Ş` gibi Türkçe harfler de bu
 * dosyadan gelir.
 *
 * Italik yüz eklenmedi: next/font `src` dizisindeki her dosyayı preload ettiği
 * için gerçek italik kritik yola ~38 KB bindirirdi. Sayılı italik kullanımında
 * tarayıcı eğik (oblique) sentezler.
 */
export const fontSans = localFont({
  src: "./Haskoy-Variable.woff2",
  weight: "100 800",
  style: "normal",
  display: "swap",
  variable: "--font-sans",
  fallback: [
    "system-ui",
    "-apple-system",
    "Segoe UI",
    "Roboto",
    "Helvetica Neue",
    "Arial",
    "sans-serif",
  ],
})

/**
 * Geist Mono: blog kod blokları (Tailwind preflight `code, kbd, samp, pre`i
 * `--font-mono`a bağlar), `font-mono` yardımcı sınıfı ve tabular rakam kullanan
 * rozet/fiyat alanları.
 *
 * `preload: false`: dosya 70 KB ve mono metin kritik yolda değil (kod blokları
 * yazı sayfalarında, ⌘B ipucu mobilde `display:none`). Preload etmemek Hasköy'ü
 * bant genişliği yarışından kurtarır; `display: swap` geçişi kapatır.
 *
 * `adjustFontFallback: false`: next/font yerel fontlarda yedek metriği yalnız
 * Arial veya Times New Roman'dan üretebiliyor. Mono bir yüzü orantılı bir fonta
 * bağlamak kod bloklarında hizayı bozacağı için yedek elle veriliyor.
 */
export const fontMono = localFont({
  src: "./GeistMono-Variable.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-mono",
  preload: false,
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
