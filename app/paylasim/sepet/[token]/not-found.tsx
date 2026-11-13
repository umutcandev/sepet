import type { Metadata } from "next"

import { SharedNotFound } from "@/components/share/shared-page"

export const metadata: Metadata = {
  title: "Paylaşılan sepet bulunamadı",
  alternates: null,
}

export default function SharedBasketNotFound() {
  return <SharedNotFound title="Paylaşılan sepet bulunamadı" />
}
