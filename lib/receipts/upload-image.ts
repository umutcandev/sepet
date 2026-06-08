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

export async function uploadReceiptImage(file: {
  url?: string
  mediaType?: string
  filename?: string
}): Promise<{ key: string; publicUrl: string }> {
  if (!file.url || !file.mediaType) {
    throw new Error("Geçersiz dosya.")
  }

  const blob = await urlToBlob(file.url, file.mediaType)

  const res = await fetch("/api/receipts/upload", {
    method: "POST",
    headers: { "Content-Type": file.mediaType },
    body: blob,
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as {
      message?: string
    } | null
    throw new Error(data?.message ?? "Yükleme reddedildi.")
  }
  const { key, publicUrl } = (await res.json()) as {
    key: string
    publicUrl: string
  }
  return { key, publicUrl }
}
