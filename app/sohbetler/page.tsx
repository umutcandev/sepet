import { auth } from "@/auth"
import { listConversationsPaginated } from "@/lib/actions/conversations"
import { ConversationsBrowser } from "@/components/conversations/conversations-browser"
import { UnauthenticatedState } from "./unauthenticated-state"

export const metadata = {
  title: "Sohbetler",
  description:
    "Tüm asistan sohbetlerini tek yerden ara, yeniden adlandır ve yönet.",
}

export default async function ConversationsPage() {
  const session = await auth()
  const { items, hasMore } = session?.user?.id
    ? await listConversationsPaginated(0)
    : { items: [], hasMore: false }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      {!session?.user?.id ? (
        <UnauthenticatedState />
      ) : (
        <ConversationsBrowser initial={items} initialHasMore={hasMore} />
      )}
    </div>
  )
}
