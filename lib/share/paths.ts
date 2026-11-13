import type { RecordShareKind } from "@/lib/records/record-data"

export type ShareKind = "conversation" | RecordShareKind

const PREFIX: Record<ShareKind, string> = {
  conversation: "/paylasim/",
  basket: "/paylasim/sepet/",
  receipt: "/paylasim/fis/",
}

/** Paylaşılan sayfanın yolu; token URL'deki tek anahtar. */
export function sharePath(kind: ShareKind, token: string): string {
  return `${PREFIX[kind]}${token}`
}
