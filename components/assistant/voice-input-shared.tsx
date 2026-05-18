"use client"

import * as React from "react"
import { CheckIcon, Loader2Icon, MicIcon, SquareIcon, XIcon } from "lucide-react"

import { PromptInputButton } from "@/components/ai-elements/prompt-input"
import { cn } from "@/lib/utils"

export const voiceContainerClass =
  "flex items-center gap-1 rounded-full border bg-background/80 py-1 pr-1 pl-2.5"

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
      <MicIcon className="size-4" />
    </PromptInputButton>
  )
}

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
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      disabled={disabled}
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-colors hover:bg-foreground/85 disabled:cursor-not-allowed disabled:opacity-90",
        className,
      )}
    >
      {loading ? (
        <Loader2Icon className="size-3 animate-spin" />
      ) : (
        <SquareIcon className="size-3 fill-current" />
      )}
    </button>
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
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Ses kaydını iptal et"
      className={cn(
        "flex h-6 shrink-0 items-center justify-center gap-1 rounded-full bg-muted px-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      <XIcon className="size-3" />
      <span>İptal</span>
    </button>
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
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-label="Sesi yazıya çevir ve metne ekle"
      aria-busy={loading || undefined}
      className={cn(
        "flex h-6 shrink-0 items-center justify-center gap-1 rounded-full bg-foreground px-2.5 text-xs font-medium text-background transition-colors hover:bg-foreground/85 disabled:cursor-not-allowed disabled:opacity-80",
        className,
      )}
    >
      {loading ? (
        <Loader2Icon className="size-3 animate-spin" />
      ) : (
        <CheckIcon className="size-3" />
      )}
      <span>İlet</span>
      {elapsedLabel && !loading && (
        <span className="ml-0.5 tabular-nums opacity-70">{elapsedLabel}</span>
      )}
    </button>
  )
}

/**
 * MediaRecorder için cihazda desteklenen ilk audio mime'ı döndürür.
 * iOS Safari opus desteklemez, mp4/aac fallback gerekir.
 */
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
