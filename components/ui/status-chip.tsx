import * as React from "react"
import { RiUserFollowLine } from "@remixicon/react"

import { cn } from "@/lib/utils"

// Her durumun rengi tonuyla birlikte burada: onay, Pro rozetiyle aynı dolu
// ana renk (Badge `default`). Yeni bir durum (ör. reddedildi → destructive)
// aynı kalıba eklenir.
const STATUS = {
  approved: {
    label: "Onaylandı",
    // Kullanıcı + onay: tek başına ✓ dolu zeminde bir "Onayla" butonu gibi
    // duruyordu; bu, bir eylem değil "sen onayladın" durumu.
    icon: RiUserFollowLine,
    tone: "surface-raised-chip border-transparent bg-primary text-primary-foreground",
  },
} as const

/**
 * Kart başlığındaki durum, yalnızca simge: Pro rozeti gibi dolu ana renk
 * zemin üstünde simge, köşeleri hafif yuvarlak kare. "Onaylandı"
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
