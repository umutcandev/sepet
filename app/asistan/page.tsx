import { AssistantChat } from "@/components/assistant/assistant-chat"

export const metadata = {
  title: "Asistan",
  description:
    "Yapay zekâ destekli alışveriş asistanı ile listeni paylaş, en ucuz market kombinasyonunu anında öğren.",
}

// `?liste=` (kayıtlı sepetten "Fiyatları yenile") istemcide okunuyor —
// bkz. lib/url-seed.ts. Burada `searchParams` await edilseydi rota dinamik
// olur ve sayfa statik prerender'ı kaybederdi.
export default function AssistantPage() {
  return <AssistantChat />
}
