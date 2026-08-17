"use client"

import { useMounted } from "@/hooks/use-mounted"

/**
 * Kısayol rozetlerinde gösterilecek değiştirici tuşun etiketi.
 *
 * `SidebarProvider` kısayolu `metaKey || ctrlKey` ile yakalıyor — yani ikisi de
 * çalışıyor ama ekranda YALNIZ biri yazmalı, kullanıcının klavyesinde olan.
 * Eskiden her platformda ⌘ yazıyordu; Windows'ta düpedüz yanlış bilgiydi.
 *
 * SSR'da platform bilinemez. `useMounted` ile hidrasyona kadar "Ctrl" döneriz:
 * çoğunluk için doğru olan taraf, ayrıca sunucu ile ilk istemci render'ı
 * uyuşur. Kısayol rozetleri tooltip içinde yaşadığı için (Radix içeriği ancak
 * açılınca basar) kullanıcı bu ilk değeri pratikte hiç görmez.
 */
export function useShortcutModifier(): string {
  const mounted = useMounted()
  if (!mounted) return "Ctrl"
  return /Mac|iPhone|iPad|iPod/.test(
    navigator.platform || navigator.userAgent,
  )
    ? "⌘"
    : "Ctrl"
}
