import type { Metadata } from "next"

import { RecordNotFoundState } from "@/components/records/record-not-found"

export const metadata: Metadata = {
  title: "Paylaşılan sohbet bulunamadı",
  alternates: null,
}

// Kapatılmış, hiç var olmamış ve sahibi hesabını silmiş paylaşım aynı
// görünür: hangisi olduğu bağlantıyı alana söylenmez.
export default function SharedConversationNotFound() {
  return (
    <RecordNotFoundState
      title="Paylaşılan sohbet bulunamadı"
      description="Bağlantı kaldırılmış ya da hatalı olabilir. Sohbeti paylaşan kişiden yeni bir bağlantı isteyebilirsin."
      backHref="/"
      backLabel="Ana sayfa"
    />
  )
}
