"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCurrentUser } from "@/components/providers/session-provider"
import { updateProfileName } from "@/lib/actions/profile"

// Tam ad düzenleme: input + "Kaydet". Kayıt sonrası router.refresh() ile RSC
// yeniden çalışır; getCurrentUser adı DB'den okuduğu için nav menüsü de güncellenir.
export function ProfileNameField() {
  const router = useRouter()
  const { user } = useCurrentUser()
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

  const save = React.useCallback(async () => {
    if (!dirty || saving) return
    setSaving(true)
    setError(null)
    const res = await updateProfileName(trimmed)
    setSaving(false)
    if (!res.ok) {
      setError(res.error ?? "Kaydedilemedi.")
      return
    }
    router.refresh()
  }, [dirty, saving, trimmed, router])

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <Input
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
          className="h-7 w-32 text-sm sm:w-40"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => void save()}
          disabled={!dirty || saving}
        >
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </div>
      {error ? (
        <span className="text-xs text-destructive">{error}</span>
      ) : null}
    </div>
  )
}
