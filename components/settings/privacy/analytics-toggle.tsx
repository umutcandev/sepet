"use client"

import * as React from "react"

import { Switch } from "@/components/ui/switch"
import {
  readAnalyticsOptOut,
  writeAnalyticsOptOut,
} from "@/lib/privacy/analytics-consent"

// Anahtar AÇIK = analitik izinli (opt-out false). Tercih cookie'de tutulur;
// projede henüz analitik olmadığı için bu yalnızca tercihi kaydeder (bkz.
// analytics-consent.ts). Bu toggle yalnızca dialog açıldığında (istemci
// tarafında) mount edildiğinden, başlangıç değeri lazy initializer ile
// doğrudan cookie'den okunur — SSR'da `readAnalyticsOptOut` false döner.
export function AnalyticsToggle() {
  const [allowed, setAllowed] = React.useState(() => !readAnalyticsOptOut())

  function handleChange(checked: boolean) {
    setAllowed(checked)
    writeAnalyticsOptOut(!checked)
  }

  return (
    <Switch
      checked={allowed}
      onCheckedChange={handleChange}
      aria-label="Analiz çerezleri"
    />
  )
}
