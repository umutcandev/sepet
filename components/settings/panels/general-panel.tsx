"use client"

import { Button } from "@/components/ui/button"
import { useUserLocation } from "@/lib/stores/location"
import { locationDialog } from "@/lib/stores/location-dialog"

import { PanelHeader, SettingGroup, SettingRow } from "../settings-row"
import { AvatarChanger } from "../general/avatar-changer"
import { ProfileNameField } from "../general/profile-name-field"
import { AppearanceTheme } from "../general/appearance-theme"

// Genel: Profil (avatar, tam ad, konum) + Görünüm (tema). Satır ayraçları
// SettingGroup'taki divide-y ile çizilir; ayrı <Separator/> yok.
export function GeneralPanel() {
  const { location } = useUserLocation()
  const label = location?.label?.trim()

  return (
    <div className="flex flex-col gap-8">
      <PanelHeader
        title="Genel"
        description="Profilini ve görünüm tercihlerini buradan yönet."
      />

      <SettingGroup title="Profil">
        <SettingRow
          title="Avatar"
          target="avatar"
          description="Profil fotoğrafın"
        >
          <AvatarChanger />
        </SettingRow>
        <SettingRow
          title="Tam ad"
          target="tam-ad"
          description="Uygulamada görünen adın"
        >
          <ProfileNameField />
        </SettingRow>
        <SettingRow
          title="Konum"
          target="konum"
          description={label ?? "Market ve fiyatlar için konumun"}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => locationDialog.open()}
          >
            {label ? "Düzenle" : "Konum seç"}
          </Button>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Görünüm">
        <SettingRow
          title="Tema"
          target="tema"
          description="Uygulamanın renk teması"
        >
          <AppearanceTheme />
        </SettingRow>
      </SettingGroup>
    </div>
  )
}
