// Dışa aktarma veri kategorileri — istemci-güvenli (sunucu bağımlılığı yok).
// Hem export modalı (client) hem route (server) hem de export oluşturucu bu tek
// kaynağı kullanır; böylece liste tek yerde tanımlı kalır.

export type ExportCategory = "profil" | "sepetler" | "fisler" | "sohbetler"

export const EXPORT_CATEGORIES: ExportCategory[] = [
  "profil",
  "sepetler",
  "fisler",
  "sohbetler",
]

export function isExportCategory(v: unknown): v is ExportCategory {
  return typeof v === "string" && (EXPORT_CATEGORIES as string[]).includes(v)
}
