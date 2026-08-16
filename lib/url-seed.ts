/**
 * URL sorgu parametresini İSTEMCİDE, senkron okur.
 *
 * Neden `searchParams` prop'u değil: sayfa bileşeninde `searchParams`i await
 * etmek rotayı dinamik hale getiriyor (`ƒ`), yani `/asistan` ve `/urun-ara` her
 * istekte sunucuda render ediliyor ve CDN'den düşüyordu. İkisinin de sunucudan
 * aldığı bir şey yok — gövdeleri zaten istemci bileşeni; parametrenin tek işi
 * bir input'u doldurmak. Sayfalar böylece statik prerender'a geri döndü.
 *
 * Neden `useSearchParams()` değil: statik render'da onu kullanan her ağaç bir
 * `<Suspense>` sınırı istiyor, yoksa sayfa tümden istemci render'ına düşüyor —
 * kaçınmak istediğimiz maliyetin başka bir biçimi.
 *
 * SSR'da `window` yok → `null`. Bu yüzden `useState` BAŞLATICISINDA çağırma:
 * sunucu boş, istemcinin ilk render'ı dolu bir alan basar ve hidrasyon
 * uyuşmazlığı doğar. İki güvenli yol var, ikisi de bu projede kullanılıyor:
 *
 *   1. Efekt içinde oku, sonucu state'e yaz (ProductSearchPage) — arama zaten
 *      mount sonrası başlıyor.
 *   2. `useMounted()` ile render sırasında türet (AssistantChat) — hidrasyona
 *      dek boş, sonrasında dolu; efektte setState gerekmez.
 *
 * SINIR: aynı rotada kalıp yalnız sorgu değiştiğinde bileşen yeniden mount
 * olmayabilir, o durumda yeni değer okunmaz. Bu bağlantıların hepsi BAŞKA
 * rotalardan geldiği için (kayıt detayı → arama / asistan) pratikte oluşmuyor.
 */
export function readQueryParam(name: string, maxLength: number): string | null {
  if (typeof window === "undefined") return null
  const raw = new URLSearchParams(window.location.search).get(name)
  const trimmed = raw?.trim()
  if (!trimmed) return null
  return trimmed.slice(0, maxLength)
}

/** Kayıtlı sepetten "Fiyatları yenile" ile gelen liste (`/asistan?liste=`). */
export const SEED_LIST_PARAM = "liste"
export const SEED_LIST_MAX = 2000

/** Eşleşmeyen kalemden "Kendin ara" ile gelen sorgu (`/urun-ara?q=`). */
export const SEARCH_QUERY_PARAM = "q"
export const SEARCH_QUERY_MAX = 100
