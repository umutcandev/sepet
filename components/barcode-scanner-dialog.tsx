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
import { Slider } from "@/components/ui/slider"
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
            Barkodu çerçevedeki kırmızı çizgiye hizala. Net görünmüyorsa
            yakınlaştırma çubuğunu kullan.
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

type ZoomRange = { min: number; max: number; step: number }

// Market ürün barkodları: 1D formatlar. 2D (QR/DataMatrix) taranmayınca
// motor her karede daha az iş yapar, tespit hızlanır.
const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] as const

// Telefonların birden çok arka kamerası var. facingMode "environment" çoğu
// zaman ultra-wide (balıkgözü) lensi seçer: minimum odak mesafesi uzaktır,
// yani barkod yaklaşınca bulanıklaşır ve görüntü distorsiyonludur. Bu regex
// ana (wide) lens dışındaki lensleri eler.
const BAD_LENS = /ultra|telephoto|\btele\b|depth|truedepth|infrared|monochrom/i
const BACK_LABEL = /back|rear|environment|arka/i

// Doğru arka kamerayı (ana/wide lens) seçer. enumerateDevices yalnızca kamera
// izni verildikten sonra label döndürdüğü için ilk getUserMedia'dan SONRA
// çağrılmalı.
async function pickBackCameraId(): Promise<string | undefined> {
  if (!navigator.mediaDevices?.enumerateDevices) return undefined
  const cams = (await navigator.mediaDevices.enumerateDevices()).filter(
    (d) => d.kind === "videoinput",
  )
  if (cams.length <= 1) return cams[0]?.deviceId

  // iOS'taki "Back Camera": gerektiğinde makro lense kendi geçen akıllı
  // sanal kamera. İlk tercih budur.
  const iosSmart = cams.find(
    (c) => c.label.trim().toLowerCase() === "back camera",
  )
  if (iosSmart) return iosSmart.deviceId

  const back = cams.filter((c) => BACK_LABEL.test(c.label))
  const pool = back.length ? back : cams
  const good = pool.filter((c) => !BAD_LENS.test(c.label))
  // Android'de label'lar "camera2 0, facing back" biçiminde; düşük indeks
  // genelde ana lenstir.
  const ranked = (good.length ? good : pool).slice().sort((a, b) => {
    const ai = Number(a.label.match(/\d+/)?.[0] ?? 99)
    const bi = Number(b.label.match(/\d+/)?.[0] ?? 99)
    return ai - bi
  })
  return ranked[0]?.deviceId
}

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
  const [zoomRange, setZoomRange] = React.useState<ZoomRange | null>(null)
  const [zoom, setZoom] = React.useState(1)
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

    const stopStream = () => stream?.getTracks().forEach((t) => t.stop())

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

        // 1) İzin için ilk akış. enumerateDevices ancak izinden sonra label
        // döndürdüğü için kamera seçimini bundan sonra yapabiliyoruz.
        // Yüksek çözünürlük: ince barkod çizgileri düşük çözünürlükte çözülemez.
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        })
        if (cancelled) {
          stopStream()
          return
        }

        // 2) Ultra-wide olmayan ana arka kamerayı seç; farklıysa o cihazla
        // yeniden aç. Seçim başarısız olursa ilk akışla devam et.
        try {
          const id = await pickBackCameraId()
          const current = stream.getVideoTracks()[0]?.getSettings?.().deviceId
          if (id && id !== current) {
            const better = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: { exact: id },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
              },
            })
            stopStream()
            stream = better
          }
        } catch {
          /* kamera seçimi başarısız — ilk akışla devam */
        }
        if (cancelled) {
          stopStream()
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
              zoom?: { min: number; max: number; step?: number }
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

        // Zoom: uzaktaki/küçük barkodu büyütür. Otomatik UYGULAMIYORUZ —
        // varsayılan zoom barkodu fazla büyütüp sessiz alanları (quiet zone)
        // kadrajdan kırparak EAN-13 çözümünü engelliyordu. 1x'te başlar,
        // kullanıcı gerekiyorsa çubuktan yakınlaştırır.
        if (track && caps?.zoom) {
          const z = caps.zoom
          setZoomRange({ min: z.min, max: z.max, step: z.step ?? 0.1 })
          setZoom(z.min)
        }

        // Tarama döngüsü: her karede merkez yatay bandı bir canvas'a kopyalar
        // ve detector'ı o ROI üzerinde çalıştırır. Tüm 1080p kareyi taramaya
        // göre hem daha hızlı hem daha isabetli (kullanıcı merkeze nişan alır).
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        const scan = async () => {
          if (cancelled || !videoEl) return
          const vw = videoEl.videoWidth
          const vh = videoEl.videoHeight
          if (videoEl.readyState >= 2 && ctx && vw && vh) {
            // Tam genişlik: EAN-13'ün solundaki/sağındaki sessiz alanlar
            // (quiet zone) kadraj dışında kalırsa kod çözülemiyor. Yalnızca
            // dikeyde merkez banda kırparak hız kazanıyoruz.
            const cw = vw
            const ch = Math.round(vh * 0.6)
            const sx = 0
            const sy = Math.round((vh - ch) / 2)
            canvas.width = cw
            canvas.height = ch
            ctx.drawImage(videoEl, sx, sy, cw, ch, 0, 0, cw, ch)
            try {
              const results = await detector.detect(canvas)
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

  const handleZoom = React.useCallback((value: number[]) => {
    const track = trackRef.current
    const next = value[0]
    if (next == null) return
    setZoom(next)
    track
      ?.applyConstraints({
        // @ts-expect-error zoom standart tipte henüz yok
        advanced: [{ zoom: next }],
      })
      .catch(() => {})
  }, [])

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
          <div className="absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-full bg-black/50 px-4 py-2 backdrop-blur-sm">
            {zoomRange ? (
              <>
                <span className="text-xs text-white/80">Zoom</span>
                <Slider
                  className="flex-1"
                  min={zoomRange.min}
                  max={zoomRange.max}
                  step={zoomRange.step}
                  value={[zoom]}
                  onValueChange={handleZoom}
                />
              </>
            ) : (
              <span className="flex-1 text-xs text-white/70">
                Barkodu kırmızı çizgiye hizala
              </span>
            )}
            {torchSupported && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={toggleTorch}
              >
                {torchOn ? "Işık kapalı" : "Işık"}
              </Button>
            )}
          </div>
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
