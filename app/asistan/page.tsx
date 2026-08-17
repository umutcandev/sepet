import { AssistantChat } from "@/components/assistant/assistant-chat"

export const metadata = {
  title: "Asistan",
  description:
    "Yapay zekâ destekli alışveriş asistanı ile listeni paylaş, en ucuz market kombinasyonunu anında öğren.",
}

// Kayıtlı bir sepetten "Fiyatları yenile" ile gelindiğinde liste yazma alanına
// hazır düşer. Gönderme kullanıcıya bırakılır — bkz. AssistantChat.initialInput.
const MAX_SEED_LENGTH = 2000

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ liste?: string }>
}) {
  const { liste } = await searchParams
  const initialInput =
    typeof liste === "string" && liste.trim().length > 0
      ? liste.slice(0, MAX_SEED_LENGTH)
      : undefined

  return <AssistantChat initialInput={initialInput} />
}
