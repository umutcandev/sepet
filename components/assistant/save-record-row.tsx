"use client"

import * as React from "react"
import Link from "next/link"
import { CheckIcon, ExternalLinkIcon, Loader2Icon, SaveIcon } from "lucide-react"

import { toast } from "@/components/ui/sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type SaveOutcome =
  | { ok: true; id: string }
  | { ok: false; reason: "storage_limit_reached" }

type Props = {
  /** Ad alanının placeholder'ı — kaydedilmezse kullanılacak otomatik ad. */
  namePlaceholder: string
  nameLabel: string
  saveLabel: string
  /** Kaydedilen kaydın detay sayfası. */
  viewHref: (id: string) => string
  initialSavedId?: string | null
  save: (name: string | null) => Promise<SaveOutcome>
  limitMessage: string
  successMessage: string
  errorMessage: string
  /** Kaydetmeyi tamamen engelleyen bir koşul (ör. fişte R2 key yok). */
  disabled?: boolean
  size?: "sm" | "default"
  className?: string
}

/**
 * Sepet ve fiş kartlarının ortak "kaydet" bölümü.
 *
 * Daha önce iki kart aynı işi yapıp iki farklı sonuç veriyordu: sepet kartı ad
 * alanı + "Kaydedildi" + "Görüntüle" gösteriyor, fiş kartı yalnızca devre dışı
 * bir "Kaydedildi" rozeti bırakıyordu — kullanıcı fişini görmek için menüden
 * listeye gidip aramak zorunda kalıyordu, ve her fiş listede birbirinin aynı
 * görünüyordu. Davranış farkı olmasın diye tek bileşen.
 */
export function SaveRecordRow({
  namePlaceholder,
  nameLabel,
  saveLabel,
  viewHref,
  initialSavedId = null,
  save,
  limitMessage,
  successMessage,
  errorMessage,
  disabled = false,
  size = "default",
  className,
}: Props) {
  const [name, setName] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [savedId, setSavedId] = React.useState<string | null>(initialSavedId)

  async function handleSave() {
    if (saving || savedId || disabled) return
    setSaving(true)
    try {
      const res = await save(name.trim() || null)
      if (!res.ok) {
        toast.error(limitMessage)
        return
      }
      setSavedId(res.id)
      toast.success(successMessage)
    } catch (err) {
      console.error("[SaveRecordRow] save failed", err)
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={namePlaceholder}
        disabled={!!savedId || saving || disabled}
        className={cn("min-w-[180px] flex-1", size === "sm" ? "h-8" : "h-9")}
        aria-label={nameLabel}
      />
      {savedId ? (
        <div className="flex items-center gap-2">
          <Button type="button" size={size} variant="secondary" disabled>
            <CheckIcon className="mr-1 size-3.5" />
            Kaydedildi
          </Button>
          <Button type="button" size={size} variant="outline" asChild>
            <Link href={viewHref(savedId)}>
              <ExternalLinkIcon className="mr-1 size-3.5" />
              Görüntüle
            </Link>
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          size={size}
          onClick={handleSave}
          disabled={saving || disabled}
        >
          {saving ? (
            <Loader2Icon className="mr-1 size-3.5 animate-spin" />
          ) : (
            <SaveIcon className="mr-1 size-3.5" />
          )}
          {saveLabel}
        </Button>
      )}
    </div>
  )
}
