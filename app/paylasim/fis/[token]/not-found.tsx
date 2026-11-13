import type { Metadata } from "next"

import { SharedNotFound } from "@/components/share/shared-page"

export const metadata: Metadata = {
  title: "Paylaşılan fiş bulunamadı",
  alternates: null,
}

export default function SharedReceiptNotFound() {
  return <SharedNotFound title="Paylaşılan fiş bulunamadı" />
}
