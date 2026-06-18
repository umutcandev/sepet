"use client"

import * as React from "react"
import { CheckCircle2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { EXPORT_CATEGORIES, type ExportCategory } from "@/lib/privacy/categories"

type Status = "idle" | "preparing" | "ready" | "error"

const CATEGORY_INFO: Record<
  ExportCategory,
  { title: string; description: string }
> = {
  profil: {
    title: "Profil ve hesap",
    description: "Ad, e-posta, oturumlar, kullanım",
  },
  sepetler: {
    title: "Sepetlerim",
    description: "Kayıtlı sepetler ve ürünleri",
  },
  fisler: {
    title: "Fişlerim",
    description: "Fişler ve yüklenen görseller",
  },
  sohbetler: {
    title: "Sohbet geçmişi",
    description: "Asistan sohbetleri ve mesajları",
  },
}

function filenameFromDisposition(value: string | null): string | null {
  if (!value) return null
  const m = /filename="?([^"]+)"?/i.exec(value)
  return m ? m[1] : null
}

export function ExportDataDialog() {
  const [open, setOpen] = React.useState(false)
  const [status, setStatus] = React.useState<Status>("idle")
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [selected, setSelected] = React.useState<Set<ExportCategory>>(
    () => new Set(EXPORT_CATEGORIES),
  )
  const [download, setDownload] = React.useState<{
    url: string
    filename: string
  } | null>(null)

  // Açık obje URL'ini sızdırmamak için temizle.
  const revoke = React.useCallback(() => {
    setDownload((prev) => {
      if (prev) URL.revokeObjectURL(prev.url)
      return null
    })
  }, [])

  React.useEffect(() => () => revoke(), [revoke])

  function reset() {
    revoke()
    setStatus("idle")
    setErrorMsg(null)
    setSelected(new Set(EXPORT_CATEGORIES))
  }

  function handleOpenChange(next: boolean) {
    // Hazırlanırken kapanmayı engelle (istek arka planda kalır, blob kaybolur).
    if (!next && status === "preparing") return
    setOpen(next)
    if (!next) reset()
  }

  function toggle(cat: ExportCategory, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(cat)
      else next.delete(cat)
      return next
    })
  }

  async function startExport() {
    revoke()
    setStatus("preparing")
    setErrorMsg(null)
    try {
      const res = await fetch("/api/privacy/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: Array.from(selected) }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string
        } | null
        throw new Error(data?.message ?? "Veriler dışa aktarılamadı.")
      }
      const blob = await res.blob()
      const filename =
        filenameFromDisposition(res.headers.get("Content-Disposition")) ??
        "sepet-verilerim.zip"
      const url = URL.createObjectURL(blob)
      setDownload({ url, filename })
      setStatus("ready")
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Veriler dışa aktarılamadı.",
      )
      setStatus("error")
    }
  }

  const nothingSelected = selected.size === 0
  const preparing = status === "preparing"

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Dışa aktar
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent showCloseButton={!preparing}>
          {status === "ready" && download ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2Icon className="size-4 text-primary" />
                  Verilerin hazır
                </DialogTitle>
                <DialogDescription>
                  Dışa aktardığın veriler hazır. Aşağıdaki butona tıklayarak bilgisayarına indir. Verileri güvenli bir şekilde saklamayı unutma; bu veriler kişisel bilgiler içerir.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Kapat</Button>
                </DialogClose>
                <Button asChild>
                  <a href={download.url} download={download.filename}>
                    İndir
                  </a>
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Verilerini dışa aktar</DialogTitle>
                <DialogDescription>
                  Seçtiğin veriler bu sayfada hazırlanır ve sana teslim edilir. Bu işlem biraz zaman alabilir.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-1">
                <div className="flex flex-col divide-y divide-border">
                  {EXPORT_CATEGORIES.map((cat) => {
                    const info = CATEGORY_INFO[cat]
                    const checked = selected.has(cat)
                    return (
                      <label
                        key={cat}
                        className="flex cursor-pointer items-center justify-between gap-3 py-2.5"
                      >
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-sm">{info.title}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {info.description}
                          </span>
                        </span>
                        <Checkbox
                          checked={checked}
                          disabled={preparing}
                          onCheckedChange={(v) => toggle(cat, v === true)}
                        />
                      </label>
                    )
                  })}
                </div>
                {errorMsg ? (
                  <p className="pt-1 text-xs text-destructive">{errorMsg}</p>
                ) : null}
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={preparing}>
                    Vazgeç
                  </Button>
                </DialogClose>
                <Button
                  onClick={startExport}
                  disabled={preparing || nothingSelected}
                >
                  {preparing ? (
                    <>
                      <Spinner />
                      Hazırlanıyor…
                    </>
                  ) : status === "error" ? (
                    "Tekrar dene"
                  ) : (
                    "Dışa aktar"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
