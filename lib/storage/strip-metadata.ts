import "server-only"
import sharp from "sharp"

type ImageType = "image/jpeg" | "image/png" | "image/webp"

/**
 * Görseli aynı biçimde yeniden kodlar: EXIF/XMP (GPS, cihaz, saat) düşer,
 * `rotate()` yönü piksellere uygular. Açılamayan dosyada hata fırlatır.
 */
export async function stripImageMetadata(
  body: Uint8Array,
  type: ImageType,
): Promise<Buffer> {
  const img = sharp(body, { limitInputPixels: 50_000_000 }).rotate()
  if (type === "image/png") return img.png().toBuffer()
  if (type === "image/webp") return img.webp({ quality: 90 }).toBuffer()
  return img.jpeg({ quality: 90, mozjpeg: true }).toBuffer()
}
