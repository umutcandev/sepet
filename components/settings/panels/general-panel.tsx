"use client"

import { RiErrorWarningLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"
import { useUserLocation } from "@/lib/stores/location"
import { locationDialog } from "@/lib/stores/location-dialog"

import { PanelHeader, SettingGroup, SettingRow } from "../settings-row"
import { AvatarChanger } from "../general/avatar-changer"
import { ProfileNameField } from "../general/profile-name-field"
import { ThemeSwitcher } from "@/components/theme-toggle"

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
          description={
            location ? (
              label ?? "Haritadan seçildi"
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-300">
                <RiErrorWarningLine className="size-3.5 shrink-0" aria-hidden />
                Konum ayarlanmadı, fiyatlar için konumunu seç
              </span>
            )
          }
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => locationDialog.open()}
          >
            {location ? "Düzenle" : "Konum seç"}
          </Button>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Görünüm">
        <SettingRow
          title="Tema"
          target="tema"
          description="Uygulamanın renk teması"
        >
          <ThemeSwitcher />
        </SettingRow>
      </SettingGroup>
    </div>
  )
}
