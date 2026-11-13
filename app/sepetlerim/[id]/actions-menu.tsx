"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { RiQuestionAnswerLine, RiRefreshLine } from "@remixicon/react"

import { toast } from "@/components/ui/sonner"
import {
  RecordActionsMenu,
  type RecordActionLink,
} from "@/components/records/record-actions-menu"
import { ShareRecordDialog } from "@/components/records/share-record-dialog"
import { deleteBasket } from "@/lib/actions/baskets"
import type { ShareStatus } from "@/lib/share/types"

export function BasketActionsMenu({
  id,
  title,
  conversation,
  refreshHref,
  freshnessLabel,
  isStale,
  shareStatus,
}: {
  id: string
  title: string
  conversation: { id: string; title: string } | null
  /** Aynı kalemlerle asistanda yeniden hesaplatma adresi; kalem yoksa null. */
  refreshHref: string | null
  /** "bugün" · "7 gün önce" — priceFreshness().ageLabel */
  freshnessLabel: string | null
  isStale: boolean
  shareStatus: ShareStatus
}) {
  const router = useRouter()
  const [shareOpen, setShareOpen] = React.useState(false)

  const links: RecordActionLink[] = []
  if (refreshHref) {
    links.push({
      label: "Fiyatları yenile",
      href: refreshHref,
      icon: <RiRefreshLine className="size-4" />,
      // Fiyatların yaşı yenilemenin GEREKÇESİ; eskiden butonun tooltip'indeydi,
      // dokunmatik ekranda hiç görünmüyordu. Artık kalemin kendi alt satırı.
      hint: freshnessLabel
        ? `Fiyatlar ${freshnessLabel} alındı${isStale ? ", güncel olmayabilir" : ""}`
        : null,
    })
  }
  if (conversation) {
    links.push({
      label: "Sohbete git",
      href: `/asistan/${conversation.id}`,
      icon: <RiQuestionAnswerLine className="size-4" />,
      hint: conversation.title.trim() || null,
    })
  }

  return (
    <>
      <RecordActionsMenu
        links={links}
        onShare={() => setShareOpen(true)}
        deleteLabel="Sepeti sil"
        deleteTitle="Sepeti silmek istediğine emin misin?"
        deleteDescription="Sepet ve içindeki kalemler kalıcı olarak silinecek. Bu işlem geri alınamaz."
        onDelete={async () => {
          try {
            await deleteBasket(id)
            toast.success("Sepet silindi.")
            router.push("/sepetlerim")
            router.refresh()
            return true
          } catch (err) {
            console.error("[BasketActionsMenu] delete failed", err)
            toast.error("Sepet silinemedi.")
            return false
          }
        }}
      />
      <ShareRecordDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        kind="basket"
        recordId={id}
        title={title}
        initialStatus={shareStatus}
      />
    </>
  )
}
