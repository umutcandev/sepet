import { ProductSearchPage } from "@/components/product-search-page"

export const metadata = {
  title: "Ürün Ara",
  description:
    "Binlerce market ürünü arasında fiyat karşılaştırması yap, en uygun ürünü bul.",
}

// `?q=` ile derin link: kayıt sayfalarındaki eşleşmeyen kalemler buraya bağlanır
// ve arama paylaşılabilir hale gelir.
const MAX_QUERY_LENGTH = 100

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const initialQuery = typeof q === "string" ? q.slice(0, MAX_QUERY_LENGTH) : ""

  return <ProductSearchPage initialQuery={initialQuery} />
}
