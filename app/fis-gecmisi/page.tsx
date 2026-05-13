import Link from "next/link"

import { SparklesIcon, ChevronRightIcon } from "lucide-react"
import { auth } from "@/auth"
import { listReceipts } from "@/lib/actions/receipts"
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
import { UnauthenticatedState } from "./unauthenticated-state"

export const metadata = {
  title: "Fiş Geçmişi",
  description:
    "Yüklediğin fişler ve potansiyel tasarruflarını tek yerden takip et.",
}

const tl = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 2,
})

const dateFmt = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

export default async function ReceiptsHistoryPage() {
  const session = await auth()
  const rows = session?.user?.id ? await listReceipts(session.user.id) : []
  
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Fiş Geçmişi</h1>
          {session?.user?.id && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {rows.length} Fiş Bulundu
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Yüklediğin fişleri ve potansiyel tasarruflarını tek yerden takip et.
        </p>
      </div>

      {!session?.user?.id ? (
        <UnauthenticatedState />
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-12 text-center">
          <div className="rounded-full bg-secondary p-3 text-primary">
            <SparklesIcon className="size-5" />
          </div>
          <h2 className="text-base font-medium">Henüz fiş kaydetmedin</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Asistan&apos;a market fişinin fotoğrafını yükle. Sana ne kadar
            tasarruf edebileceğini hesaplayıp burada saklayalım.
          </p>
          <Button asChild className="mt-2">
            <Link href="/assistant">Asistan&apos;a git</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="text-[11px] uppercase tracking-wide text-muted-foreground">
                <TableHead className="min-w-[100px]">Tarih</TableHead>
                <TableHead className="min-w-[120px]">Market</TableHead>
                <TableHead className="w-28 text-right">Fiş tutarı</TableHead>
                <TableHead className="min-w-[140px]">En iyi alternatif</TableHead>
                <TableHead className="w-28 text-right">Tasarruf</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const isStale = isReceiptStaleByDate(r.purchaseDate)
                const savings =
                  !isStale && r.potentialSavingsTL
                    ? Number(r.potentialSavingsTL)
                    : 0
                return (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-secondary/50"
                  >
                    <TableCell>
                      <Link
                        href={`/fis-gecmisi/${r.id}`}
                        className="block py-1"
                      >
                        {r.purchaseDate
                          ? dateFmt.format(new Date(r.purchaseDate))
                          : dateFmt.format(new Date(r.createdAt))}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/fis-gecmisi/${r.id}`}
                        className="block py-1 font-medium"
                      >
                        {r.marketName ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <Link
                        href={`/fis-gecmisi/${r.id}`}
                        className="block py-1"
                      >
                        {r.totalAmount ? tl.format(Number(r.totalAmount)) : "—"}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/fis-gecmisi/${r.id}`}
                        className="block py-1"
                      >
                        {r.bestSingleMarket ? (
                          <span>
                            {r.bestSingleMarket}{" "}
                            <span className="text-xs text-muted-foreground">
                              {r.bestSingleTotal
                                ? `(${tl.format(Number(r.bestSingleTotal))})`
                                : ""}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <Link
                        href={`/fis-gecmisi/${r.id}`}
                        className="block py-1"
                      >
                        {savings > 0 ? (
                          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400">
                            {tl.format(savings)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/fis-gecmisi/${r.id}`}
                        className="flex items-center justify-end py-1 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <ChevronRightIcon className="size-4" />
                        <span className="sr-only">Detayları gör</span>
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
