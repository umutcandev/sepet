"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDetected: (barcode: string) => void
}

export function BarcodeScannerDialog({
  open,
  onOpenChange,
  onDetected,
}: Props) {
  const [attempt, setAttempt] = React.useState(0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Barkod tara</DialogTitle>
          <DialogDescription>
            Ürün barkodunu kameraya doğru tutun, çerçevenin içinde
            konumlandırın.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <ScannerSession
            key={attempt}
            onDetected={onDetected}
            onRetry={() => setAttempt((n) => n + 1)}
          />
        ) : (
          <div className="aspect-[4/3] w-full rounded-lg bg-muted sm:aspect-video" />
        )}
      </DialogContent>
    </Dialog>
  )
}

type Status = "starting" | "scanning" | "error"

// Market ürün barkodları: 1D formatlar. 2D (QR/DataMatrix) taranmayınca
// motor her karede daha az iş yapar, tespit hızlanır.
const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] as const

function ScannerSession({
  onDetected,
  onRetry,
}: {
  onDetected: (barcode: string) => void
  onRetry: () => void
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const onDetectedRef = React.useRef(onDetected)
  const [status, setStatus] = React.useState<Status>("starting")
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [torchOn, setTorchOn] = React.useState(false)
  const [torchSupported, setTorchSupported] = React.useState(false)
  const trackRef = React.useRef<MediaStreamTrack | null>(null)

  React.useEffect(() => {
    onDetectedRef.current = onDetected
  }, [onDetected])

  React.useEffect(() => {
    let cancelled = false
    let stream: MediaStream | null = null
    let rafId: number | null = null
    let frameCbId: number | null = null
    const videoEl = videoRef.current

    ;(async () => {
      try {
        if (
          typeof navigator === "undefined" ||
          !navigator.mediaDevices?.getUserMedia
        ) {
          setStatus("error")
          setErrorMessage(
            "Bu tarayıcı kamera erişimini desteklemiyor. Güncel bir tarayıcıda ve HTTPS üzerinden dene.",
          )
          return
        }

        // barcode-detector: Android'de işletim sisteminin native BarcodeDetector
        // API'sini (Google on-device ML — anında ve doğru), desteklemeyen
        // tarayıcılarda zxing-wasm fallback'ini kullanan spec uyumlu ponyfill.
        const { BarcodeDetector, setZXingModuleOverrides } = await import(
          "barcode-detector/ponyfill"
        )
        if (cancelled || !videoEl) return

        // zxing-wasm varsayılan olarak WASM'ı jsDelivr CDN'den çeker — bu
        // ağ koşullarına göre başarısız olabiliyor. Dosyayı public/'ten
        // kendimiz servis ediyoruz (bkz. public/zxing_reader.wasm).
        setZXingModuleOverrides({
          locateFile: (path: string, prefix: string) =>
            path.endsWith(".wasm") ? "/zxing_reader.wasm" : prefix + path,
        })

        const detector = new BarcodeDetector({ formats: [...FORMATS] })

        // Yüksek çözünürlük: ince barkod çizgileri düşük çözünürlükte
        // çözülemez. facingMode environment ile arka kamera.
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        videoEl.srcObject = stream
        await videoEl.play()
        setStatus("scanning")

        const track = stream.getVideoTracks()[0] ?? null
        trackRef.current = track
        const caps = track?.getCapabilities?.() as
          | (MediaTrackCapabilities & {
              focusMode?: string[]
              torch?: boolean
            })
          | undefined

        // Sürekli otomatik odak — telefon kameralarında barkodun
        // netleşmesini sağlar. Desteklemeyen cihazlarda sessizce atlanır.
        if (track && caps?.focusMode?.includes("continuous")) {
          try {
            await track.applyConstraints({
              // @ts-expect-error focusMode standart tipte henüz yok
              advanced: [{ focusMode: "continuous" }],
            })
          } catch {
            /* desteklenmiyorsa yoksay */
          }
        }
        if (caps?.torch) setTorchSupported(true)

        // Tarama döngüsü: her karede detector.detect çalıştır. Mümkünse
        // requestVideoFrameCallback (kameranın gerçek kare hızına bağlı,
        // boşa CPU yakmaz), yoksa requestAnimationFrame fallback.
        const scan = async () => {
          if (cancelled || !videoEl) return
          if (videoEl.readyState >= 2) {
            try {
              const results = await detector.detect(videoEl)
              if (cancelled) return
              const hit = results.find((r) => r.rawValue?.trim())
              if (hit) {
                onDetectedRef.current(hit.rawValue.trim())
                return
              }
            } catch {
              /* tek kare hatası — döngü devam etsin */
            }
          }
          if (cancelled) return
          const v = videoEl as HTMLVideoElement & {
            requestVideoFrameCallback?: (cb: () => void) => number
          }
          if (typeof v.requestVideoFrameCallback === "function") {
            frameCbId = v.requestVideoFrameCallback(() => void scan())
          } else {
            rafId = requestAnimationFrame(() => void scan())
          }
        }
        void scan()
      } catch (err) {
        if (cancelled) return
        setStatus("error")
        const name = (err as Error).name
        if (name === "NotAllowedError" || name === "SecurityError") {
          setErrorMessage(
            "Kamera izni reddedildi. Tarayıcı ayarlarından izin verip tekrar dene.",
          )
        } else if (name === "NotFoundError" || name === "OverconstrainedError") {
          setErrorMessage("Cihazda kullanılabilir kamera bulunamadı.")
        } else if (name === "NotReadableError") {
          setErrorMessage(
            "Kameraya erişilemedi. Başka bir uygulama kullanıyor olabilir.",
          )
        } else {
          setErrorMessage((err as Error).message ?? "Kamera başlatılamadı.")
        }
      }
    })()

    return () => {
      cancelled = true
      if (rafId != null) cancelAnimationFrame(rafId)
      if (frameCbId != null) {
        const v = videoEl as
          | (HTMLVideoElement & {
              cancelVideoFrameCallback?: (id: number) => void
            })
          | null
        v?.cancelVideoFrameCallback?.(frameCbId)
      }
      trackRef.current = null
      stream?.getTracks().forEach((t) => t.stop())
      if (videoEl) videoEl.srcObject = null
    }
  }, [])

  const toggleTorch = React.useCallback(async () => {
    const track = trackRef.current
    if (!track) return
    const next = !torchOn
    try {
      await track.applyConstraints({
        // @ts-expect-error torch standart tipte henüz yok
        advanced: [{ torch: next }],
      })
      setTorchOn(next)
    } catch {
      setTorchSupported(false)
    }
  }, [torchOn])

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border/60 bg-black sm:aspect-video">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        playsInline
        muted
        autoPlay
      />
      {status === "scanning" && (
        <>
          <div className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-white/40" />
          <div className="pointer-events-none absolute inset-x-6 top-1/2 h-px -translate-y-1/2 bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
          {torchSupported && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="absolute right-3 bottom-3"
              onClick={toggleTorch}
            >
              {torchOn ? "Işığı kapat" : "Işığı aç"}
            </Button>
          )}
        </>
      )}
      {status === "starting" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <Spinner className="size-6 text-white" />
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center">
          <p className="text-sm text-white">{errorMessage}</p>
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Tekrar dene
          </Button>
        </div>
      )}
    </div>
  )
}
