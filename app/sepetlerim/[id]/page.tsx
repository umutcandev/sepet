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
import { MarketCell } from "@/components/market-cell"
import {
  MarketSplitDonut,
  type MarketDatum,
} from "@/components/charts/market-split-donut"
import type { OptimizationSummary } from "@/lib/ai/schemas"
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

type BasketRow = Awaited<ReturnType<typeof getBasketDetail>> extends
  | { basket: infer B }
  | null
  ? B
  : never

function BasketInfoCard({
  basket,
  itemCount,
  twoMarketSavings,
}: {
  basket: BasketRow
  itemCount: number
  twoMarketSavings: number
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <span className="text-sm font-medium">Sepet Bilgisi</span>
      </div>
      <Table className="[&_tr>*:first-child]:pl-4 [&_tr>*:last-child]:pr-4">
        <TableBody>
          <TableRow>
            <TableCell className="text-xs uppercase tracking-wide text-muted-foreground">
              Ad
            </TableCell>
            <TableCell className="text-right font-medium">
              {basket.name}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="text-xs uppercase tracking-wide text-muted-foreground">
              Oluşturuldu
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {dateFmt.format(new Date(basket.createdAt))}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="text-xs uppercase tracking-wide text-muted-foreground">
              Kalem
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              {itemCount}
            </TableCell>
          </TableRow>
          {basket.bestSingleMarket && (
            <TableRow>
              <TableCell className="text-xs uppercase tracking-wide text-muted-foreground">
                En iyi market
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end">
                  <MarketCell name={basket.bestSingleMarket} size="sm" />
                </div>
                {basket.bestSingleTotal && (
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {tl.format(Number(basket.bestSingleTotal))}
                  </div>
                )}
              </TableCell>
            </TableRow>
          )}
          {twoMarketSavings > 0 && (
            <TableRow className="bg-emerald-500/5 hover:bg-emerald-500/10">
              <TableCell className="text-xs text-emerald-700 dark:text-emerald-300">
                2 market kombinasyonu tasarrufu
              </TableCell>
              <TableCell className="text-right">
                <Badge
                  variant="outline"
                  className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                >
                  {tl.format(twoMarketSavings)}
                </Badge>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

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

  const summary = basket.summaryJson as OptimizationSummary | null
  const allocation = summary?.twoMarketCombo.allocation ?? []
  const allocationByMarket = new Map<string, number>()
  for (const a of allocation) {
    allocationByMarket.set(
      a.market,
      (allocationByMarket.get(a.market) ?? 0) + a.lineTotal,
    )
  }
  const marketSplit: MarketDatum[] = Array.from(allocationByMarket.entries())
    .map(([market, value]) => ({ market, value }))
  const showSplit = twoMarketSavings > 0 && marketSplit.length >= 2

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

      <div
        className={
          showSplit
            ? "grid gap-5 md:grid-cols-[280px_minmax(0,1fr)]"
            : "space-y-5"
        }
      >
        {showSplit && (
          <div className="min-w-0 space-y-3">
            <div className="rounded-xl border bg-card p-4">
              <div className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">
                2-Market Dağılımı
              </div>
              <MarketSplitDonut
                data={marketSplit}
                totalLabel="2-market toplamı"
                emptyHint="Dağılım için yeterli market yok."
              />
            </div>
          </div>
        )}

        <div className="min-w-0 space-y-3">
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <span className="text-sm font-medium">Sepetteki Kalemler</span>
              <Badge variant="secondary" className="text-[10px]">
                {items.length}
              </Badge>
            </div>

            <ul className="divide-y md:hidden">
              {items.map((it) => (
                <li key={it.id} className="space-y-2 px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium break-words">
                      {it.rawName}
                    </div>
                    {it.matchedName && it.matchedName !== it.rawName && (
                      <div className="text-[11px] text-muted-foreground break-words">
                        ↪ {it.matchedName}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <MarketCell name={it.bestMarket} size="sm" />
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[11px] text-muted-foreground tabular-nums">
                        {Number(it.quantity)} {it.unit}
                      </div>
                      <div className="text-sm font-medium tabular-nums">
                        {it.bestPrice
                          ? tl.format(Number(it.bestPrice))
                          : "—"}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden md:block">
              <Table className="[&_tr>*:first-child]:pl-4 [&_tr>*:last-child]:pr-4">
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
                        <MarketCell name={it.bestMarket} size="sm" />
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

          <BasketInfoCard
            basket={basket}
            itemCount={items.length}
            twoMarketSavings={twoMarketSavings}
          />
        </div>
      </div>
    </div>
  )
}
