"use client"

// Panoya kopyalama: güvenli bağlam yoksa (clipboard API yok) gizli bir textarea'ya
// düşer. Kullanıcı hareketi (tıklama) içinde çağrıldığı için her iki yol da çalışır.
//
// Blog'un `article-actions` dosyasından buraya taşındı: marka menüsü de aynı
// yardımcıya ihtiyaç duyuyor ve onun için blog bileşenini import etmek gereksiz
// bir bağımlılık olurdu. `article-actions` bunu yeniden dışa aktarmayı sürdürür,
// böylece mevcut import'lar kırılmaz.
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // textarea fallback'e düş
  }
  try {
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand("copy")
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}
