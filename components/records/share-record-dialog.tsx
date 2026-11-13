"use client"

import * as React from "react"
import { RiReceiptLine, RiShoppingBasketLine } from "@remixicon/react"

import {
  ShareDialog,
  type ShareDialogAdapter,
  type ShareDialogCopy,
} from "@/components/share/share-dialog"
import {
  getRecordShareStatus,
  setRecordShareAnonymous,
  setRecordShareHideImages,
  shareRecord,
  unshareRecord,
} from "@/lib/actions/record-shares"
import { publicRecordTitle } from "@/lib/records/public-title"
import type { RecordShareKind } from "@/lib/records/record-data"
import { sharePath } from "@/lib/share/paths"
import type { ShareStatus } from "@/lib/share/types"

const COPY: Record<RecordShareKind, ShareDialogCopy> = {
  basket: {
    title: "Sepeti paylaş",
    description:
      "Sepetin şu anki hâli paylaşılır; şube adları paylaşılmaz.",
    errors: {
      not_found: "Bu sepet bulunamadı.",
      empty: "Bu sepette paylaşılacak bir kalem yok.",
      too_large: "Bu sepet paylaşmak için çok büyük.",
      unsupported: "Bu sepet paylaşılamıyor.",
    },
    hideImagesLabel: "Resimleri gizle",
    rememberImageChoice: true,
    icon: RiShoppingBasketLine,
  },
  receipt: {
    title: "Fişi paylaş",
    description:
      "Fişin şu anki hâli paylaşılır; şube adları paylaşılmaz.",
    errors: {
      not_found: "Bu fiş bulunamadı.",
      empty: "Bu fişte paylaşılacak bir kalem yok.",
      too_large: "Bu fiş paylaşmak için çok büyük.",
      unsupported: "Bu fiş paylaşılamıyor.",
    },
    hideImagesLabel: "Fiş görselini gizle",
    // Görsel her zaman fiş fotoğrafı: sohbetteki tercih buraya taşınmasın.
    rememberImageChoice: false,
    icon: RiReceiptLine,
  },
}

export function ShareRecordDialog({
  open,
  onOpenChange,
  kind,
  recordId,
  title,
  hasImage = false,
  initialStatus,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: RecordShareKind
  recordId: string
  title: string
  /** Fişin fotoğrafı var mı; sepette görsel paylaşılmaz. */
  hasImage?: boolean
  /** Detay sayfası sunucuda okur; pencere beklemeden açılır. */
  initialStatus?: ShareStatus
}) {
  const adapter = React.useMemo<ShareDialogAdapter>(() => {
    const target = { kind, recordId }
    return {
      target: { kind, id: recordId },
      status: () => getRecordShareStatus(target),
      share: (opts) => shareRecord({ ...target, ...opts }),
      setAnonymous: (anonymous) =>
        setRecordShareAnonymous({ ...target, anonymous }),
      setHideImages: (hideImages) =>
        setRecordShareHideImages({ ...target, hideImages }),
      revoke: () => unshareRecord(target),
      path: (token) => sharePath(kind, token),
    }
  }, [kind, recordId])

  return (
    <ShareDialog
      open={open}
      onOpenChange={onOpenChange}
      title={publicRecordTitle(title)}
      adapter={adapter}
      copy={COPY[kind]}
      hasImages={kind === "receipt" && hasImage}
      initialStatus={initialStatus}
    />
  )
}
