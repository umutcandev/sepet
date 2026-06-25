import type { Metadata } from "next"

import {
  LegalPageShell,
  RefundPolicyContent,
  LEGAL_PAYMENTS_LAST_UPDATED,
} from "@/components/legal/legal-content"

export const metadata: Metadata = {
  title: "İptal ve İade Politikası",
  description:
    "Sepet Pro aboneliği iptal ve iade politikası: aboneliği iptal etme, iptal sonrası erişim, iade koşulları ve başarısız ödeme.",
}

export default function IptalIadePage() {
  return (
    <LegalPageShell
      title="İptal ve İade Politikası"
      lastUpdated={LEGAL_PAYMENTS_LAST_UPDATED}
    >
      <RefundPolicyContent />
    </LegalPageShell>
  )
}
