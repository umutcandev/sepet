import sharp from "sharp"

import { getSharedImageKey } from "@/lib/data/conversation-shares"
import { publicUrlForKey } from "@/lib/storage/r2"

// Paylaşılan sohbetteki n. görsel. Sayfa görselin R2 adresini hiç görmez
// (adres kullanıcı kimliğini taşır); görsel buradan, paylaşım varken ve
// sahibi "Resimleri gizle" demediyse verilir. Paylaşım kapatılınca ya da
// görseller gizlenince bu uç anında 404 döner.
//
// Görsel olduğu gibi aktarılmaz, yeniden kodlanır: telefon fotoğrafının EXIF
// verisi çekildiği yerin konumunu, cihazı ve saati taşıyabilir. sharp meta
// veriyi çıktıya yazmaz; `rotate()` EXIF'teki yönü piksellere uygular ki
// görsel yan dönmesin. Boyut da sınırlanır.
//
// Yükleme ucu yalnız tarayıcının bildirdiği türe bakıyor; depodaki dosya
// PNG adı altında bir SVG ya da TIFF olabilir ve sharp bunları da açar
// (filtreli bir SVG'yi çizmek saniyeler sürer). Bu yüzden dosyanın kendi
// imzası JPEG/PNG/WebP değilse sharp'a hiç verilmez. Temizlenen görsel bir
// süre bellekte tutulur: aynı görsel her istekte yeniden kodlanmaz.
//
// IP hız limiti (sayfadan ayrı), no-referrer ve noindex başlıkları
// /paylasim/ yolunun tamamına proxy.ts'te uygulanır.

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_SOURCE_BYTES = 8 * 1024 * 1024
const MAX_EDGE = 1600

const CACHE_TTL_MS = 10 * 60_000
const CACHE_MAX_BYTES = 32 * 1024 * 1024
const CACHE_MAX_ENTRIES = 200

// R2 anahtarı → temizlenmiş görsel (null: dosya görsel değil). Yetki her
// istekte önce denetlenir; önbellek yalnız yeniden kodlamayı atlar.
const cache = new Map<string, { image: Buffer | null; at: number }>()
let cacheBytes = 0
// Aynı görsele aynı anda gelen istekler tek bir kodlamayı bekler.
const inflight = new Map<string, Promise<Buffer | null>>()

// Çözme maliyeti dosya boyutuyla değil piksel sayısıyla ölçeklenir ve bu rota
// anonim erişilebilir. Farklı görsellerin eşzamanlı çözümü süreç başına
// sınırlanır: sharp işi libuv iş parçacığı havuzunda (varsayılan 4) çalışır ve
// havuzu dolduran kodlamalar aynı süreçteki diğer isteklerin dosya/ağ/kripto
// işlerini bekletirdi. Fazlası sırayla bekler.
const MAX_CONCURRENT_DECODES = 2
let activeDecodes = 0
const decodeQueue: Array<() => void> = []

async function withDecodeSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (activeDecodes >= MAX_CONCURRENT_DECODES) {
    await new Promise<void>((resolve) => decodeQueue.push(resolve))
  } else {
    activeDecodes++
  }
  try {
    return await fn()
  } finally {
    const next = decodeQueue.shift()
    if (next) next()
    else activeDecodes--
  }
}

function forget(key: string) {
  const hit = cache.get(key)
  if (!hit) return
  cache.delete(key)
  cacheBytes -= hit.image?.byteLength ?? 0
}

function recall(key: string): Buffer | null | undefined {
  const hit = cache.get(key)
  if (!hit) return undefined
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    forget(key)
    return undefined
  }
  // En son kullanılan sona: sınır aşılınca en eskisi düşer.
  cache.delete(key)
  cache.set(key, hit)
  return hit.image
}

function remember(key: string, image: Buffer | null) {
  forget(key)
  cache.set(key, { image, at: Date.now() })
  cacheBytes += image?.byteLength ?? 0
  for (const oldest of cache.keys()) {
    if (cacheBytes <= CACHE_MAX_BYTES && cache.size <= CACHE_MAX_ENTRIES) break
    forget(oldest)
  }
}

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
])

/** Dosyanın imzası JPEG, PNG ya da WebP mi (adına ve bildirilen türe bakılmaz). */
function isRasterImage(b: Buffer): boolean {
  if (b.byteLength < 12) return false
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return true
  if (b.subarray(0, 8).equals(PNG_SIGNATURE)) return true
  return (
    b.toString("latin1", 0, 4) === "RIFF" &&
    b.toString("latin1", 8, 12) === "WEBP"
  )
}

/**
 * Depodaki görseli indirip temizler. null: görsel değil ya da açılamadı;
 * undefined: indirilemedi (geçici olabilir, önbelleğe girmez).
 */
async function load(key: string): Promise<Buffer | null | undefined> {
  let source: Buffer
  try {
    const res = await fetch(publicUrlForKey(key), {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return undefined
    if (Number(res.headers.get("content-length") ?? 0) > MAX_SOURCE_BYTES) {
      return null
    }
    source = Buffer.from(await res.arrayBuffer())
  } catch {
    return undefined
  }
  if (source.byteLength > MAX_SOURCE_BYTES || !isRasterImage(source)) {
    return null
  }

  try {
    return await withDecodeSlot(() =>
      sharp(source, { limitInputPixels: 50_000_000 })
        .rotate()
        .resize({
          width: MAX_EDGE,
          height: MAX_EDGE,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 82 })
        .toBuffer()
    )
  } catch {
    return null
  }
}

function sanitizedImage(key: string): Promise<Buffer | null> {
  const hit = recall(key)
  if (hit !== undefined) return Promise.resolve(hit)
  let pending = inflight.get(key)
  if (!pending) {
    pending = load(key)
      .then((image) => {
        if (image !== undefined) remember(key, image)
        return image ?? null
      })
      .finally(() => inflight.delete(key))
    inflight.set(key, pending)
  }
  return pending
}

function notFound() {
  return new Response("Bulunamadı", {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  })
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string; ref: string }> }
) {
  const { token, ref } = await params
  if (!/^\d{1,2}$/.test(ref)) return notFound()
  const key = await getSharedImageKey(token, Number(ref))
  if (!key) return notFound()

  const image = await sanitizedImage(key)
  if (!image) return notFound()

  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/webp",
      // Yalnız tarayıcıda, kısa: paylaşım kapatılınca ya da görseller
      // gizlenince paylaşılan önbelleklerde kalmasın.
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": 'inline; filename="gorsel.webp"',
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  })
}
