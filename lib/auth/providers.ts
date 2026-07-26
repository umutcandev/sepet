export const OAUTH_PROVIDER_LABELS = {
  google: "Google",
  facebook: "Facebook",
} as const

export type OAuthProviderId = keyof typeof OAUTH_PROVIDER_LABELS

/**
 * E-posta sahipliğini KANITLAYAMAYAN sağlayıcılar.
 *
 * Google OIDC profilinde `email_verified` var ve signIn callback'i onu zorunlu
 * tutuyor. Facebook Graph /me yanıtında böyle bir alan hiç yok → Facebook'un
 * bildirdiği e-posta yalnızca bir iddia, kanıt değil.
 *
 * Sonuç: bu sağlayıcılarla açılmış ŞİFRESİZ bir hesap, aynı adrese yapılan
 * e-posta+şifre kaydını kendine ememez (bkz. lib/actions/credentials-auth.ts →
 * completeSignup). Aksi halde kanıtlanmamış bir e-postayla önceden açılmış hesap,
 * adresin gerçek sahibinin kaydını yutar ve iki taraf aynı hesabı paylaşır.
 */
export const UNPROVEN_EMAIL_PROVIDERS: readonly OAuthProviderId[] = ["facebook"]

export function isOAuthProviderId(value: string): value is OAuthProviderId {
  return value in OAUTH_PROVIDER_LABELS
}

/** Sağlayıcı bilinmiyorsa metinler sağlayıcı adı olmadan kurulur. */
export function providerLabel(provider: OAuthProviderId | null): string | null {
  return provider ? OAUTH_PROVIDER_LABELS[provider] : null
}
