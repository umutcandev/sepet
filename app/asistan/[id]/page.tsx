import { notFound } from "next/navigation"
import { AssistantChat } from "@/components/assistant/assistant-chat"
import { getConversation } from "@/lib/actions/conversations"

export const metadata = {
  title: "Asistan",
}

export const dynamic = "force-dynamic"

export default async function AssistantConversationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const conv = await getConversation(id)
  if (!conv) notFound()
  return (
    <AssistantChat
      conversationId={conv.id}
      initialTitle={conv.title}
      initialMessages={conv.messages}
      initialSavedBaskets={conv.savedBaskets}
    />
  )
}
