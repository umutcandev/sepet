"use client"

import * as React from "react"
import { toast } from "sonner"

import { LiveWaveform } from "@/components/ui/live-waveform"
import { cn } from "@/lib/utils"
import {
  VoiceCancelButton,
  VoiceConfirmButton,
  VoiceMicButton,
  VoiceStopButton,
  blobToBase64,
  formatElapsed,
  pickAudioMime,
  voiceContainerClass,
} from "@/components/assistant/voice-input-shared"

const MAX_RECORDING_MS = 30_000
const WARN_AT_MS = 25_000

type MobileVoiceState =
  | { kind: "idle" }
  | { kind: "requesting" }
  | { kind: "recording"; stream: MediaStream; startedAt: number }
  | { kind: "stopped"; audioBlob: Blob; mediaType: string; elapsedMs: number }
  | {
      kind: "transcribing"
      audioBlob: Blob
      mediaType: string
      elapsedMs: number
    }

interface VoiceInputMobileProps {
  value: string
  onTranscript: (text: string) => void
  disabled?: boolean
  className?: string
}

export function VoiceInputMobile({
  value,
  onTranscript,
  disabled,
  className,
}: VoiceInputMobileProps) {
  const [state, setState] = React.useState<MobileVoiceState>({ kind: "idle" })
  const [elapsedMs, setElapsedMs] = React.useState(0)

  const recorderRef = React.useRef<MediaRecorder | null>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const chunksRef = React.useRef<Blob[]>([])
  const isAbortedRef = React.useRef(false)
  const maxTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const tickRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = React.useRef(0)

  // En güncel handler referansı (stale closure'ı önlemek için).
  const onTranscriptRef = React.useRef(onTranscript)
  React.useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])
  const valueRef = React.useRef(value)
  React.useEffect(() => {
    valueRef.current = value
  }, [value])

  const clearTimers = React.useCallback(() => {
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current)
      maxTimerRef.current = null
    }
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [])

  const stopStream = React.useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const fullReset = React.useCallback(() => {
    isAbortedRef.current = true
    clearTimers()
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop()
      }
    } catch {
      // ignore
    }
    recorderRef.current = null
    chunksRef.current = []
    stopStream()
    setElapsedMs(0)
    setState({ kind: "idle" })
  }, [clearTimers, stopStream])

  // Component unmount: tam temizlik.
  React.useEffect(() => {
    return () => {
      isAbortedRef.current = true
      clearTimers()
      try {
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
          recorderRef.current.stop()
        }
      } catch {
        // ignore
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [clearTimers])

  const startRecording = React.useCallback(async () => {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Bu cihaz sesle yazmayı desteklemiyor.")
      return
    }
    const mimeType = pickAudioMime()
    if (!mimeType) {
      toast.error("Bu cihaz sesle yazmayı desteklemiyor.")
      return
    }

    isAbortedRef.current = false
    setState({ kind: "requesting" })

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      if (!isAbortedRef.current) {
        toast.error("Mikrofon izni verilmedi.")
        setState({ kind: "idle" })
      }
      return
    }

    if (isAbortedRef.current) {
      stream.getTracks().forEach((t) => t.stop())
      return
    }

    let recorder: MediaRecorder
    try {
      recorder = new MediaRecorder(stream, { mimeType })
    } catch {
      stream.getTracks().forEach((t) => t.stop())
      toast.error("Ses kaydı başlatılamadı.")
      setState({ kind: "idle" })
      return
    }

    streamRef.current = stream
    recorderRef.current = recorder
    chunksRef.current = []

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstart = () => {
      if (isAbortedRef.current) return
      const startedAt = Date.now()
      setElapsedMs(0)
      setState({ kind: "recording", stream, startedAt })

      tickRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startedAt)
      }, 250)

      maxTimerRef.current = setTimeout(() => {
        if (recorderRef.current && recorderRef.current.state === "recording") {
          toast.message("Maksimum kayıt süresi (30 sn) doldu, isterseniz onaylayın.")
          try {
            recorderRef.current.stop()
          } catch {
            // ignore
          }
        }
      }, MAX_RECORDING_MS)
    }

    recorder.onerror = () => {
      if (!isAbortedRef.current) {
        toast.error("Ses kaydı sırasında bir hata oluştu.")
      }
      fullReset()
    }

    recorder.onstop = () => {
      clearTimers()
      const stopElapsedMs = startedAtRef.current
        ? Date.now() - startedAtRef.current
        : 0

      // Stream'i kapat — review sırasında mikrofon açık kalmasın.
      stopStream()

      if (isAbortedRef.current) {
        chunksRef.current = []
        return
      }

      const chunks = chunksRef.current
      chunksRef.current = []
      if (chunks.length === 0) {
        toast.error("Konuşma algılanamadı, tekrar dener misiniz?")
        setState({ kind: "idle" })
        setElapsedMs(0)
        return
      }
      const audioBlob = new Blob(chunks, { type: mimeType })
      setState({
        kind: "stopped",
        audioBlob,
        mediaType: mimeType,
        elapsedMs: stopElapsedMs,
      })
    }

    try {
      startedAtRef.current = Date.now()
      recorder.start()
    } catch {
      stopStream()
      recorderRef.current = null
      toast.error("Ses kaydı başlatılamadı.")
      setState({ kind: "idle" })
    }
  }, [clearTimers, fullReset, stopStream])

  const stopRecording = React.useCallback(() => {
    clearTimers()
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop()
      } catch {
        // ignore
      }
    }
  }, [clearTimers])

  const cancelRequesting = React.useCallback(() => {
    isAbortedRef.current = true
    clearTimers()
    stopStream()
    recorderRef.current = null
    setState({ kind: "idle" })
  }, [clearTimers, stopStream])

  const cancelReview = React.useCallback(() => {
    setElapsedMs(0)
    setState({ kind: "idle" })
  }, [])

  const confirmTranscribe = React.useCallback(async () => {
    if (state.kind !== "stopped") return
    const { audioBlob, mediaType, elapsedMs: stoppedElapsed } = state
    setState({ kind: "transcribing", audioBlob, mediaType, elapsedMs: stoppedElapsed })

    let audioBase64: string
    try {
      audioBase64 = await blobToBase64(audioBlob)
    } catch {
      toast.error("Ses yazıya çevrilemedi, tekrar dener misiniz?")
      setState({ kind: "stopped", audioBlob, mediaType, elapsedMs: stoppedElapsed })
      return
    }

    let res: Response
    try {
      res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64, mediaType }),
      })
    } catch {
      toast.error("Ses yazıya çevrilemedi, tekrar dener misiniz?")
      setState({ kind: "stopped", audioBlob, mediaType, elapsedMs: stoppedElapsed })
      return
    }

    if (res.status === 401) {
      toast.error("Oturumunuz sona ermiş olabilir, sayfayı yenileyin.")
      setState({ kind: "stopped", audioBlob, mediaType, elapsedMs: stoppedElapsed })
      return
    }
    if (res.status === 429) {
      toast.error("Çok hızlı deniyorsunuz, biraz bekleyip tekrar dener misiniz?")
      setState({ kind: "stopped", audioBlob, mediaType, elapsedMs: stoppedElapsed })
      return
    }
    if (res.status === 503) {
      toast.error("Servis yoğun, birkaç saniye sonra tekrar deneyin.")
      setState({ kind: "stopped", audioBlob, mediaType, elapsedMs: stoppedElapsed })
      return
    }
    if (res.status === 413) {
      toast.error("Ses kaydı çok büyük, daha kısa konuşmayı deneyin.")
      setState({ kind: "stopped", audioBlob, mediaType, elapsedMs: stoppedElapsed })
      return
    }
    if (!res.ok) {
      toast.error("Ses yazıya çevrilemedi, tekrar dener misiniz?")
      setState({ kind: "stopped", audioBlob, mediaType, elapsedMs: stoppedElapsed })
      return
    }

    let data: { text?: string } = {}
    try {
      data = (await res.json()) as { text?: string }
    } catch {
      toast.error("Ses yazıya çevrilemedi, tekrar dener misiniz?")
      setState({ kind: "stopped", audioBlob, mediaType, elapsedMs: stoppedElapsed })
      return
    }

    const text = (data.text ?? "").trim()
    if (text.length === 0) {
      toast.error("Konuşma algılanamadı, tekrar dener misiniz?")
      setState({ kind: "idle" })
      setElapsedMs(0)
      return
    }

    const base = valueRef.current
    const separator = base.trim().length > 0 ? " " : ""
    onTranscriptRef.current(base + separator + text)
    setState({ kind: "idle" })
    setElapsedMs(0)
  }, [state])

  if (state.kind === "idle") {
    return (
      <VoiceMicButton
        onClick={startRecording}
        disabled={disabled}
        className={className}
      />
    )
  }

  if (state.kind === "requesting") {
    return (
      <div className={cn(voiceContainerClass, className)}>
        <div className="w-24 text-xs text-muted-foreground sm:w-32 px-1">
          Hazırlanıyor…
        </div>
        <VoiceStopButton
          onClick={cancelRequesting}
          loading
          ariaLabel="Hazırlanıyor, iptal et"
        />
      </div>
    )
  }

  if (state.kind === "recording") {
    const warn = elapsedMs >= WARN_AT_MS
    return (
      <div className={cn(voiceContainerClass, className)}>
        <LiveWaveform
          active
          audioStream={state.stream}
          mode="static"
          height={20}
          barWidth={2}
          barGap={2}
          barRadius={1}
          fadeEdges
          fadeWidth={12}
          className="w-16 text-foreground sm:w-24"
        />
        <span
          className={cn(
            "px-1 text-xs tabular-nums",
            warn ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {formatElapsed(elapsedMs)}
        </span>
        <VoiceStopButton onClick={stopRecording} ariaLabel="Kaydı durdur" />
      </div>
    )
  }

  // stopped | transcribing
  const isTranscribing = state.kind === "transcribing"
  return (
    <div className={cn(voiceContainerClass, className)}>
      <VoiceCancelButton onClick={cancelReview} disabled={isTranscribing} />
      <VoiceConfirmButton
        onClick={confirmTranscribe}
        loading={isTranscribing}
        elapsedLabel={formatElapsed(state.elapsedMs)}
      />
    </div>
  )
}
