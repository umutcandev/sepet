import { AuthError } from "next-auth"

// signIn'in fırlattığı hataları Türkçe kullanıcı mesajına eşler. authorize içinde
// fırlatılan CredentialsSignin türevlerinin `code`'u okunur (bkz. auth.ts). Bilinmeyen
// e-posta ve yanlış şifre AYNI mesajı alır → kullanıcı enumeration'ı yok.
const MESSAGES: Record<string, string> = {
  invalid_credentials: "E-posta veya şifre hatalı.",
  "2fa_required": "Bu hesapta iki adımlı doğrulama açık. Kodla giriş yapman gerekiyor.",
  "2fa_invalid": "Kod doğrulanamadı. Tekrar dene.",
  pending_expired: "Oturum doğrulama süresi doldu. Baştan giriş yap.",
}

const FALLBACK = "Giriş yapılamadı. Lütfen tekrar dene."

export function mapCredentialsError(error: unknown): string {
  if (error instanceof AuthError) {
    const code = (error as AuthError & { code?: string }).code
    if (code && code in MESSAGES) return MESSAGES[code]
  }
  return FALLBACK
}

/** signIn'in redirect throw'unu (NEXT_REDIRECT) yeniden fırlatmak için ayırt eder. */
export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError
}

/** CredentialsSignin `code`'unu okur (ör. "2fa_required" dalı için). */
export function authErrorCode(error: unknown): string | undefined {
  if (error instanceof AuthError) {
    return (error as AuthError & { code?: string }).code
  }
  return undefined
}
