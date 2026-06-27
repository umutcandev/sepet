/**
 * Browser-side helpers for uploading an attached image to R2 before it is sent
 * to the assistant. Shared by the prompt input (upload-on-attach) and any other
 * client that needs to push a data:/blob: URL to /api/receipts/upload.
 */

/**
 * Convert any browser-side URL (data: or blob:) into a usable Blob.
 * Falls back gracefully if fetch fails (e.g. revoked blob URL).
 */
export async function urlToBlob(url: string, mimeType: string): Promise<Blob> {
  if (url.startsWith("data:")) {
    try {
      const [meta, b64] = url.split(",", 2)
      const mime = meta.match(/:(.*?);/)?.[1] ?? mimeType
      const raw = atob(b64)
      const arr = new Uint8Array(raw.length)
      for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
      return new Blob([arr], { type: mime })
    } catch {
      throw new Error("Data URL çözümlenemedi.")
    }
  }

  if (url.startsWith("blob:")) {
    try {
      return await (await fetch(url)).blob()
    } catch {
      throw new Error(
        "Dosya okunamadı — muhtemelen zaman aşımına uğradı. Lütfen tekrar yükle.",
      )
    }
  }

  try {
    return await (await fetch(url)).blob()
  } catch {
    throw new Error("Dosya indirilemedi.")
  }
}

export async function uploadReceiptImage(
  file: {
    url?: string
    mediaType?: string
    filename?: string
  },
  options?: {
    /** Yükleme ilerlemesi (gerçek byte sayacı, XHR upload.onprogress). */
    onProgress?: (loaded: number, total: number) => void
  },
): Promise<{ key: string; publicUrl: string; size: number }> {
  const url = file.url
  const mediaType = file.mediaType
  if (!url || !mediaType) {
    throw new Error("Geçersiz dosya.")
  }

  const blob = await urlToBlob(url, mediaType)
  // `blob.size` yüklenen dosyanın tam byte uzunluğudur — gösterilen boyutun
  // doğru kaynağı budur (sunucu boyutu geri döndürmüyor).
  const size = blob.size

  // fetch upload ilerlemesini raporlamadığı için XHR kullanıyoruz.
  const { key, publicUrl } = await new Promise<{
    key: string
    publicUrl: string
  }>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", "/api/receipts/upload")
    xhr.responseType = "json"
    xhr.setRequestHeader("Content-Type", mediaType)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) options?.onProgress?.(e.loaded, e.total)
    }

    xhr.onload = () => {
      const data = xhr.response as
        | { key?: string; publicUrl?: string; message?: string }
        | null
      if (xhr.status >= 200 && xhr.status < 300) {
        if (data?.key && data?.publicUrl) {
          resolve({ key: data.key, publicUrl: data.publicUrl })
        } else {
          reject(new Error("Yükleme yanıtı geçersiz."))
        }
      } else {
        reject(new Error(data?.message ?? "Yükleme reddedildi."))
      }
    }

    xhr.onerror = () => reject(new Error("Ağ hatası — yükleme başarısız."))
    xhr.onabort = () => reject(new Error("Yükleme iptal edildi."))

    xhr.send(blob)
  })

  return { key, publicUrl, size }
}
