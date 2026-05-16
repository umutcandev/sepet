"use client"

import * as React from "react"
import { MicIcon, SquareIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { PromptInputButton } from "@/components/ai-elements/prompt-input"
import { LiveWaveform } from "@/components/ui/live-waveform"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Web Speech API tipleri (standart TS lib'inde bulunmuyor)
// ---------------------------------------------------------------------------
interface SpeechRecognitionResultLike {
  readonly isFinal: boolean
  readonly length: number
  item(index: number): { transcript: string }
  [index: number]: { transcript: string }
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number
  readonly results: {
    readonly length: number
    item(index: number): SpeechRecognitionResultLike
    [index: number]: SpeechRecognitionResultLike
  }
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onstart: (() => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

// ---------------------------------------------------------------------------
// VoiceInput
// ---------------------------------------------------------------------------
interface VoiceInputProps {
  /** Mevcut input değeri — kayıt başlarken bunun üzerine eklenir. */
  value: string
  /** Çözümlenen metni input'a yazmak için. */
  onTranscript: (text: string) => void
  disabled?: boolean
  /** Tanıma dili. Varsayılan: tr-TR */
  lang?: string
  className?: string
}

export function VoiceInput({
  value,
  onTranscript,
  disabled,
  lang = "tr-TR",
  className,
}: VoiceInputProps) {
  const [recording, setRecording] = React.useState(false)
  const [starting, setStarting] = React.useState(false)
  const [activeStream, setActiveStream] = React.useState<MediaStream | null>(null)

  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const isAbortedRef = React.useRef(false)
  // Kayıt başladığı andaki input değeri — çözümlenen metin bunun sonuna eklenir.
  const baseValueRef = React.useRef("")
  // En güncel onTranscript referansı (stale closure'ı önlemek için).
  const onTranscriptRef = React.useRef(onTranscript)
  React.useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

  // SpeechRecognition yalnızca tarayıcıda var; SSR/hydration uyuşmazlığını
  // önlemek için destek kontrolünü mount sonrasına erteliyoruz.
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    // SSR-safe mount flag; required to avoid hydration mismatch when
    // detecting browser-only APIs (SpeechRecognition).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])
  const supported = mounted && getSpeechRecognition() !== null

  const stopRecording = React.useCallback(() => {
    isAbortedRef.current = true
    recognitionRef.current?.stop()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setActiveStream(null)
    }
    setRecording(false)
  }, [])

  const cancelStarting = React.useCallback(() => {
    isAbortedRef.current = true
    setStarting(false)
    recognitionRef.current?.abort()
    recognitionRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setActiveStream(null)
    }
  }, [])

  // Bileşen unmount olursa tanımayı durdur.
  React.useEffect(() => {
    return () => {
      isAbortedRef.current = true
      recognitionRef.current?.abort()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [])

  const startRecording = React.useCallback(async () => {
    const SpeechRecognitionCtor = getSpeechRecognition()
    if (!SpeechRecognitionCtor) {
      toast.error("Tarayıcınız sesle yazmayı desteklemiyor.")
      return
    }

    isAbortedRef.current = false
    setStarting(true)
    try {
      // Önce mikrofon iznini netçe iste — hem tanıma hem dalga formu için.
      const initialStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // İzni aldıktan sonra hemen kapatıyoruz ki SpeechRecognition mikrofonu kilitlenmeden alabilsin.
      initialStream.getTracks().forEach((track) => track.stop())
      if (isAbortedRef.current) return
    } catch {
      if (!isAbortedRef.current) {
        setStarting(false)
        toast.error("Mikrofon izni verilmedi.")
      }
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = true

    baseValueRef.current = value
    const separator = value.trim().length > 0 ? " " : ""

    recognition.onresult = (event) => {
      let transcript = ""
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      onTranscriptRef.current(baseValueRef.current + separator + transcript)
    }

    recognition.onerror = (event) => {
      setStarting(false)
      setRecording(false)
      if (event.error === "no-speech" || event.error === "aborted") {
        return
      }
      if (event.error === "not-allowed") {
        toast.error("Mikrofon izni verilmedi.")
      } else {
        toast.error("Ses tanıma sırasında bir hata oluştu.")
      }
    }

    recognition.onstart = () => {
      if (isAbortedRef.current) {
        recognition.abort()
        return
      }
      setStarting(false)
      setRecording(true)

      // SpeechRecognition'ın mikrofon donanımını öncelikli olarak almasını garanti etmek için
      // gerçek dalga formu stream'ini 500ms gecikmeli istiyoruz.
      setTimeout(async () => {
        if (!recognitionRef.current || isAbortedRef.current) return
        try {
          const waveStream = await navigator.mediaDevices.getUserMedia({ audio: true })
          if (isAbortedRef.current || !recognitionRef.current) {
            waveStream.getTracks().forEach((t) => t.stop())
            return
          }
          streamRef.current = waveStream
          setActiveStream(waveStream)
        } catch (e) {
          console.warn("Dalga formu için stream alınamadı (Mobilde beklenen bir durum):", e)
        }
      }, 500)
    }

    recognition.onend = () => {
      setRecording(false)
      setStarting(false)
      recognitionRef.current = null
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        setActiveStream(null)
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch {
      if (!isAbortedRef.current) {
        toast.error("Ses kaydı başlatılamadı.")
        setStarting(false)
      }
      recognitionRef.current = null
    }
  }, [lang, value])

  if (!supported) {
    return null
  }

  if (starting) {
    return (
      <div
        className={cn(
          "flex items-center gap-1 rounded-full border bg-background/80 py-1 pr-1 pl-3",
          className,
        )}
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground mr-1 w-24 sm:w-32 justify-center">
          <Loader2Icon className="size-3.5 animate-spin" />
          <span className="text-xs font-medium">Bağlanıyor</span>
        </div>
        <button
          type="button"
          onClick={cancelStarting}
          aria-label="İptal et"
          className="flex h-6 px-2.5 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/80 text-xs font-medium"
        >
          İptal
        </button>
      </div>
    )
  }

  if (recording) {
    return (
      <div
        className={cn(
          "flex items-center gap-1 rounded-full border bg-background/80 py-1 pr-1 pl-2.5",
          className,
        )}
      >
        <LiveWaveform
          active={recording}
          audioStream={activeStream}
          mode="static"
          height={20}
          barWidth={2}
          barGap={2}
          barRadius={1}
          fadeEdges
          fadeWidth={12}
          className="w-24 text-foreground sm:w-32"
        />
        <button
          type="button"
          onClick={stopRecording}
          aria-label="Kaydı durdur"
          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-colors hover:bg-foreground/85"
        >
          <SquareIcon className="size-3 fill-current" />
        </button>
      </div>
    )
  }

  return (
    <PromptInputButton
      className={cn("rounded-full", className)}
      onClick={startRecording}
      disabled={disabled || starting}
      aria-label="Sesle yaz"
      tooltip="Sesle yaz"
    >
      <MicIcon className="size-4" />
    </PromptInputButton>
  )
}
