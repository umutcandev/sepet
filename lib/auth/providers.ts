export const OAUTH_PROVIDER_LABELS = {
  google: "Google",
  facebook: "Facebook",
} as const

export type OAuthProviderId = keyof typeof OAUTH_PROVIDER_LABELS

export function isOAuthProviderId(value: string): value is OAuthProviderId {
  return value in OAUTH_PROVIDER_LABELS
}

/** Sağlayıcı bilinmiyorsa metinler sağlayıcı adı olmadan kurulur. */
export function providerLabel(provider: OAuthProviderId | null): string | null {
  return provider ? OAUTH_PROVIDER_LABELS[provider] : null
}
