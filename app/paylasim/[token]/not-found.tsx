import type { Metadata } from "next"

import { RecordNotFoundState } from "@/components/records/record-not-found"
import { SiteFooter } from "@/components/site-footer"

export const metadata: Metadata = {
  title: "Paylaşılan sohbet bulunamadı",
  alternates: null,
}

// Kapatılmış, hiç var olmamış ve sahibi silinmiş paylaşım aynı görünür.
export default function SharedConversationNotFound() {
  return (
    <>
      <div className="flex-1">
        <RecordNotFoundState
          title="Paylaşılan sohbet bulunamadı"
          description="Bağlantı kaldırılmış ya da hatalı olabilir. Sohbeti paylaşan kişiden yeni bir bağlantı isteyebilirsin."
          backHref="/"
          backLabel="Ana sayfa"
        />
      </div>
      <SiteFooter />
    </>
  )
}
