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

export type SaveOutcome =
  | { ok: true; id: string }
  | { ok: false; reason: "storage_limit_reached" }

type Props = {
  /** Ad boş bırakılırsa kullanılacak otomatik ad. */
  namePlaceholder: string
  nameLabel: string
  dialogTitle: string
  dialogDescription: string
  /** Kaydedilen kaydın detay sayfası. */
  viewHref: (id: string) => string
  initialSavedId?: string | null
  save: (name: string | null) => Promise<SaveOutcome>
  limitMessage: string
  successMessage: string
  errorMessage: string
  /** Kaydetmeyi tamamen engelleyen bir koşul (ör. fişte R2 key yok). */
  disabled?: boolean
}

/** Kart alt şeridindeki "Kaydet": Sepet Özeti'ndeki (BasketSaveFooter) ile aynı kalıp, ad dialogda sorulur. */
export function SaveRecordRow({
  namePlaceholder,
  nameLabel,
  dialogTitle,
  dialogDescription,
  viewHref,
  initialSavedId = null,
  save,
  limitMessage,
  successMessage,
  errorMessage,
  disabled = false,
}: Props) {
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [savedId, setSavedId] = React.useState<string | null>(initialSavedId)

  async function handleSave(event?: React.FormEvent) {
    event?.preventDefault()
    if (saving || savedId || disabled) return
    setSaving(true)
    try {
      const res = await save(name.trim() || null)
      if (!res.ok) {
        toast.error(limitMessage)
        return
      }
      setSavedId(res.id)
      setOpen(false)
      toast.success(successMessage)
    } catch (err) {
      console.error("[SaveRecordRow] save failed", err)
      toast.error(errorMessage)
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
        <Button type="button" size="sm" variant="outline" className="h-6" asChild>
          <Link href={viewHref(savedId)}>
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
        className="ml-auto h-6"
        onClick={() => setOpen(true)}
        disabled={disabled}
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
              <ResponsiveDialogTitle>{dialogTitle}</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                {dialogDescription}
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <ResponsiveDialogBody>
              <div className="grid gap-2">
                <Label htmlFor="record-name">{nameLabel}</Label>
                <Input
                  id="record-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={namePlaceholder}
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
