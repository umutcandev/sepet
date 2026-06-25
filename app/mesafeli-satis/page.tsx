import type { Metadata } from "next"

import {
  DistanceSalesContent,
  LegalPageShell,
  LEGAL_PAYMENTS_LAST_UPDATED,
} from "@/components/legal/legal-content"

export const metadata: Metadata = {
  title: "Mesafeli Satış Sözleşmesi",
  description:
    "Sepet Pro aboneliği mesafeli satış sözleşmesi: taraflar, ücret, ödeme, hizmetin ifası ve cayma hakkı.",
}

export default function MesafeliSatisPage() {
  return (
    <LegalPageShell
      title="Mesafeli Satış Sözleşmesi"
      lastUpdated={LEGAL_PAYMENTS_LAST_UPDATED}
    >
      <DistanceSalesContent />
    </LegalPageShell>
  )
}
