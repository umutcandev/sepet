/**
 * Sohbet listesi sıralama anahtarları. Hem sunucu sorgusu (orderBy) hem de
 * /sohbetler sayfasındaki sıralama menüsü bunu kullanır. Sıralama SUNUCU
 * tarafında uygulanır; infinite scroll ile yeni sayfalar aynı sırayla geldiği
 * için kullanıcı aşağı kaydırdığında sıra bozulmaz.
 */
export type ConversationSort = "date_desc" | "date_asc" | "name_asc" | "name_desc"

export const DEFAULT_CONVERSATION_SORT: ConversationSort = "date_desc"

// Etiket, ortadaki ok bir kütüphane ikonu (lucide ArrowRight) olacak şekilde
// "prefix → suffix" olarak parçalanır; menüde ikon iki parçanın arasına girer.
export const CONVERSATION_SORTS: ReadonlyArray<{
  value: ConversationSort
  prefix: string
  suffix: string
}> = [
  { value: "date_desc", prefix: "Tarih (yeni", suffix: "eski)" },
  { value: "date_asc", prefix: "Tarih (eski", suffix: "yeni)" },
  { value: "name_asc", prefix: "İsim (A", suffix: "Z)" },
  { value: "name_desc", prefix: "İsim (Z", suffix: "A)" },
]
