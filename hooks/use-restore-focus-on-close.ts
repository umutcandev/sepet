"use client"

import * as React from "react"

/**
 * Overlay kapanınca odağı, onu AÇAN elemana geri verir.
 *
 * Radix bunu kendi `triggerRef`i üzerinden yapar ve o ref yalnızca
 * `<Dialog.Trigger>` render edildiğinde dolar. Bu projedeki dialogların çoğu
 * bir store ya da `useState` ile açılıyor, Trigger yok: ref boş kalıyor,
 * Radix kapanışta `onCloseAutoFocus`ta `preventDefault()` çağırıp hiçbir şeye
 * odaklanmıyor ve odak `<body>`ye düşüyor. Klavye kullanıcısı her dialog
 * kapanışında sekme sırasının en başına fırlıyor. Tarayıcıda ölçüldü.
 *
 * Trigger'ı OLAN dialoglarda da zararsız: yakalanan eleman zaten Radix'in
 * döneceği elemanın aynısı.
 *
 * @param open Dialogun açık olup olmadığı. Hook `<Dialog.Content>` gibi YALNIZ
 *   açıkken mount olan bir bileşenden çağrılıyorsa geçme — mount anı zaten
 *   açılış anıdır. `Root`la birlikte sürekli mount kalan bir sarmalayıcıdan
 *   çağırıyorsan MUTLAKA geç: aksi hâlde yakalama sayfa yüklenirken yapılır ve
 *   elde `<body>` kalır.
 */

// Son odaklanmış eleman, global olarak izlenir.
//
// `document.activeElement`e bakmak tek başına yetmiyor: bazı tetikleyiciler
// dialogu açmadan önce kendilerini `blur()` ediyor (bkz. product-search-page —
// Radix'in aria-hidden uyarısı için eklenmiş bir geçici çözüm), bazıları da
// dialogu bir async kapının ardından açıyor. İki durumda da açılış anında
// activeElement `<body>` oluyor ve yakalayacak bir şey kalmıyor. Bu izleyici
// "body'den önceki son gerçek odak"ı hatırlar.
let lastFocused: HTMLElement | null = null

if (typeof document !== "undefined") {
  document.addEventListener(
    "focusin",
    (event) => {
      const el = event.target
      if (el instanceof HTMLElement && el !== document.body) lastFocused = el
    },
    true
  )
}

function currentOpener(): HTMLElement | null {
  const active = document.activeElement
  return active instanceof HTMLElement && active !== document.body
    ? active
    : lastFocused
}

export function useRestoreFocusOnClose(open?: boolean) {
  const openerRef = React.useRef<HTMLElement | null>(null)
  const wasOpen = React.useRef(false)

  // Layout effect: Radix'in `onMountAutoFocus`u odağı içeri almadan ÖNCE
  // çalışır, yani buradaki activeElement hâlâ tetikleyici elemandır.
  React.useLayoutEffect(() => {
    if (open === undefined) {
      // Mount = açılış (Content yalnız açıkken mount olur).
      openerRef.current = currentOpener()
      return
    }
    // Sürekli mount kalan sarmalayıcı: yalnız kapalı→açık geçişinde yakala.
    if (open && !wasOpen.current) openerRef.current = currentOpener()
    wasOpen.current = open
  }, [open])

  return React.useCallback((event: Event) => {
    if (event.defaultPrevented) return
    const el = openerRef.current
    openerRef.current = null
    if (!el?.isConnected) return
    // Eleman bu arada gizlenmiş olabilir (ör. dialogu açan menü öğesi).
    if (el.offsetParent === null && el.getClientRects().length === 0) return
    event.preventDefault()
    el.focus()
  }, [])
}
