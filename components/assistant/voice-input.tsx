"use client"

import * as React from "react"

import { useIsMobile } from "@/hooks/use-mobile"
import { VoiceInputDesktop } from "@/components/assistant/voice-input-desktop"
import { VoiceInputMobile } from "@/components/assistant/voice-input-mobile"

export interface VoiceInputProps {
  /** Mevcut input değeri — kayıt başlarken bunun üzerine eklenir. */
  value: string
  /** Çözümlenen metni input'a yazmak için. */
  onTranscript: (text: string) => void
  disabled?: boolean
  /** Tanıma dili (yalnızca desktop / Web Speech). Varsayılan: tr-TR */
  lang?: string
  className?: string
}

/**
 * Sesle yazı bileşeni. PC'de Web Speech API ile anlık transcription,
 * mobil cihazlarda ise MediaRecorder + sunucu tarafında LLM tabanlı
 * transcription (bkz. /api/transcribe).
 */
export function VoiceInput(props: VoiceInputProps) {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  const isMobile = useIsMobile()

  // SSR / hidrasyon: useIsMobile() ilk render'da false döner ve effect içinde
  // gerçek değere güncellenir. Mismatch'i önlemek için ilk paint'te hiçbir şey
  // render etmiyoruz.
  if (!mounted) return null

  return isMobile ? <VoiceInputMobile {...props} /> : <VoiceInputDesktop {...props} />
}
