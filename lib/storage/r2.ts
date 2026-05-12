import { S3Client, DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"

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

export async function deleteReceiptObject(key: string): Promise<void> {
  await getR2Client().send(
    new DeleteObjectCommand({ Bucket: getR2Bucket(), Key: key }),
  )
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
