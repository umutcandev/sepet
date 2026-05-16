"use client"

import * as React from "react"
import Link from "next/link"
import { CheckIcon, ExternalLinkIcon, Loader2Icon, SaveIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { saveBasket } from "@/lib/actions/baskets"
import type {
  MatchResult,
  OptimizationSummary,
  ParsedItem,
} from "@/lib/ai/schemas"

export type BasketContextPayload = {
  items: Array<{
    rawName: string
    searchQuery: string
    quantity: number
    unit: ParsedItem["unit"]
  }>
  matches: MatchResult[]
  summary: OptimizationSummary
}

export function BasketSaveCard({
  data,
  conversationId = null,
  toolCallId = null,
  initialSavedId = null,
}: {
  data: BasketContextPayload
  conversationId?: string | null
  toolCallId?: string | null
  initialSavedId?: string | null
}) {
  const [name, setName] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [savedId, setSavedId] = React.useState<string | null>(initialSavedId)

  const placeholder = React.useMemo(() => {
    const fmt = new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
    return `Sepet · ${fmt.format(new Date())}`
  }, [])

  async function handleSave() {
    if (saving || savedId) return
    setSaving(true)
    try {
      const res = await saveBasket({
        name: name.trim() || null,
        items: data.items,
        matches: data.matches,
        summary: data.summary,
        conversationId,
        sourceToolCallId: toolCallId,
      })
      setSavedId(res.id)
      toast.success("Sepet kaydedildi.")
    } catch (err) {
      console.error("[BasketSaveCard] save failed", err)
      toast.error("Sepet kaydedilemedi. Lütfen tekrar dene.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <span className="text-sm font-medium">Sepeti Kaydet</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          disabled={!!savedId || saving}
          className="h-9 flex-1 min-w-[180px]"
          aria-label="Sepet adı"
        />
        {savedId ? (
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="secondary" disabled>
              <CheckIcon className="mr-1 size-3.5" />
              Kaydedildi
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href={`/sepetlerim/${savedId}`}>
                <ExternalLinkIcon className="mr-1 size-3.5" />
                Görüntüle
              </Link>
            </Button>
          </div>
        ) : (
          <Button type="button" size="lg" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2Icon className="mr-1 size-3.5 animate-spin" />
            ) : (
              <SaveIcon className="mr-1 size-3.5" />
            )}
            Sepeti Kaydet
          </Button>
        )}
      </div>
    </div>
  )
}
