import { auth } from "@/auth"
import { listReceiptsPaginated } from "@/lib/actions/receipts"
import { ReceiptsBrowser } from "@/components/receipts/receipts-browser"
import { UnauthenticatedState } from "./unauthenticated-state"

export const metadata = {
  title: "Fişlerim",
  description:
    "Yüklediğin fişler ve potansiyel tasarruflarını tek yerden takip et.",
}

export default async function ReceiptsHistoryPage() {
  const session = await auth()

  if (!session?.user?.id) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Fişlerim</h1>
          <p className="text-sm text-muted-foreground">
            Yüklediğin fişleri ve potansiyel tasarruflarını tek yerden takip et.
          </p>
        </div>
        <UnauthenticatedState />
      </div>
    )
  }

  const { items, hasMore } = await listReceiptsPaginated(0)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <ReceiptsBrowser initial={items} initialHasMore={hasMore} />
    </div>
  )
}
