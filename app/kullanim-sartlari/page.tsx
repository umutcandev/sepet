import type { Metadata } from "next"

import { LegalPageShell, TermsContent } from "@/components/legal/legal-content"

export const metadata: Metadata = {
  title: "Kullanım Şartları",
  description:
    "Sepet kullanım şartları: hizmetin kapsamı, hesap sorumlulukları ve sorumluluk reddi.",
}

export default function KullanimSartlariPage() {
  return (
    <LegalPageShell title="Kullanım Şartları">
      <TermsContent />
    </LegalPageShell>
  )
}
