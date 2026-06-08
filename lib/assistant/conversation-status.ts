/**
 * Bir sohbetin sidebar'da gösterilecek kalıcı durumu.
 *
 * - `awaiting`  → asistan turn'ü kullanıcıdan bir aksiyon bekleyen bir kartla
 *                 bitti (sepet/fiş onayı). Sidebar'da "draft" (kesik çizgi)
 *                 ikonu gösterilir.
 * - `completed` → asistan turn'ü terminal bir sonuçla bitti (karşılaştırma /
 *                 optimizasyon / kapanış mesajı). Sidebar'da baloncuk ikonu.
 *
 * Aktif olarak stream edilen sohbet bu durumdan bağımsız olarak istemci tarafı
 * `streaming` bayrağıyla (üç nokta animasyonu) gösterilir.
 */
export type ConversationStatus = "awaiting" | "completed"

export const DEFAULT_CONVERSATION_STATUS: ConversationStatus = "awaiting"
