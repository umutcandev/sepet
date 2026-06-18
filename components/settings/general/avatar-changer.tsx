"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CameraIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useCurrentUser } from "@/components/providers/session-provider"
import { resetAvatar, setAvatar } from "@/lib/actions/profile"
import { cn } from "@/lib/utils"

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
const MAX_BYTES = 8 * 1024 * 1024 // 8 MB

// PPCHANGER: avatara tıklamak = yükle (hover'da kamera overlay'i). Özel görsel
// varken avatarın sağında "Kaldır" butonu Google fotoğrafına döndürür.
export function AvatarChanger() {
  const router = useRouter()
  const { user } = useCurrentUser()
  const fileRef = React.useRef<HTMLInputElement>(null)

  const [opt, setOpt] = React.useState<{ src: string; isCustom: boolean } | null>(
    null,
  )
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const shown = opt?.src ?? user?.avatar ?? ""
  const isCustom = opt ? opt.isCustom : (user?.hasCustomAvatar ?? false)
  const initial = (user?.name ?? "K").charAt(0).toUpperCase()

  const pick = () => {
    if (!busy) fileRef.current?.click()
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = "" // aynı dosya tekrar seçilebilsin
    if (!file) return

    setError(null)
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Sadece JPEG / PNG / WebP fotoğraf.")
      return
    }
    if (file.size > MAX_BYTES) {
      setError("Dosya 8 MB'tan büyük olamaz.")
      return
    }

    setBusy(true)
    try {
      const res = await fetch("/api/avatar/upload", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string
        } | null
        throw new Error(data?.message ?? "Yükleme reddedildi.")
      }
      const { publicUrl } = (await res.json()) as {
        key: string
        publicUrl: string
      }
      const saved = await setAvatar(publicUrl)
      if (!saved.ok) throw new Error(saved.error ?? "Kaydedilemedi.")
      setOpt({ src: publicUrl, isCustom: true })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.")
    } finally {
      setBusy(false)
    }
  }

  async function onReset() {
    setBusy(true)
    setError(null)
    try {
      const res = await resetAvatar()
      if (!res.ok) throw new Error("İşlem başarısız.")
      setOpt({ src: user?.googleAvatar ?? "", isCustom: false })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2.5">
        <div className="group/pp relative size-10">
          <button
            type="button"
            onClick={pick}
            disabled={busy}
            aria-label="Profil fotoğrafını değiştir"
            className="block size-10 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Avatar size="lg" className="size-10 rounded-full">
              <AvatarImage src={shown || undefined} alt="" />
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
            {/* Yükleme overlay'i — hover'da (ya da yüklenirken) belirir */}
            <span
              className={cn(
                "pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-foreground/45 text-background opacity-0 transition-opacity group-hover/pp:opacity-100",
                busy && "animate-pulse opacity-100",
              )}
            >
              <CameraIcon className="size-3.5" />
            </span>
          </button>
        </div>

        {/* Özel görsel varken Google fotoğrafına döndüren buton */}
        {isCustom && !busy ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void onReset()}
          >
            Kaldır
          </Button>
        ) : null}
      </div>

      {error ? <span className="text-xs text-destructive">{error}</span> : null}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onPick}
      />
    </div>
  )
}
