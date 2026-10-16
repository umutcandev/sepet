"use client"

import * as React from "react"
import Link from "next/link"
import { RiCheckLine, RiExternalLinkLine } from "@remixicon/react"

import { toast } from "@/components/ui/sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
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
    note?: string | null
  }>
  matches: MatchResult[]
  summary: OptimizationSummary
}

function autoName(): string {
  const fmt = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
  return `Sepet · ${fmt.format(new Date())}`
}

/**
 * Sepet Özeti kartının alt şeridindeki "Kaydet".
 *
 * Eskiden özetin altında ayrı bir "Sepeti Kaydet" kartı vardı ve ad alanı
 * hep açık duruyordu; kaydetmeyen kullanıcı için de yer kaplıyordu. Artık
 * özetin kendi şeridinde tek bir buton; ad isteğe bağlı ve dialogda sorulur.
 * Kaydedilen, kartın o anki hâlidir (Değiştir ile düzenlenmişse o hâli).
 */
export function BasketSaveFooter({
  data,
  conversationId,
  toolCallId,
  savedId,
  onSaved,
}: {
  data: BasketContextPayload
  conversationId: string | null
  toolCallId: string | null
  savedId: string | null
  onSaved: (id: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  // Placeholder dialog her açıldığında o anın saatini göstersin: boş
  // bırakılırsa sunucu da kayıt anının saatiyle adlandırıyor.
  const [placeholder, setPlaceholder] = React.useState("")

  function openDialog() {
    setPlaceholder(autoName())
    setOpen(true)
  }

  async function handleSave(event?: React.FormEvent) {
    event?.preventDefault()
    if (saving || savedId) return
    setSaving(true)
    try {
      const res = await saveBasket({
        name: name.trim() || null,
        items: data.items.map((it) => ({
          rawName: it.rawName,
          searchQuery: it.searchQuery,
          quantity: it.quantity,
          unit: it.unit,
        })),
        matches: data.matches,
        summary: data.summary,
        conversationId,
        sourceToolCallId: toolCallId,
      })
      if (!res.ok) {
        toast.error(
          "Sepet kaydetme limitin doldu. Eski bir sepeti sil ya da Pro'ya geç."
        )
        return
      }
      onSaved(res.id)
      setOpen(false)
      toast.success("Sepet kaydedildi.")
    } catch (err) {
      console.error("[BasketSaveFooter] save failed", err)
      toast.error("Sepet kaydedilemedi. Lütfen tekrar dene.")
    } finally {
      setSaving(false)
    }
  }

  if (savedId) {
    return (
      <div className="ml-auto flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <RiCheckLine className="size-3.5" aria-hidden="true" />
          Kaydedildi
        </span>
        <Button type="button" size="sm" variant="outline" asChild>
          <Link href={`/sepetlerim/${savedId}`}>
            <RiExternalLinkLine data-icon="inline-start" />
            Görüntüle
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="default"
        className="ml-auto"
        onClick={openDialog}
      >
        Kaydet
      </Button>

      <ResponsiveDialog
        open={open}
        onOpenChange={(next) => {
          if (!saving) setOpen(next)
        }}
      >
        <ResponsiveDialogContent className="sm:max-w-md">
          <form onSubmit={handleSave} className="contents">
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>Sepeti kaydet</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                İstersen sepete bir ad ver. Boş bırakırsan tarih ve saatle
                kaydedilir.
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <ResponsiveDialogBody>
              <div className="grid gap-2">
                <Label htmlFor="basket-name">Sepet adı (isteğe bağlı)</Label>
                <Input
                  id="basket-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={placeholder}
                  maxLength={100}
                  disabled={saving}
                  autoComplete="off"
                />
              </div>
            </ResponsiveDialogBody>
            <ResponsiveDialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Vazgeç
              </Button>
              <Button type="submit" variant="default" disabled={saving}>
                {saving ? "Kaydediliyor…" : "Kaydet"}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  )
}
