// Paylaşım penceresinin sözleşmesi: sohbet, sepet ve fiş ortak.

export type ShareInfo = {
  token: string
  anonymous: boolean
  hideImages: boolean
}

export type ShareStatus = {
  authorName: string | null
  share: ShareInfo | null
}

export type ShareActionError =
  | "unauthorized"
  | "not_found"
  | "empty"
  | "too_large"
  /** İçerik temizleyiciden geçmiyor; tekrar denemek işe yaramaz. */
  | "unsupported"
  | "rate_limited"
  | "failed"

export type ShareResult<T> =
  | ({ ok: true } & T)
  | { ok: false; error: ShareActionError }
