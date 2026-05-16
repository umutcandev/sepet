import Link from "next/link"

import { ChevronRightIcon, ShoppingBasketIcon } from "lucide-react"
import { auth } from "@/auth"
import { listBaskets } from "@/lib/actions/baskets"
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
  title: "Sepetlerim",
  description:
    "Oluşturduğun sepetler ve her birinin en ucuz market seçeneklerini tek yerden takip et.",
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

export default async function BasketsPage() {
  const session = await auth()
  const rows = session?.user?.id ? await listBaskets(session.user.id) : []

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Sepetlerim</h1>
          {session?.user?.id && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {rows.length} Sepet
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Asistana yazdığın alışveriş listelerinden oluşturduğun sepetleri
          buradan takip et.
        </p>
      </div>

      {!session?.user?.id ? (
        <UnauthenticatedState />
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-12 text-center">
          <div className="rounded-full bg-secondary p-3 text-primary">
            <ShoppingBasketIcon className="size-5" />
          </div>
          <h2 className="text-base font-medium">Henüz sepet oluşturmadın</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Asistana alışveriş listeni yaz. Kalemleri onayladığında 45+ markette
            en ucuzunu bulup buraya kaydedelim.
          </p>
          <Button asChild className="mt-2">
            <Link href="/asistan">Asistan&apos;a git</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="text-[11px] uppercase tracking-wide text-muted-foreground">
                <TableHead className="min-w-[100px]">Tarih</TableHead>
                <TableHead className="min-w-[160px]">Sepet adı</TableHead>
                <TableHead className="min-w-[140px]">En iyi market</TableHead>
                <TableHead className="w-28 text-right">Toplam</TableHead>
                <TableHead className="w-28 text-right">2 market tasarrufu</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b) => {
                const twoMarket = b.twoMarketSavingsTL
                  ? Number(b.twoMarketSavingsTL)
                  : 0
                return (
                  <TableRow
                    key={b.id}
                    className="cursor-pointer hover:bg-secondary/50"
                  >
                    <TableCell>
                      <Link href={`/sepetlerim/${b.id}`} className="block py-1">
                        {dateFmt.format(new Date(b.createdAt))}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/sepetlerim/${b.id}`}
                        className="block py-1 font-medium"
                      >
                        {b.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/sepetlerim/${b.id}`} className="block py-1">
                        {b.bestSingleMarket ? (
                          <span>{b.bestSingleMarket}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <Link href={`/sepetlerim/${b.id}`} className="block py-1">
                        {b.bestSingleTotal
                          ? tl.format(Number(b.bestSingleTotal))
                          : "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <Link href={`/sepetlerim/${b.id}`} className="block py-1">
                        {twoMarket > 0 ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400"
                          >
                            {tl.format(twoMarket)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/sepetlerim/${b.id}`}
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
