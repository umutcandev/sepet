"use client"

import * as React from "react"
import { toast } from "@/components/ui/sonner"

import { renameConversation } from "@/lib/actions/conversations"
import { assistantConversations } from "@/lib/stores/assistant-conversations"
import { assistantTitle } from "@/lib/stores/assistant-title"
import { cn } from "@/lib/utils"

const TITLE_MAX = 100

// Görünüm ve düzenleme aynı kutuda: aynı punto, aynı dolgu, aynı yükseklik.
// Geçişte başlık yerinden oynamaz, header zıplamaz.
const BOX =
  "h-7 rounded-md border px-1.5 text-sm font-medium text-foreground"

/**
 * Sohbet başlığı, üstüne dokununca yerinde düzenlenir. Dışarıya dokunmak ya
 * da Enter kaydeder, Escape vazgeçer. Boş ya da değişmemiş başlık kaydedilmez.
 *
 * `editing` dışarıdan da açılabilir (başlık menüsündeki "Yeniden adlandır").
 */
export function ConversationTitleEditor({
  conversationId,
  title,
  editing,
  onEditingChange,
}: {
  conversationId: string
  title: string
  editing: boolean
  onEditingChange: (editing: boolean) => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  // Blur, Enter ve dışarı dokunma aynı turda birden çok kez tetiklenebilir;
  // kayıt yalnızca bir kez gider.
  const doneRef = React.useRef(false)

  const start = () => {
    doneRef.current = false
    onEditingChange(true)
  }

  const finish = React.useCallback(
    (save: boolean) => {
      if (doneRef.current) return
      doneRef.current = true
      onEditingChange(false)
      const next = inputRef.current?.value.trim().slice(0, TITLE_MAX) ?? ""
      if (!save || !next || next === title) return

      // İyimser: header ve kenar çubuğu hemen yeni başlığı gösterir; sunucu
      // reddederse ikisi de eski başlığa döner.
      const apply = (t: string) => {
        if (assistantTitle.current.conversationId === conversationId) {
          assistantTitle.setTitle(t)
        }
        assistantConversations.setTitle(conversationId, t)
      }
      apply(next)
      renameConversation(conversationId, next).catch(() => {
        apply(title)
        toast.error("Sohbet yeniden adlandırılamadı.")
      })
    },
    [conversationId, title, onEditingChange],
  )

  // Input her açılışta yeniden bağlanır (defaultValue = güncel başlık): menüden
  // açıldığında da eski bir taslakla başlamaz.
  React.useLayoutEffect(() => {
    if (!editing) return
    doneRef.current = false
    const input = inputRef.current
    if (!input) return
    input.focus()
    input.select()
  }, [editing])

  // Dokunmatik tarayıcılarda boş bir yere dokunmak input'tan odağı her zaman
  // almıyor (iOS Safari). Dışarıdaki her basış kaydeder.
  React.useEffect(() => {
    if (!editing) return
    const onPointerDown = (e: PointerEvent) => {
      if (!inputRef.current?.contains(e.target as Node)) finish(true)
    }
    document.addEventListener("pointerdown", onPointerDown, true)
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true)
  }, [editing, finish])

  if (editing) {
    return (
      <input
        ref={inputRef}
        defaultValue={title}
        onBlur={() => finish(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            e.preventDefault()
            finish(true)
          } else if (e.key === "Escape") {
            e.preventDefault()
            finish(false)
          }
        }}
        maxLength={TITLE_MAX}
        aria-label="Sohbet başlığı"
        enterKeyHint="done"
        // Genişlik yazıya göre (field-sizing); desteklemeyen tarayıcıda
        // başlık uzunluğu kadar.
        size={Math.max(title.length, 8)}
        className={cn(
          BOX,
          "max-w-[min(60vw,28rem)] min-w-0 border-input bg-background outline-none [field-sizing:content] selection:bg-primary selection:text-primary-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
        )}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={start}
      aria-label={`Sohbet başlığını düzenle: ${title}`}
      className={cn(
        BOX,
        "min-w-0 cursor-text truncate border-transparent outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
      )}
    >
      {title}
    </button>
  )
}
