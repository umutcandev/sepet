import type { Metadata } from "next"

import { SharedNotFound } from "@/components/share/shared-page"

export const metadata: Metadata = {
  title: "Paylaşılan sohbet bulunamadı",
  alternates: null,
}

export default function SharedConversationNotFound() {
  return <SharedNotFound title="Paylaşılan sohbet bulunamadı" />
}
