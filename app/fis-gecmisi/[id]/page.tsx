import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronLeftIcon } from "lucide-react"
import { auth } from "@/auth"
import { getReceiptDetail } from "@/lib/actions/receipts"
import { isReceiptStaleByDate } from "@/lib/receipt-staleness"
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
import { DeleteReceiptButton } from "./delete-button"

export const metadata = { title: "Fiş Detayı" }

const tl = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 2,
})

const dateFmt = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
})

type ReceiptRow = Awaited<ReturnType<typeof getReceiptDetail>> extends
  | { receipt: infer R }
  | null
  ? R
  : never

function ReceiptInfoCard({
  receipt,
  isStale,
  totalSavings,
}: {
  receipt: ReceiptRow
  isStale: boolean
  totalSavings: number
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <span className="text-sm font-medium">Fiş Bilgisi</span>
      </div>
      <Table className="[&_tr>*:first-child]:pl-4 [&_tr>*:last-child]:pr-4">
        <TableBody>
          <TableRow>
            <TableCell className="text-xs uppercase tracking-wide text-muted-foreground">
              Market
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end font-medium">
                <MarketCell name={receipt.marketName} size="sm" />
              </div>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="text-xs uppercase tracking-wide text-muted-foreground">
              Tarih
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {receipt.purchaseDate
                ? dateFmt.format(new Date(receipt.purchaseDate))
                : dateFmt.format(new Date(receipt.createdAt))}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="text-xs uppercase tracking-wide text-muted-foreground">
              Fiş tutarı
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              {receipt.totalAmount
                ? tl.format(Number(receipt.totalAmount))
                : "—"}
            </TableCell>
          </TableRow>
          {receipt.bestSingleMarket && (
            <TableRow>
              <TableCell className="text-xs uppercase tracking-wide text-muted-foreground">
                En iyi market
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end">
                  <MarketCell name={receipt.bestSingleMarket} size="sm" />
                </div>
                {receipt.bestSingleTotal && (
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {tl.format(Number(receipt.bestSingleTotal))}
                  </div>
                )}
              </TableCell>
            </TableRow>
          )}
          {isStale ? (
            <TableRow className="bg-muted/40 hover:bg-muted/50">
              <TableCell
                colSpan={2}
                className="text-[11px] text-muted-foreground"
              >
                Bu fiş 6 aydan eski — bugünkü piyasayla kıyaslanmıyor, tasarruf
                hesabı gösterilmiyor.
              </TableCell>
            </TableRow>
          ) : (
            totalSavings > 0 && (
              <TableRow className="bg-emerald-500/5 hover:bg-emerald-500/10">
                <TableCell className="text-xs text-emerald-700 dark:text-emerald-300">
                  Tasarruf edebilirdin
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant="outline"
                    className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                  >
                    {tl.format(totalSavings)}
                  </Badge>
                </TableCell>
              </TableRow>
            )
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/fis-gecmisi")
  
  const { id } = await params
  const detail = await getReceiptDetail(id, session.user.id)
  if (!detail) notFound()
  const { receipt, items } = detail

  const isStale = isReceiptStaleByDate(receipt.purchaseDate)
  const totalSavings =
    !isStale && receipt.potentialSavingsTL
      ? Number(receipt.potentialSavingsTL)
      : 0

  const marketSplitMap = new Map<string, number>()
  for (const it of items) {
    if (!it.bestMarket || !it.bestPrice) continue
    const line = Number(it.bestPrice) * Number(it.quantity)
    if (!Number.isFinite(line) || line <= 0) continue
    marketSplitMap.set(
      it.bestMarket,
      (marketSplitMap.get(it.bestMarket) ?? 0) + line,
    )
  }
  const marketSplit: MarketDatum[] = Array.from(marketSplitMap.entries()).map(
    ([market, value]) => ({ market, value }),
  )
  const showSplit = marketSplit.length >= 2

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/fis-gecmisi">
            <ChevronLeftIcon className="mr-1 size-4" />
            Fişlerim
          </Link>
        </Button>
        <div className="ml-auto">
          <DeleteReceiptButton id={receipt.id} />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-[280px_minmax(0,1fr)]">
        <div className="min-w-0 space-y-3">
          <div className="overflow-hidden rounded-xl border bg-muted/30">
            <a
              href={receipt.imageUrl}
              target="_blank"
              rel="noreferrer"
              className="block max-h-[300px] overflow-hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={receipt.imageUrl}
                alt="Fiş"
                className="block h-auto w-full object-cover object-top"
              />
            </a>
          </div>

          {showSplit && (
            <div className="rounded-xl border bg-card p-4">
              <div className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">
                Marketlere Göre Dağılım
              </div>
              <MarketSplitDonut
                data={marketSplit}
                totalLabel="En iyi alternatif"
                emptyHint="Dağılım için yeterli market yok."
              />
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-3">
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <span className="text-sm font-medium">Fişteki Kalemler</span>
              <Badge variant="secondary" className="text-[10px]">
                {items.length}
              </Badge>
            </div>

            <ul className="divide-y md:hidden">
              {items.map((it) => {
                const savings =
                  !isStale && it.savingsTL ? Number(it.savingsTL) : 0
                return (
                  <li key={it.id} className="space-y-2 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
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
                      <div className="shrink-0 text-right text-[11px] text-muted-foreground tabular-nums">
                        {Number(it.quantity)} {it.unit}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/40 p-2 text-xs">
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Fişteki
                        </div>
                        <div className="tabular-nums">
                          {it.receiptTotalPrice
                            ? tl.format(Number(it.receiptTotalPrice))
                            : "—"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          En iyi
                        </div>
                        <div className="tabular-nums">
                          {it.bestPrice
                            ? tl.format(Number(it.bestPrice))
                            : "—"}
                        </div>
                      </div>
                      <div className="col-span-2 flex items-center justify-between gap-3 border-t pt-2">
                        <div className="min-w-0">
                          <MarketCell name={it.bestMarket} size="sm" />
                        </div>
                        {savings > 0 ? (
                          <span className="shrink-0 font-medium text-emerald-700 tabular-nums dark:text-emerald-300">
                            −{tl.format(savings)}
                          </span>
                        ) : (
                          <span className="shrink-0 text-muted-foreground">
                            —
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="hidden md:block">
              <Table className="[&_tr>*:first-child]:pl-4 [&_tr>*:last-child]:pr-4">
                <TableHeader>
                  <TableRow className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    <TableHead className="min-w-[160px]">Ürün</TableHead>
                    <TableHead className="w-20 text-right">Adet</TableHead>
                    <TableHead className="w-24 text-right">Fişteki</TableHead>
                    <TableHead className="min-w-[120px]">En iyi market</TableHead>
                    <TableHead className="w-24 text-right">En iyi</TableHead>
                    <TableHead className="w-24 text-right">Fark</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => {
                    const savings =
                      !isStale && it.savingsTL ? Number(it.savingsTL) : 0
                    return (
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
                        <TableCell className="text-right tabular-nums">
                          {it.receiptTotalPrice
                            ? tl.format(Number(it.receiptTotalPrice))
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <MarketCell name={it.bestMarket} size="sm" />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {it.bestPrice ? tl.format(Number(it.bestPrice)) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {savings > 0 ? (
                            <span className="font-medium text-emerald-700 dark:text-emerald-300">
                              −{tl.format(savings)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <ReceiptInfoCard
            receipt={receipt}
            isStale={isStale}
            totalSavings={totalSavings}
          />
        </div>
      </div>
    </div>
  )
}
