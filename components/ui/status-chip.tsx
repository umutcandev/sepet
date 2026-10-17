import * as React from "react"
import { RiCheckLine } from "@remixicon/react"

import { cn } from "@/lib/utils"

// Her durumun rengi tonuyla birlikte burada: onay ana renkte (primary).
// Yeni bir durum (ör. reddedildi → destructive) aynı kalıba eklenir.
const STATUS = {
  approved: {
    label: "Onaylandı",
    icon: RiCheckLine,
    tone: "border-primary/25 bg-primary/10 text-primary dark:border-primary/30 dark:bg-primary/12",
  },
} as const

/**
 * Kart başlığındaki durum, yalnızca simge: ana renkte işaret, aynı rengin
 * soluk zemini ve ince kenarı, köşeleri hafif yuvarlak kare. "Onaylandı"
 * yazılı rozet başlık şeridinde kartın adı kadar yer tutuyordu. Ad ekran
 * okuyucuya ve fareyle üstüne gelene (title) söylenir.
 */
export function StatusChip({
  status,
  className,
}: {
  status: keyof typeof STATUS
  className?: string
}) {
  const { label, icon: Icon, tone } = STATUS[status]
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-md border",
        tone,
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
    </span>
  )
}
