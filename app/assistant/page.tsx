import { AssistantChat } from "@/components/assistant/assistant-chat"

export const metadata = {
  title: "Asistan",
  description:
    "Yapay zekâ destekli alışveriş asistanı ile listeni paylaş, en ucuz market kombinasyonunu anında öğren.",
}

export default function AssistantPage() {
  return <AssistantChat />
}
