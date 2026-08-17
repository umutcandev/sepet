"use client"

import { useRouter } from "next/navigation"
import { MessagesSquareIcon } from "lucide-react"

import { toast } from "@/components/ui/sonner"
import {
  RecordActionsMenu,
  type RecordActionLink,
} from "@/components/records/record-actions-menu"
import { deleteReceipt } from "@/lib/actions/receipts"

/**
 * Fişte "fiyatları yenile" yok — OCR karşılaştırması tekrar kurulamaz. Menü bu
 * yüzden sepetinkinden bir kalem eksik; yerleşim, etiket dili ve silme akışı
 * ikisinde de aynı (bkz. RecordActionsMenu).
 */
export function ReceiptActionsMenu({
  id,
  conversation,
}: {
  id: string
  conversation: { id: string; title: string } | null
}) {
  const router = useRouter()

  const links: RecordActionLink[] = conversation
    ? [
        {
          label: "Sohbete git",
          href: `/asistan/${conversation.id}`,
          icon: <MessagesSquareIcon className="size-4" />,
          hint: conversation.title.trim() || null,
        },
      ]
    : []

  return (
    <RecordActionsMenu
      links={links}
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
  )
}
