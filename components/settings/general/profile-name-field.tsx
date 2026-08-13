"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormError } from "@/components/ui/form-error"
import { useCurrentUser } from "@/components/providers/session-provider"
import { updateProfileName } from "@/lib/actions/profile"

// Tam ad düzenleme: input + "Kaydet". Kayıt sonrası oturum `refresh()` ile
// `/api/me` yeniden çekilir; getCurrentUser adı DB'den okuduğu için nav menüsü
// ve bu input senkronlanır. router.refresh() sayfanın diğer RSC verisi için.
export function ProfileNameField() {
  const router = useRouter()
  const { user, refresh } = useCurrentUser()
  const serverName = user?.name ?? ""

  const [value, setValue] = React.useState(serverName)
  const [prevServerName, setPrevServerName] = React.useState(serverName)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Sunucudaki ad değişince (kayıt + refresh) input'u senkronla — render
  // sırasında ayarlama kalıbı (effect içinde setState yerine).
  if (serverName !== prevServerName) {
    setPrevServerName(serverName)
    setValue(serverName)
  }

  const trimmed = value.trim()
  const dirty = trimmed.length > 0 && trimmed !== serverName.trim()

  const inputRef = React.useRef<HTMLInputElement>(null)

  const save = React.useCallback(async () => {
    if (saving) return
    // Doğrulama submit'te: buton hep etkin, eksik olan burada söylenir ve
    // odak alana geri gider.
    if (trimmed.length === 0) {
      setError("Ad boş olamaz.")
      inputRef.current?.focus()
      return
    }
    if (!dirty) {
      setError("Adda bir değişiklik yok.")
      inputRef.current?.focus()
      return
    }
    setSaving(true)
    setError(null)
    const res = await updateProfileName(trimmed)
    setSaving(false)
    if (!res.ok) {
      setError(res.error ?? "Kaydedilemedi.")
      return
    }
    void refresh()
    router.refresh()
  }, [dirty, saving, trimmed, router, refresh])

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              void save()
            }
          }}
          maxLength={80}
          aria-label="Tam ad"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "profile-name-error" : undefined}
          className="h-7 w-32 text-sm sm:w-40"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => void save()}
          disabled={saving}
        >
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </div>
      <FormError id="profile-name-error">{error}</FormError>
    </div>
  )
}
