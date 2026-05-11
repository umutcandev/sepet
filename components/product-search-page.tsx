"use client"

import * as React from "react"
import Image from "next/image"
import { ImageIcon, SearchIcon } from "lucide-react"

import { ProductDetailPanel } from "@/components/product-detail-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
} from "@/components/ui/responsive-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { formatTLOrDash } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ProductHit } from "@/lib/camgoz/types"

type Result =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ok"; query: string; hits: ProductHit[] }

export function ProductSearchPage() {
  const [q, setQ] = React.useState("")
  const [result, setResult] = React.useState<Result>({ kind: "idle" })
  const [selectedBarcode, setSelectedBarcode] = React.useState<string | null>(
    null,
  )
  const abortRef = React.useRef<AbortController | null>(null)

  React.useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const trimmed = q.trim()
  const canSubmit = trimmed.length >= 2 && result.kind !== "loading"

  async function runSearch() {
    if (!canSubmit) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setResult({ kind: "loading" })

    try {
      const res = await fetch(
        `/api/products/search?q=${encodeURIComponent(trimmed)}`,
        { signal: ctrl.signal },
      )
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(body?.error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as { hits: ProductHit[] }
      if (ctrl.signal.aborted) return
      setResult({ kind: "ok", query: trimmed, hits: data.hits })
    } catch (err) {
      if ((err as Error).name === "AbortError") return
      setResult({ kind: "error", message: (err as Error).message })
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:py-8">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Ürün Ara</h1>
        <p className="text-sm text-muted-foreground">
          Ürün adı ya da barkod ile 45+ markette güncel fiyatları karşılaştır.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          runSearch()
        }}
        className="mb-6 flex max-w-xl items-center gap-2"
      >
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Barkod, ürün adı ya da marka arayın..."
            className="h-9 pl-8"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            inputMode="search"
          />
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={!canSubmit}
          className="h-9 px-3"
        >
          {result.kind === "loading" ? (
            <Spinner className="size-3.5" />
          ) : (
            <SearchIcon className="size-3.5" />
          )}
          Ara
        </Button>
      </form>

      <ResultArea
        result={result}
        inputLength={trimmed.length}
        onSelect={setSelectedBarcode}
      />

      <ResponsiveDialog
        open={selectedBarcode !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedBarcode(null)
        }}
      >
        <ResponsiveDialogContent>
          {selectedBarcode && (
            <ProductDetailPanel barcode={selectedBarcode} />
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  )
}

function ResultArea({
  result,
  inputLength,
  onSelect,
}: {
  result: Result
  inputLength: number
  onSelect: (barcode: string) => void
}) {
  if (result.kind === "loading") {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (result.kind === "error") {
    return (
      <EmptyState>
        <p className="text-sm text-destructive">Hata: {result.message}</p>
      </EmptyState>
    )
  }

  if (result.kind === "idle") {
    return (
      <EmptyState>
        <p className="text-sm text-muted-foreground">
          Arama sonucu burada görünecek. En iyi sonuçlar için ürün adı veya barkod ile arama yapın.
        </p>
      </EmptyState>
    )
  }

  if (result.hits.length === 0) {
    return (
      <EmptyState>
        <p className="text-sm text-muted-foreground">
          “{result.query}” için eşleşen ürün bulunamadı.
        </p>
      </EmptyState>
    )
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          “{result.query}” için {result.hits.length} sonuç
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {result.hits.map((hit) => (
          <ProductCard
            key={hit.barcode}
            hit={hit}
            onSelect={() => onSelect(hit.barcode)}
          />
        ))}
      </div>
    </>
  )
}

function ProductCard({
  hit,
  onSelect,
}: {
  hit: ProductHit
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-2.5 text-left",
        "transition-colors hover:border-border hover:bg-muted/20",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
        {hit.imageUrl ? (
          <Image
            src={hit.imageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
            className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageIcon className="size-8" />
          </div>
        )}
      </div>

      <div className="min-w-0 space-y-0.5">
        <div className="line-clamp-2 text-sm font-medium leading-tight text-foreground">
          {hit.name}
        </div>
        <div className="truncate text-[11px] text-muted-foreground">
          {[hit.brand, hit.category].filter(Boolean).join(" · ") ||
            hit.barcode}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        {hit.marketCount > 0 ? (
          <span className="text-[10px] text-muted-foreground/70">
            {hit.marketCount} market
          </span>
        ) : (
          <span />
        )}
        <Badge
          variant="default"
          className="h-5 px-2 font-mono text-[11px] font-normal tabular-nums"
        >
          {formatTLOrDash(hit.averagePrice)}
        </Badge>
      </div>
    </button>
  )
}

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-2.5">
      <Skeleton className="aspect-square w-full rounded-lg" />
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-2.5 w-2/3" />
      </div>
      <div className="mt-auto flex items-center justify-between pt-1">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-12 text-center">
      {children}
    </div>
  )
}
