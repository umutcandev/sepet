import { ProductSearchPage } from "@/components/product-search-page"

export const metadata = {
  title: "Ürün Ara",
  description:
    "Binlerce market ürünü arasında fiyat karşılaştırması yap, en uygun ürünü bul.",
}

// `?q=` derin linki istemcide okunuyor — bkz. lib/url-seed.ts. `searchParams`
// await etmek rotayı dinamik yapıyordu; sayfanın sunucudan aldığı bir şey yok.
export default function SearchPage() {
  return <ProductSearchPage />
}
