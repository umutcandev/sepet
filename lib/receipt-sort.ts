/**
 * Fiş listesi sıralama anahtarları. Hem sunucu sorgusu (orderBy) hem de
 * /fis-gecmisi sayfasındaki sıralama menüsü bunu kullanır. Sıralama SUNUCU
 * tarafında uygulanır; infinite scroll ile yeni sayfalar aynı sırayla geldiği
 * için kullanıcı aşağı kaydırdığında sıra bozulmaz. Tarih sıralaması, listenin
 * varsayılan düzeniyle (ve `receipt_user_created_idx` indeksiyle) tutarlı
 * olması için `createdAt` üzerinden yapılır.
 */
export type ReceiptSort = "date_desc" | "date_asc" | "market_asc" | "market_desc"

export const DEFAULT_RECEIPT_SORT: ReceiptSort = "date_desc"

// Etiket, ortadaki ok bir kütüphane ikonu (lucide ArrowRight) olacak şekilde
// "prefix → suffix" olarak parçalanır; menüde ikon iki parçanın arasına girer.
export const RECEIPT_SORTS: ReadonlyArray<{
  value: ReceiptSort
  prefix: string
  suffix: string
}> = [
  { value: "date_desc", prefix: "Tarih (yeni", suffix: "eski)" },
  { value: "date_asc", prefix: "Tarih (eski", suffix: "yeni)" },
  { value: "market_asc", prefix: "Market (A", suffix: "Z)" },
  { value: "market_desc", prefix: "Market (Z", suffix: "A)" },
]
