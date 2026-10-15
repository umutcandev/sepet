"use client"

import * as React from "react"
import {
  RiCheckLine,
  RiCloseLine,
  RiLoader4Line,
  RiMicLine,
  RiStopFill,
} from "@remixicon/react"

import { PromptInputButton } from "@/components/ai-elements/prompt-input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Dolgu her yönde eşit. Önceden sol %10'du (`pl-2.5`) çünkü kayıt sırasında
// soldaki çocuk dalga formu / düz metin oluyor ve nefes payı gerekiyordu; ama
// gözden geçirme adımında soldaki çocuk İPTAL HAPININ kendisi, o yüzden hap
// üstten/alttan 4px, soldan 10px boşlukla oturup şeridi eğri gösteriyordu.
// Payı artık ihtiyacı olan çocuk kendisi taşıyor (aşağıya bkz.).
export const voiceContainerClass =
  "flex items-center gap-1 rounded-full border bg-background/80 p-1"

export interface VoiceMicButtonProps {
  onClick: () => void
  disabled?: boolean
  className?: string
}

export function VoiceMicButton({ onClick, disabled, className }: VoiceMicButtonProps) {
  return (
    <PromptInputButton
      className={cn("rounded-full", className)}
      onClick={onClick}
      disabled={disabled}
      aria-label="Sesle yaz"
      tooltip="Sesle yaz"
    >
      <RiMicLine className="size-4" />
    </PromptInputButton>
  )
}

// Haplar sıradan butonlar: kabın içinde tam yuvarlak durdukları için yalnız
// köşe `rounded-full`. Kayıt sırasındaki tek eylem (Durdur) ve gözden
// geçirmedeki onay (İlet) birincil; İptal ikincil.
export interface VoiceStopButtonProps {
  onClick: () => void
  loading?: boolean
  disabled?: boolean
  ariaLabel: string
  className?: string
}

export function VoiceStopButton({
  onClick,
  loading,
  disabled,
  ariaLabel,
  className,
}: VoiceStopButtonProps) {
  return (
    <Button
      variant="default"
      size="icon-xs"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      disabled={disabled}
      className={cn("rounded-full", className)}
    >
      {loading ? <RiLoader4Line className="animate-spin" /> : <RiStopFill />}
    </Button>
  )
}

export interface VoiceCancelButtonProps {
  onClick: () => void
  disabled?: boolean
  className?: string
}

export function VoiceCancelButton({
  onClick,
  disabled,
  className,
}: VoiceCancelButtonProps) {
  return (
    <Button
      variant="secondary"
      size="xs"
      onClick={onClick}
      disabled={disabled}
      aria-label="Ses kaydını iptal et"
      className={cn("rounded-full", className)}
    >
      <RiCloseLine />
      <span>İptal</span>
    </Button>
  )
}

export interface VoiceConfirmButtonProps {
  onClick: () => void
  loading?: boolean
  disabled?: boolean
  elapsedLabel?: string
  className?: string
}

export function VoiceConfirmButton({
  onClick,
  loading,
  disabled,
  elapsedLabel,
  className,
}: VoiceConfirmButtonProps) {
  return (
    <Button
      variant="default"
      size="xs"
      onClick={onClick}
      disabled={disabled || loading}
      aria-label="Sesi yazıya çevir ve metne ekle"
      aria-busy={loading || undefined}
      className={cn("rounded-full", className)}
    >
      {loading ? <RiLoader4Line className="animate-spin" /> : <RiCheckLine />}
      <span>İlet</span>
      {elapsedLabel && !loading && (
        <span className="ml-0.5 tabular-nums opacity-70">{elapsedLabel}</span>
      )}
    </Button>
  )
}

export function pickAudioMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/mpeg",
  ]
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime
  }
  return null
}

export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  let binary = ""
  const bytes = new Uint8Array(buf)
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunkSize)) as unknown as number[],
    )
  }
  return btoa(binary)
}
