"use client"

import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getSecurityStateAction } from "@/lib/actions/password"
import { providerLabel, type OAuthProviderId } from "@/lib/auth/providers"

import { SettingGroup, SettingRow } from "../settings-row"
import { PasswordDialog } from "./password-dialog"
import { TwoFactorDialog } from "./two-factor-dialog"

type SecurityState = {
  hasPassword: boolean
  twoFactorEnabled: boolean
  provider: OAuthProviderId | null
}

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
  // Sağlayıcı okunamazsa isim vermeden yaz
  const label = providerLabel(state?.provider ?? null)
  const setPasswordDescription = label
    ? `${label} hesabın için bir şifre belirle`
    : "Hesabın için bir şifre belirle"

  return (
    <SettingGroup title="Güvenlik">
      <SettingRow
        title="Şifre"
        target="sifre"
        description={
          hasPassword ? "Hesap şifreni değiştir" : setPasswordDescription
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
        titleAccessory={
          loading ? null : (
            <Badge variant={twoFactorEnabled ? "default" : "secondary"}>
              {twoFactorEnabled ? "Açık" : "Kapalı"}
            </Badge>
          )
        }
        target="iki-adimli-dogrulama"
        description="Hesabın için ek güvenlik katmanı ekle"
      >
        {loading ? (
          <Skeleton className="h-7 w-28" />
        ) : (
          <TwoFactorDialog
            enabled={twoFactorEnabled}
            hasPassword={hasPassword}
            onChanged={refresh}
          />
        )}
      </SettingRow>
    </SettingGroup>
  )
}
