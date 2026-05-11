"use client"

import * as React from "react"
import Image from "next/image"
import { ExternalLinkIcon, ImageIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table"
import {
  ResponsiveDialogBody,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import {
  formatRelative,
  formatTL,
  priceTier,
} from "@/lib/format"
import type { ProductDetail } from "@/lib/camgoz/types"

type Props = {
  barcode: string
}

export function ProductDetailPanel({ barcode }: Props) {
  const [detail, setDetail] = React.useState<ProductDetail | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    fetch(`/api/products/${encodeURIComponent(barcode)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string
          } | null
          throw new Error(body?.error ?? `HTTP ${res.status}`)
        }
        return res.json() as Promise<{ detail: ProductDetail }>
      })
      .then((data) => {
        if (!active) return
        setDetail(data.detail)
      })
      .catch((err: Error) => {
        if (!active) return
        setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [barcode])

  if (loading) return <DetailSkeleton />

  if (error || !detail) {
    return (
      <>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Ürün yüklenemedi</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {error ?? "Bilinmeyen hata"}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
      </>
    )
  }

  const min = detail.minPrice ?? 0
  const max = detail.maxPrice ?? 0
  const subtitle =
    [detail.brand, detail.category].filter(Boolean).join(" · ") || null

  return (
    <>
      <ResponsiveDialogHeader>
        <div className="flex items-start gap-3 pr-6">
          <DetailThumb url={detail.imageUrl} />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="space-y-0.5">
              <ResponsiveDialogTitle className="line-clamp-2 text-[15px] font-semibold leading-snug">
                {detail.name}
              </ResponsiveDialogTitle>
              {subtitle && (
                <ResponsiveDialogDescription className="truncate text-xs">
                  {subtitle}
                </ResponsiveDialogDescription>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="default"
                className="h-5 px-2 font-mono text-[10px] font-normal tracking-tight"
              >
                {detail.barcode}
              </Badge>
              <Badge
                variant="secondary"
                className="h-5 px-2 text-[10px] font-normal text-muted-foreground"
              >
                {detail.marketCount} market
              </Badge>
            </div>
          </div>
        </div>
      </ResponsiveDialogHeader>

      <ResponsiveDialogBody>
        {detail.markets.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 px-4 py-8 text-center text-xs text-muted-foreground">
            Bu ürün için henüz market fiyat verisi yok.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border/60">
            <div className="max-h-[55vh] overflow-y-auto md:max-h-[420px]">
              <Table className="table-fixed">
                <TableBody>
                  {detail.markets.map((m, idx) => {
                    const tier = priceTier(m.price, min, max)
                    return (
                      <TableRow
                        key={`${m.market}-${idx}`}
                        className="border-border/60 last:border-b-0 hover:bg-muted/30"
                      >
                        <TableCell className="overflow-hidden px-3 py-2.5 align-middle">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="truncate text-sm font-medium text-foreground"
                              title={m.market}
                            >
                              {m.market}
                            </span>
                            {idx === 0 && (
                              <Badge
                                variant="success"
                                className="h-4 shrink-0 px-1.5 text-[10px] font-medium tracking-tight"
                              >
                                en ucuz
                              </Badge>
                            )}
                          </div>
                          {m.priceModifiedAt && (
                            <div className="mt-0.5 truncate text-[10px] text-muted-foreground/70">
                              {formatRelative(m.priceModifiedAt)}{" "}
                              güncellendi
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="w-[148px] whitespace-nowrap px-3 py-2.5 text-right align-middle">
                          <div className="flex items-center justify-end gap-1">
                            <Badge
                              variant={tier}
                              className="h-5 px-2 font-mono text-[11px] font-medium tabular-nums"
                            >
                              {formatTL(m.price)}
                            </Badge>
                            {m.sourceUrl && (
                              <Button
                                asChild
                                size="icon-xs"
                                variant="ghost"
                                className="text-muted-foreground/70 hover:text-foreground"
                              >
                                <a
                                  href={m.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`${m.market} sayfasını aç`}
                                >
                                  <ExternalLinkIcon />
                                </a>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground/60">
          Veri {formatRelative(detail.cachedAt)} önbelleğe alındı.
        </p>
      </ResponsiveDialogBody>
    </>
  )
}

function DetailThumb({ url }: { url: string | null }) {
  if (!url) {
    return (
      <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <ImageIcon className="size-5" />
      </div>
    )
  }
  return (
    <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
      <Image
        src={url}
        alt=""
        fill
        sizes="56px"
        className="object-cover"
        unoptimized
      />
    </div>
  )
}

function DetailSkeleton() {
  return (
    <>
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle className="sr-only">
          Ürün yükleniyor
        </ResponsiveDialogTitle>
        <div className="flex items-start gap-3 pr-6">
          <Skeleton className="size-14 shrink-0 rounded-lg" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-32 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
          </div>
        </div>
      </ResponsiveDialogHeader>
      <ResponsiveDialogBody>
        <div className="overflow-hidden rounded-lg border border-border/60">
          <div className="divide-y divide-border/60">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 px-3 py-2.5"
              >
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </ResponsiveDialogBody>
    </>
  )
}
