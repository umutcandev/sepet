"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"

import { PanelHeader, SettingGroup, SettingRow } from "../settings-row"
import { ExportDataDialog } from "../privacy/export-data-dialog"
import { ClearDataDialog } from "../privacy/clear-data-dialog"
import { AnalyticsToggle } from "../privacy/analytics-toggle"

// Gizlilik: verilerini dışa aktar, toplu sil, analiz tercihi ve yasal kısayol.
// GeneralPanel/AccountPanel ile aynı PanelHeader + SettingGroup + SettingRow
// kalıbını kullanır.
export function PrivacyPanel() {
  return (
    <div className="flex flex-col gap-8">
      <PanelHeader
        title="Gizlilik"
        description="Verilerini dışa aktar, sil ve gizlilik tercihlerini buradan yönet."
      />

      <SettingGroup title="Verilerin">
        <SettingRow
          title="Verilerini dışa aktar"
          target="veri-disa-aktar"
          description="Hesap verilerini ve içeriklerini dışa aktar"
        >
          <ExportDataDialog />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Verilerimi sil">
        <SettingRow
          title="Tüm sohbetleri sil"
          target="sohbet-sil"
          description="Asistan geçmişin kalıcı silinir"
        >
          <ClearDataDialog kind="conversations" />
        </SettingRow>
        <SettingRow
          title="Tüm sepetleri sil"
          target="sepet-sil"
          description="Kayıtlı sepetlerin kalıcı silinir"
        >
          <ClearDataDialog kind="baskets" />
        </SettingRow>
        <SettingRow
          title="Tüm fişleri sil"
          target="fis-sil"
          description="Fişlerin ve görselleri kalıcı silinir"
        >
          <ClearDataDialog kind="receipts" />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Gizlilik tercihleri">
        <SettingRow
          title="Analiz çerezleri"
          target="analiz-cerezleri"
          description="Anonim kullanım analizine izin ver"
        >
          <AnalyticsToggle />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Yasal">
        <SettingRow
          title="Gizlilik Politikası"
          target="gizlilik-politikasi"
          description="Verilerini nasıl işlediğimizi ve koruduğumuzu öğren"
        >
          <Button variant="outline" size="sm" asChild>
            <Link href="/gizlilik" target="_blank" rel="noopener noreferrer">
              Görüntüle
            </Link>
          </Button>
        </SettingRow>
      </SettingGroup>
    </div>
  )
}
