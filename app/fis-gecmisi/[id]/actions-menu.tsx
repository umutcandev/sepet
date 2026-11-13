"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { RiQuestionAnswerLine } from "@remixicon/react"

import { toast } from "@/components/ui/sonner"
import {
  RecordActionsMenu,
  type RecordActionLink,
} from "@/components/records/record-actions-menu"
import { ShareRecordDialog } from "@/components/records/share-record-dialog"
import { deleteReceipt } from "@/lib/actions/receipts"
import type { ShareStatus } from "@/lib/share/types"

/**
 * Fişte "fiyatları yenile" yok — OCR karşılaştırması tekrar kurulamaz. Menü bu
 * yüzden sepetinkinden bir kalem eksik; yerleşim, etiket dili ve silme akışı
 * ikisinde de aynı (bkz. RecordActionsMenu).
 */
export function ReceiptActionsMenu({
  id,
  title,
  conversation,
  shareStatus,
  hasImage,
}: {
  id: string
  title: string
  conversation: { id: string; title: string } | null
  shareStatus: ShareStatus
  hasImage: boolean
}) {
  const router = useRouter()
  const [shareOpen, setShareOpen] = React.useState(false)

  const links: RecordActionLink[] = conversation
    ? [
        {
          label: "Sohbete git",
          href: `/asistan/${conversation.id}`,
          icon: <RiQuestionAnswerLine className="size-4" />,
          hint: conversation.title.trim() || null,
        },
      ]
    : []

  return (
    <>
      <RecordActionsMenu
        links={links}
        onShare={() => setShareOpen(true)}
        deleteLabel="Fişi sil"
        deleteTitle="Fişi silmek istediğine emin misin?"
        deleteDescription="Fiş ve içindeki kalemler kalıcı olarak silinecek. Bu işlem geri alınamaz."
        onDelete={async () => {
          try {
            await deleteReceipt(id)
            toast.success("Fiş silindi.")
            router.push("/fis-gecmisi")
            router.refresh()
            return true
          } catch (err) {
            console.error("[ReceiptActionsMenu] delete failed", err)
            toast.error("Fiş silinemedi.")
            return false
          }
        }}
      />
      <ShareRecordDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        kind="receipt"
        recordId={id}
        title={title}
        initialStatus={shareStatus}
        hasImage={hasImage}
      />
    </>
  )
}
