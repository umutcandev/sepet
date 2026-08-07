import {
  S3Client,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3"

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
])

const MAX_BYTES = 8 * 1024 * 1024 // 8 MB

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var: ${name}`)
  return v
}

let cachedClient: S3Client | null = null

export function getR2Client(): S3Client {
  if (cachedClient) return cachedClient
  const accountId = requireEnv("R2_ACCOUNT_ID")
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID")
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY")
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
  return cachedClient
}

export function getR2Bucket(): string {
  return requireEnv("R2_BUCKET")
}

function getPublicBase(): string {
  return requireEnv("R2_PUBLIC_BASE_URL").replace(/\/$/, "")
}

export function publicUrlForKey(key: string): string {
  return `${getPublicBase()}/${key}`
}

/**
 * `publicUrlForKey`'in tersi: public URL'den R2 object key'ini çıkarır. Base
 * ile başlamayan (yani bizim bucket'ımıza ait olmayan) URL'lerde null döner —
 * çağıran taraf silme gibi yıkıcı bir işlemi asla yabancı bir key üzerinde
 * yapmasın.
 */
function keyFromPublicUrl(url: string | null | undefined): string | null {
  if (typeof url !== "string") return null
  const prefix = `${getPublicBase()}/`
  if (!url.startsWith(prefix)) return null
  const key = url.slice(prefix.length)
  return key.length > 0 ? key : null
}

export function validateUpload(input: { contentType: string; size: number }): {
  ok: true
} | { ok: false; reason: string; status: number } {
  if (!ALLOWED_CONTENT_TYPES.has(input.contentType)) {
    return {
      ok: false,
      status: 415,
      reason: "Sadece JPEG / PNG / WebP fotoğraf kabul ediliyor.",
    }
  }
  if (!Number.isFinite(input.size) || input.size <= 0) {
    return { ok: false, status: 400, reason: "Geçersiz dosya boyutu." }
  }
  if (input.size > MAX_BYTES) {
    return {
      ok: false,
      status: 413,
      reason: "Dosya 8 MB'tan büyük olamaz.",
    }
  }
  return { ok: true }
}

/**
 * Bir R2 key'inin gerçekten bu kullanıcıya ait olduğunu doğrular. Yüklemeler
 * her zaman `receipts/{userId}/...` altına yazılır (bkz. uploadReceiptDirect);
 * client'tan geri gelen key'e güvenmeden önce bu ön ek zorunlu kılınmalı —
 * aksi halde bir kullanıcı başka birinin nesnesini kaydedip silebilir.
 */
export function isOwnedReceiptKey(
  key: string | null | undefined,
  userId: string,
): boolean {
  return typeof key === "string" && key.startsWith(`receipts/${userId}/`)
}

/**
 * Bir public görsel URL'inin bu kullanıcının R2 klasörüne işaret ettiğini
 * doğrular. SSRF'e karşı: yalnızca `{R2_PUBLIC_BASE_URL}/receipts/{userId}/...`
 * biçimindeki URL'ler sunucu tarafı fetch için kabul edilir.
 */
export function isOwnedReceiptUrl(
  url: string | null | undefined,
  userId: string,
): boolean {
  if (typeof url !== "string") return false
  return url.startsWith(`${getPublicBase()}/receipts/${userId}/`)
}

/**
 * Bir public avatar URL'inin bu kullanıcının R2 klasörüne işaret ettiğini
 * doğrular. setAvatar, yalnızca `{R2_PUBLIC_BASE_URL}/avatars/{userId}/...`
 * biçimindeki URL'leri kabul eder — başka kullanıcının görselini set etmeyi
 * engeller.
 */
export function isOwnedAvatarUrl(
  url: string | null | undefined,
  userId: string,
): boolean {
  if (typeof url !== "string") return false
  return url.startsWith(`${getPublicBase()}/avatars/${userId}/`)
}

/** `isOwnedReceiptKey`'in avatar karşılığı — silme öncesi sahiplik kontrolü. */
function isOwnedAvatarKey(
  key: string | null | undefined,
  userId: string,
): boolean {
  return typeof key === "string" && key.startsWith(`avatars/${userId}/`)
}

export async function deleteReceiptObject(key: string): Promise<void> {
  await getR2Client().send(
    new DeleteObjectCommand({ Bucket: getR2Bucket(), Key: key }),
  )
}

/**
 * Kullanıcının ESKİ avatar nesnesini best-effort siler. Avatar değiştirmek ya da
 * kaldırmak `users.customImage`'i günceller; nesne silinmezse R2'de sonsuza dek
 * yetim kalır (yalnızca hesap purge'ünde temizlenirdi). Sahiplik key üzerinden
 * yeniden doğrulanır — DB'deki değer bozuksa yabancı bir nesne silinmesin.
 */
export async function deleteAvatarByUrl(
  url: string | null | undefined,
  userId: string,
): Promise<void> {
  const key = keyFromPublicUrl(url)
  if (!key || !isOwnedAvatarKey(key, userId)) return
  try {
    await getR2Client().send(
      new DeleteObjectCommand({ Bucket: getR2Bucket(), Key: key }),
    )
  } catch (err) {
    console.error("[r2] eski avatar silinemedi", err)
  }
}

/**
 * Bir R2 nesnesinin ham baytlarını döndürür. Veri dışa aktarımında (Gizlilik →
 * Verilerini dışa aktar) fiş görsellerini ZIP'e gömmek için kullanılır. Nesne
 * yoksa/erişilemezse hata fırlatır — çağıran best-effort sarmalamalıdır.
 */
export async function getObjectBytes(key: string): Promise<Uint8Array> {
  const res = await getR2Client().send(
    new GetObjectCommand({ Bucket: getR2Bucket(), Key: key }),
  )
  const body = res.Body
  if (!body) throw new Error(`empty body for key: ${key}`)
  // AWS SDK v3 stream → byte array. transformToByteArray Node/Web ikisinde de var.
  return (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray()
}

/** Upload an avatar image directly from server (avoids CORS). */
export async function uploadAvatarDirect(input: {
  userId: string
  contentType: string
  body: Uint8Array | Buffer
}): Promise<{ key: string; publicUrl: string }> {
  const ext = EXT_BY_TYPE[input.contentType] ?? "bin"
  const key = `avatars/${input.userId}/${crypto.randomUUID()}.${ext}`
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: key,
      ContentType: input.contentType,
      Body: input.body,
    }),
  )
  return { key, publicUrl: publicUrlForKey(key) }
}

const RECEIPTS_PREFIX = "receipts/"

export type R2ObjectRef = { key: string; lastModified: Date | null }

/**
 * `receipts/` önekindeki nesnelerin TEK sayfasını listeler (yetim temizliği
 * için). Cron'un 60 sn bütçesini aşmamak adına iş bilinçli olarak sayfa sayfa
 * yapılır; `nextStartAfter` bir sonraki çalıştırmada kaldığı yerden devam
 * etmeyi sağlar (S3 continuation token'ının aksine süresi dolmaz ve nesne
 * kümesi değişse de geçerli kalır). Liste bittiğinde null döner.
 */
export async function listReceiptObjectsPage(input: {
  startAfter?: string
  maxKeys?: number
}): Promise<{ objects: R2ObjectRef[]; nextStartAfter: string | null }> {
  const res = await getR2Client().send(
    new ListObjectsV2Command({
      Bucket: getR2Bucket(),
      Prefix: RECEIPTS_PREFIX,
      StartAfter: input.startAfter,
      MaxKeys: input.maxKeys ?? 1000,
    }),
  )
  const objects: R2ObjectRef[] =
    res.Contents?.flatMap((o) =>
      o.Key ? [{ key: o.Key, lastModified: o.LastModified ?? null }] : [],
    ) ?? []
  const last = objects.at(-1)?.key ?? null
  return {
    objects,
    nextStartAfter: res.IsTruncated && last ? last : null,
  }
}

/** Verilen key'leri toplu siler (S3 DeleteObjects tek çağrıda en fazla 1000). */
export async function deleteObjectsByKeys(keys: string[]): Promise<void> {
  if (keys.length === 0) return
  const client = getR2Client()
  const bucket = getR2Bucket()
  for (let i = 0; i < keys.length; i += 1000) {
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })) },
      }),
    )
  }
}

/** Verilen önek altındaki tüm nesneleri sayfalayarak siler. */
async function deletePrefix(prefix: string): Promise<void> {
  const client = getR2Client()
  const bucket = getR2Bucket()
  let token: string | undefined
  do {
    const list = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: token,
      }),
    )
    const objects =
      list.Contents?.flatMap((o) => (o.Key ? [{ Key: o.Key }] : [])) ?? []
    if (objects.length > 0) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: objects },
        }),
      )
    }
    token = list.IsTruncated ? list.NextContinuationToken : undefined
  } while (token)
}

/**
 * Bir kullanıcının tüm R2 nesnelerini (avatar + fiş görselleri) siler. Hesap
 * arşivinin 14 gün sonra kalıcı silinmesi (cron purge) sırasında çağrılır.
 */
export async function deleteUserStorage(userId: string): Promise<void> {
  await deletePrefix(`avatars/${userId}/`)
  await deletePrefix(`receipts/${userId}/`)
}

/** Upload receipt image directly from server (avoids CORS). */
export async function uploadReceiptDirect(input: {
  userId: string
  contentType: string
  body: Uint8Array | Buffer
}): Promise<{ key: string; publicUrl: string }> {
  const ext = EXT_BY_TYPE[input.contentType] ?? "bin"
  const key = `receipts/${input.userId}/${crypto.randomUUID()}.${ext}`
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: key,
      ContentType: input.contentType,
      Body: input.body,
    }),
  )
  return { key, publicUrl: publicUrlForKey(key) }
}
