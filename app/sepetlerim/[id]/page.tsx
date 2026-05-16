import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronLeftIcon } from "lucide-react"
import { auth } from "@/auth"
import { getBasketDetail } from "@/lib/actions/baskets"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DeleteBasketButton } from "./delete-button"

export const metadata = { title: "Sepet Detayı" }

const tl = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 2,
})

const dateFmt = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

export default async function BasketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/sepetlerim")

  const { id } = await params
  const detail = await getBasketDetail(id, session.user.id)
  if (!detail) notFound()
  const { basket, items } = detail

  const twoMarketSavings = basket.twoMarketSavingsTL
    ? Number(basket.twoMarketSavingsTL)
    : 0

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/sepetlerim">
            <ChevronLeftIcon className="mr-1 size-4" />
            Sepetlerim
          </Link>
        </Button>
        <div className="ml-auto">
          <DeleteBasketButton id={basket.id} />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          <div className="rounded-xl border bg-card p-4 text-sm">
            <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
              Sepet Bilgisi
            </div>
            <dl className="grid gap-1.5">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Ad</dt>
                <dd className="font-medium text-right">{basket.name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Oluşturuldu</dt>
                <dd>{dateFmt.format(new Date(basket.createdAt))}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Kalem</dt>
                <dd className="tabular-nums font-medium">{items.length}</dd>
              </div>
              {basket.bestSingleMarket && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">En iyi market</dt>
                  <dd className="text-right">
                    <div>{basket.bestSingleMarket}</div>
                    {basket.bestSingleTotal && (
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {tl.format(Number(basket.bestSingleTotal))}
                      </div>
                    )}
                  </dd>
                </div>
              )}
              {twoMarketSavings > 0 && (
                <div className="mt-1 flex items-center justify-between gap-3 rounded-lg bg-emerald-500/10 px-2 py-1.5">
                  <span className="text-xs text-emerald-700 dark:text-emerald-300">
                    2 market kombinasyonu tasarrufu
                  </span>
                  <Badge
                    variant="outline"
                    className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                  >
                    {tl.format(twoMarketSavings)}
                  </Badge>
                </div>
              )}
            </dl>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <span className="text-sm font-medium">Sepetteki Kalemler</span>
            <Badge variant="secondary" className="text-[10px]">
              {items.length}
            </Badge>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  <TableHead className="min-w-[160px]">Ürün</TableHead>
                  <TableHead className="w-20 text-right">Adet</TableHead>
                  <TableHead className="min-w-[120px]">En iyi market</TableHead>
                  <TableHead className="w-24 text-right">En iyi fiyat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="align-top">
                      <div className="text-sm font-medium">{it.rawName}</div>
                      {it.matchedName && it.matchedName !== it.rawName && (
                        <div className="text-[11px] text-muted-foreground">
                          ↪ {it.matchedName}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {Number(it.quantity)} {it.unit}
                    </TableCell>
                    <TableCell>
                      {it.bestMarket ?? (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {it.bestPrice ? tl.format(Number(it.bestPrice)) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}
