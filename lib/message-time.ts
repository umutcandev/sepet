import { format, isSameDay, isSameYear, subDays } from "date-fns"
import { tr } from "date-fns/locale"

/**
 * Sohbetteki mesajın altındaki kısa zaman etiketi.
 *  - Bugün → "14:32"
 *  - Dün → "Dün 14:32"
 *  - Aynı yıl → "12 Eki 14:32"
 *  - Daha eski → "12 Eki 2025 14:32"
 * Saat dilimi tarayıcınınki: etiket yalnızca istemcide çizilir (bkz.
 * MessageTime), sunucunun UTC'si hiç görünmez. Geçersiz tarih boş döner.
 */
export function formatMessageTime(
  input: Date | string | number,
  now: Date = new Date()
): string {
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return ""
  const time = format(d, "HH:mm")
  if (isSameDay(d, now)) return time
  if (isSameDay(d, subDays(now, 1))) return `Dün ${time}`
  return format(d, isSameYear(d, now) ? "d MMM HH:mm" : "d MMM yyyy HH:mm", {
    locale: tr,
  })
}

/** Üstüne gelince görünen tam hâli: "16 Ekim 2026 Cuma, 14:32". */
export function formatMessageTimeFull(input: Date | string | number): string {
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return ""
  return format(d, "d MMMM yyyy EEEE, HH:mm", { locale: tr })
}
