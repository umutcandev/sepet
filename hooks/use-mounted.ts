"use client"

import * as React from "react"

// SSR sırasında false, hydration sonrası true döner. useState + useEffect
// "mounted" kalıbının useSyncExternalStore tabanlı, react-hooks/set-state-in-effect
// uyarısı vermeyen karşılığı (bkz. hooks/use-media-query.ts).
const emptySubscribe = () => () => {}

export function useMounted(): boolean {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
}
