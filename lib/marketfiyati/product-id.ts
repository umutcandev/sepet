// marketfiyati ürün kimliği: kısa opak bir dize (ör. "1O9J"). İstemciden gelen
// kimlikler bu biçime uymadan upstream'e (searchByIdentity) gönderilmez.
const PRODUCT_ID_RE = /^[A-Za-z0-9_-]{1,32}$/

export function isProductId(value: unknown): value is string {
  return typeof value === "string" && PRODUCT_ID_RE.test(value)
}
