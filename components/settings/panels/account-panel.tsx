"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { revokeAllSessions } from "@/lib/actions/sessions"

import { PanelHeader, SettingGroup, SettingRow } from "../settings-row"
import { SessionsTable } from "../account/sessions-table"
import { DeleteAccountDialog } from "../account/delete-account-dialog"

// Hesap: tüm cihazlardan çıkış + hesap arşivleme, ardından aktif oturumlar tablosu.
export function AccountPanel() {
  const [signingOut, setSigningOut] = React.useState(false)

  return (
    <div className="flex flex-col gap-8">
      <PanelHeader
        title="Hesap"
        description="Hesabını ve aktif oturumlarını buradan yönet."
      />

      <SettingGroup title="Hesap">
        <SettingRow
          title="Tüm cihazlardan çıkış yap"
          target="cikis"
          description="Tüm aktif oturumları kapatır"
        >
          <Button
            variant="outline"
            size="sm"
            disabled={signingOut}
            onClick={() => {
              setSigningOut(true)
              void revokeAllSessions()
            }}
          >
            Çıkış yap
          </Button>
        </SettingRow>
        <SettingRow
          title="Hesabımı sil"
          target="hesap-sil"
          description="14 gün içinde girmezsen kalıcı silinir"
        >
          <DeleteAccountDialog />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Aktif oturumlar">
        <SessionsTable />
      </SettingGroup>
    </div>
  )
}
