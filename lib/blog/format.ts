import { format } from "date-fns"
import { tr } from "date-fns/locale"

/** "24 Haziran 2026" — yazı başlığı ve yazar kutusu için. */
export function formatPostDate(iso: string): string {
  return format(new Date(iso), "d MMMM yyyy", { locale: tr })
}

/** "24 Haz" — index/grid kartları için kısa biçim. */
export function formatPostDateShort(iso: string): string {
  return format(new Date(iso), "d MMM", { locale: tr })
}

/** "24 Haz 2026" — arama sonucu satırı için orta biçim (yıl dâhil). */
export function formatPostDateMedium(iso: string): string {
  return format(new Date(iso), "d MMM yyyy", { locale: tr })
}
