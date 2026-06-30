// Blog kategorileri — kodda sabit, type-safe taksonomi (Vercel/Upstash/Stripe
// modeli). CMS'te dinamik tablo yerine enum: kategori seti nadiren değişir,
// build tamamen statik kalır, yanlış kategori Velite şemasında build'i kırar.
// Yeni kategori = buraya tek satır.

export const CATEGORIES = {
  teknik: {
    label: "Teknik",
    slug: "teknik",
    description:
      "Sepet'in altyapısı, yapay zekâ destekli pipeline'ı ve fiyat verisinden çıkan içgörüler üzerine mühendislik yazıları.",
  },
  saglik: {
    label: "Sağlık",
    slug: "saglik",
    description:
      "Fizyoterapi, rehabilitasyon ve günlük yaşam sağlığı: hareket, duruş ve beslenme üzerine uzman yazıları.",
  },
  kesisim: {
    label: "Kesişim",
    slug: "kesisim",
    description:
      "Bütçe ile sağlığın buluştuğu yer: fiyat bilen yapay zekâ ile sağlık bilgisini birleştiren ortak yazılar.",
  },
} as const

export type CategoryId = keyof typeof CATEGORIES
export type Category = (typeof CATEGORIES)[CategoryId]

// Velite şeması `s.enum(CATEGORY_IDS)` için tuple; en az bir eleman garanti.
export const CATEGORY_IDS = Object.keys(CATEGORIES) as [
  CategoryId,
  ...CategoryId[],
]

export const CATEGORY_LIST = CATEGORY_IDS.map((id) => ({
  id,
  ...CATEGORIES[id],
}))

export function getCategory(id: CategoryId): Category {
  return CATEGORIES[id]
}

export function isCategoryId(value: string): value is CategoryId {
  return value in CATEGORIES
}
