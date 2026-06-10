import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Bir string'in geçerli bir UUID olup olmadığını döndürür. `uuid` kolonuna ham
 * route param'ı vermeden önce kullanılır — geçersiz değer Postgres'te
 * "invalid input syntax for type uuid" fırlatıp 500'e yol açar; bunun yerine
 * çağıran taraf 404 (notFound) göstersin.
 */
export function isUuid(value: string | null | undefined): boolean {
  return typeof value === "string" && UUID_RE.test(value)
}
