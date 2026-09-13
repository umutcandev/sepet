/**
 * Proje geneli motion sabitleri.
 *
 * Amaç tek bir hareket dili: aynı eğri ve aynı yay ayarı her yerde tekrar
 * yazılmak yerine buradan gelir. Daha önce `slide` yayı hero rozetinde ve
 * kapanış CTA'sında birebir kopyalanmıştı; ikisi de artık `SPRING_SLIDE`
 * kullanıyor, dolayısıyla biri değiştiğinde diğeri sessizce ayrışmıyor.
 *
 * CSS tarafındaki karşılığı `app/globals.css` içindeki `enter-fx`
 * utility'sinde duruyor — oradaki `cubic-bezier` değerleri
 * `EASE_OUT_EXPO` ile aynı sayılardır, biri güncellenirse diğeri de
 * güncellenmelidir.
 */

/**
 * Giriş/reveal eğrisi (expo-out). Hareketin büyük kısmı ilk anda biter, kalanı
 * uzun bir kuyrukta oturur — "yumuşak ama tembel değil" hissinin kaynağı.
 * `as const` KULLANILMAZ: motion'ın `Easing` tipi değiştirilebilir bir dörtlü
 * bekler, readonly tuple atanamaz.
 */
export const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]

/**
 * Kısa mesafeli, dekoratif geçişler (alt çizgi, fiyat odometresi) için biraz
 * daha yumuşak inen expo-out varyantı. Projede zaten kullanılan değerdir.
 */
export const EASE_OUT_SOFT: [number, number, number, number] = [
  0.22, 1, 0.36, 1,
]

/**
 * Kayan pencere / liste öğesi giriş-çıkışı. Hızlı ve net; zıplamaz.
 * (hero-market-badge, home-cta-section)
 */
export const SPRING_SLIDE = {
  type: "spring",
  stiffness: 460,
  damping: 34,
  mass: 0.7,
} as const

/**
 * Buton kaldırma/basma jesti. Aşırı sönümlü — zıplama YOK. "Premium" hissi
 * veren şey tam olarak yayın zıplamaması; zıplama yalnızca ikon boyutundaki
 * küçük jestlere yakışır.
 */
export const SPRING_PRESS = {
  type: "spring",
  stiffness: 400,
  damping: 26,
  mass: 0.6,
} as const

/**
 * Segmented control / tab pill kayması. Ölçülebilir bir tık yumuşak.
 */
export const SPRING_PILL = {
  type: "spring",
  bounce: 0.2,
  duration: 0.5,
} as const

/**
 * Ana sayfa açılış dizisi — HERO + HEMEN ALTINDAKİ MARKET MOZAİĞİ.
 *
 * Dizi eskiden kapanış CTA'sına kadar iniyordu ve son adım 2,06s'de
 * başlıyordu. O adımların çoğu ekran DIŞINDA oynuyordu: ilk saniyelerde aşağı
 * kaydıran biri bölümleri tam girerken yakalayıp bunu kaydırmaya bağlı bir
 * reveal sanıyordu. Mozaiğin altında kalan her şey artık animasyonsuz, ilk
 * boyamada yerinde.
 *
 * BURAYA YENİ ADIM EKLENMEZ. Ölçü şu: öğe açılışta göz önünde mi. Mozaik
 * hero'nun dibine biniyor ve uzun ekranlarda daha ilk karede görünüyor, o
 * yüzden dizinin parçası. Daha aşağısı görünmez, ve görünmeyen yerde oynayan
 * her giriş aynı yanılsamayı geri getirir.
 *
 * Toplam 1,1s'de biter (son adım 0,5 + 0,6s süre).
 */
export const HOME_ENTER = {
  heroBadge: 0.1,
  heroTitle: 0.2,
  heroPrompt: 0.3,
  heroChips: 0.4,
  markets: 0.5,
}
