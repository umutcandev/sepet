import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { AssistantChat } from "@/components/assistant/assistant-chat"

export const metadata = {
  title: "Asistan",
}

export default async function AssistantPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/")
  }

  return <AssistantChat />
}
