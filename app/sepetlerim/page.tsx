import { auth } from "@/auth"
import { listBasketsPaginated } from "@/lib/actions/baskets"
import { BasketsBrowser } from "@/components/baskets/baskets-browser"
import { UnauthenticatedState } from "./unauthenticated-state"

export const metadata = {
  title: "Sepetlerim",
  description:
    "Oluşturduğun sepetler ve her birinin en ucuz market seçeneklerini tek yerden takip et.",
}

export default async function BasketsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Sepetlerim</h1>
          <p className="text-sm text-muted-foreground">
            Asistana yazdığın alışveriş listelerinden oluşturduğun sepetleri
            buradan takip et.
          </p>
        </div>
        <UnauthenticatedState />
      </div>
    )
  }

  const { items, hasMore } = await listBasketsPaginated(0)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <BasketsBrowser initial={items} initialHasMore={hasMore} />
    </div>
  )
}
