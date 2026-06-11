import { differenceInCalendarDays, format, isToday, isYesterday } from "date-fns"
import { tr } from "date-fns/locale"

/**
 * Sohbet listesi için kısa, Türkçe tarih etiketi.
 *  - Bugün / Dün → kelimeyle
 *  - 7 günden yeni → "N gün önce"
 *  - Aynı yıl → "5 Haz"
 *  - Daha eski → "5 Haz 2025"
 * Geçersiz tarih boş string döndürür.
 */
export function formatConversationDate(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input
  if (Number.isNaN(d.getTime())) return ""

  if (isToday(d)) return "Bugün"
  if (isYesterday(d)) return "Dün"

  const days = differenceInCalendarDays(new Date(), d)
  if (days > 1 && days < 7) return `${days} gün önce`

  const sameYear = d.getFullYear() === new Date().getFullYear()
  return format(d, sameYear ? "d MMM" : "d MMM yyyy", { locale: tr })
}
