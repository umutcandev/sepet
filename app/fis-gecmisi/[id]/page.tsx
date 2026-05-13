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

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/fis-gecmisi">
            <ChevronLeftIcon className="mr-1 size-4" />
            Fiş Geçmişi
          </Link>
        </Button>
        <div className="ml-auto">
          <DeleteReceiptButton id={receipt.id} />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border bg-muted/30">
            <a href={receipt.imageUrl} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={receipt.imageUrl}
                alt="Fiş"
                className="h-auto w-full object-contain"
              />
            </a>
          </div>
          <div className="rounded-xl border bg-card p-4 text-sm">
            <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
              Fiş Bilgisi
            </div>
            <dl className="grid gap-1.5">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Market</dt>
                <dd className="font-medium">{receipt.marketName ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Tarih</dt>
                <dd>
                  {receipt.purchaseDate
                    ? dateFmt.format(new Date(receipt.purchaseDate))
                    : dateFmt.format(new Date(receipt.createdAt))}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Fiş tutarı</dt>
                <dd className="tabular-nums font-medium">
                  {receipt.totalAmount
                    ? tl.format(Number(receipt.totalAmount))
                    : "—"}
                </dd>
              </div>
              {receipt.bestSingleMarket && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">En iyi market</dt>
                  <dd className="text-right">
                    <div>{receipt.bestSingleMarket}</div>
                    {receipt.bestSingleTotal && (
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {tl.format(Number(receipt.bestSingleTotal))}
                      </div>
                    )}
                  </dd>
                </div>
              )}
              {isStale ? (
                <div className="mt-1 rounded-lg bg-muted/50 px-2 py-1.5 text-[11px] text-muted-foreground">
                  Bu fiş 6 aydan eski — bugünkü piyasayla kıyaslanmıyor,
                  tasarruf hesabı gösterilmiyor.
                </div>
              ) : (
                totalSavings > 0 && (
                  <div className="mt-1 flex items-center justify-between gap-3 rounded-lg bg-emerald-500/10 px-2 py-1.5">
                    <span className="text-xs text-emerald-700 dark:text-emerald-300">
                      Tasarruf edebilirdin
                    </span>
                    <Badge
                      variant="outline"
                      className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                    >
                      {tl.format(totalSavings)}
                    </Badge>
                  </div>
                )
              )}
            </dl>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <span className="text-sm font-medium">Fişteki Kalemler</span>
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
                        {it.bestMarket ?? (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
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
      </div>
    </div>
  )
}
