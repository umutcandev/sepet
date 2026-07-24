"use client"

import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getSecurityStateAction } from "@/lib/actions/password"

import { SettingGroup, SettingRow } from "../settings-row"
import { PasswordDialog } from "./password-dialog"
import { TwoFactorDialog } from "./two-factor-dialog"

type SecurityState = { hasPassword: boolean; twoFactorEnabled: boolean }

// Ayarlar > Hesap > Güvenlik: şifre (değiştir/belirle) + iki adımlı doğrulama.
// Durum mount'ta yüklenir; bir işlem sonrası refresh ile tazelenir.
export function SecurityGroup() {
  const [state, setState] = React.useState<SecurityState | null>(null)
  const [loading, setLoading] = React.useState(true)

  // onChanged için (event handler'lardan çağrılır; effect'ten değil).
  const refresh = React.useCallback(async () => {
    const s = await getSecurityStateAction()
    if (s) setState(s)
    setLoading(false)
  }, [])

  React.useEffect(() => {
    let active = true
    getSecurityStateAction()
      .then((s) => {
        if (!active) return
        if (s) setState(s)
        setLoading(false)
      })
      .catch(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const hasPassword = state?.hasPassword ?? false
  const twoFactorEnabled = state?.twoFactorEnabled ?? false

  return (
    <SettingGroup title="Güvenlik">
      <SettingRow
        title="Şifre"
        target="sifre"
        description={
          hasPassword
            ? "Hesap şifreni değiştir"
            : "Google hesabın için bir şifre belirle"
        }
      >
        {loading ? (
          <Skeleton className="h-7 w-28" />
        ) : (
          <PasswordDialog hasPassword={hasPassword} onChanged={refresh} />
        )}
      </SettingRow>
      <SettingRow
        title="İki adımlı doğrulama"
        target="iki-adimli-dogrulama"
        description="Girişte şifrenin yanında bir kod da iste"
      >
        {loading ? (
          <Skeleton className="h-7 w-28" />
        ) : (
          <div className="flex items-center gap-2">
            <Badge variant={twoFactorEnabled ? "default" : "secondary"}>
              {twoFactorEnabled ? "Açık" : "Kapalı"}
            </Badge>
            <TwoFactorDialog
              enabled={twoFactorEnabled}
              hasPassword={hasPassword}
              onChanged={refresh}
            />
          </div>
        )}
      </SettingRow>
    </SettingGroup>
  )
}
