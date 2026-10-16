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

/**
 * Henüz elde olmayan bir metni kopyalar (ör. sunucunun döndüreceği paylaşım
 * bağlantısı). Safari, bir `await`ten sonra yapılan pano yazımını kullanıcı
 * hareketinin dışında sayıp reddediyor; `ClipboardItem`e Promise vermek
 * yazımı tıklama anında başlatır, içerik sonra gelir. Desteklenmeyen
 * tarayıcıda metin gelince normal kopyalamaya düşer. Promise reddedilir ya da
 * null dönerse hiçbir şey kopyalanmaz.
 */
export async function copyTextWhenReady(
  text: Promise<string | null>
): Promise<boolean> {
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": text.then((value) => {
            if (value == null) throw new Error("no_text")
            return new Blob([value], { type: "text/plain" })
          }),
        }),
      ])
      return true
    } catch {
      // aşağıdaki yola düş
    }
  }
  const value = await text.catch(() => null)
  return value != null ? copyText(value) : false
}
