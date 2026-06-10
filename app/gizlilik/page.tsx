import type { Metadata } from "next"

import { LegalPageShell, PrivacyContent } from "@/components/legal/legal-content"

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
  description:
    "Sepet gizlilik politikası: hangi verileri topladığımız, nasıl kullandığımız ve haklarınız.",
}

export default function GizlilikPage() {
  return (
    <LegalPageShell title="Gizlilik Politikası">
      <PrivacyContent />
    </LegalPageShell>
  )
}
