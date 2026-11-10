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
import type { ReaderOptions } from "zxing-wasm/reader"

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

  React.useEffect(() => {
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(preloadDecoder)
      return () => cancelIdleCallback(id)
    }
    const id = setTimeout(preloadDecoder, 1500)
    return () => clearTimeout(id)
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Barkod tara</DialogTitle>
          <DialogDescription>
            Barkodu ortadaki şablonla hizalayın.
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

const NATIVE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"]

// Canlı video için hafif ayar: varsayılanlar her kareyi döndürüp ters renkte de
// tarar ve 255 sembol arar. Silüet yatay olduğu için rotate gereksiz.
const WASM_OPTIONS: ReaderOptions = {
  formats: ["EAN13", "EAN8", "UPCA", "UPCE", "Code128"],
  tryHarder: true,
  tryRotate: false,
  tryInvert: false,
  tryDownscale: false,
  maxNumberOfSymbols: 1,
}

// public/wasm'daki dosya zxing-wasm sürümüyle eşleşmeli (package.json'da sabit).
const WASM_OVERRIDES = {
  locateFile: (path: string, prefix: string) =>
    path.endsWith(".wasm") ? "/wasm/zxing_reader.wasm" : prefix + path,
}

const DETECT_INTERVAL_MS = 100
const MAX_DETECT_WIDTH = 1280
// Görünen alanın ortasında decode edilen bölge; silüetten biraz geniş.
const ROI_WIDTH = 0.9
const ROI_HEIGHT = 0.5

type Decoder = (frame: ImageData) => Promise<string | null>

type NativeDetector = {
  detect: (source: ImageData) => Promise<{ rawValue?: string }[]>
}
type NativeDetectorCtor = {
  new (options: { formats: string[] }): NativeDetector
  getSupportedFormats: () => Promise<string[]>
}

let wasmReader: Promise<typeof import("zxing-wasm/reader")> | null = null

function loadWasmReader() {
  wasmReader ??= import("zxing-wasm/reader")
    .then(async (m) => {
      await m.prepareZXingModule({
        overrides: WASM_OVERRIDES,
        fireImmediately: true,
      })
      return m
    })
    .catch((err) => {
      wasmReader = null
      throw err
    })
  return wasmReader
}

function nativeDetectorCtor(): NativeDetectorCtor | null {
  return (
    (globalThis as { BarcodeDetector?: NativeDetectorCtor }).BarcodeDetector ??
    null
  )
}

// Chrome Android/macOS'ta sistemin dedektörü; yoksa (iOS, Firefox, Windows) WASM.
async function createDecoder(): Promise<Decoder> {
  const Native = nativeDetectorCtor()
  if (Native) {
    try {
      const supported = await Native.getSupportedFormats()
      const formats = NATIVE_FORMATS.filter((f) => supported.includes(f))
      if (formats.includes("ean_13")) {
        const detector = new Native({ formats })
        return async (frame) => {
          const results = await detector.detect(frame)
          return results.find((r) => r.rawValue?.trim())?.rawValue?.trim() ?? null
        }
      }
    } catch {
      /* native kullanılamıyor — WASM'a düş */
    }
  }
  const { readBarcodes } = await loadWasmReader()
  return async (frame) => {
    const results = await readBarcodes(frame, WASM_OPTIONS)
    return results.find((r) => r.isValid && r.text.trim())?.text.trim() ?? null
  }
}

/** Dialog açılmadan WASM'ı boşta indirir; native varsa gerek yok. */
function preloadDecoder() {
  if (nativeDetectorCtor()) return
  void loadWasmReader().catch(() => {})
}

// Silüet çubukları: [bar, boşluk, bar, ...] birim genişlikleri.
const SILHOUETTE_UNITS = [
  1, 1, 1, 2, 2, 1, 1, 3, 1, 1, 2, 2, 1, 1, 3, 1, 2, 1, 1, 1, 1, 2, 3, 1, 1, 1,
  2, 2, 1, 3, 1, 1, 2, 1, 1, 2, 1, 1, 3, 1, 1, 1, 2, 2, 1, 1, 1,
]
const SILHOUETTE_BARS = SILHOUETTE_UNITS.reduce<{ x: number; w: number }[]>(
  (bars, w, i) => {
    const x = SILHOUETTE_UNITS.slice(0, i).reduce((a, b) => a + b, 0)
    if (i % 2 === 0) bars.push({ x, w })
    return bars
  },
  [],
)
const SILHOUETTE_WIDTH = SILHOUETTE_UNITS.reduce((a, b) => a + b, 0)

function BarcodeSilhouette() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      <svg
        viewBox={`0 0 ${SILHOUETTE_WIDTH} 40`}
        preserveAspectRatio="none"
        className="h-[26%] w-[70%] text-white/40 drop-shadow-[0_0_2px_rgb(0_0_0/0.4)]"
      >
        {SILHOUETTE_BARS.map((b) => (
          <rect key={b.x} x={b.x} y={0} width={b.w} height={40} fill="currentColor" />
        ))}
      </svg>
    </div>
  )
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

        if (!videoEl) return
        const decoderPromise = createDecoder()
        decoderPromise.catch(() => {})

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
        const decode = await decoderPromise
        const ctx = document
          .createElement("canvas")
          .getContext("2d", { willReadFrequently: true })
        if (!ctx) throw new Error("Bu tarayıcı kamera görüntüsünü işleyemiyor.")
        if (cancelled) return
        setStatus("scanning")

        let lastDetectAt = 0

        // object-cover'ın ekranda gösterdiği kısmın ortası kırpılır.
        const grabFrame = (): ImageData | null => {
          const { videoWidth: vw, videoHeight: vh } = videoEl
          const { clientWidth: cw, clientHeight: ch } = videoEl
          if (!vw || !vh || !cw || !ch) return null
          const cover = Math.max(cw / vw, ch / vh)
          const sw = (cw / cover) * ROI_WIDTH
          const sh = (ch / cover) * ROI_HEIGHT
          const k = Math.min(1, MAX_DETECT_WIDTH / sw)
          const w = Math.round(sw * k)
          const h = Math.round(sh * k)
          const { canvas } = ctx
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w
            canvas.height = h
          }
          ctx.drawImage(videoEl, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, w, h)
          return ctx.getImageData(0, 0, w, h)
        }

        const scan = async () => {
          if (cancelled || !videoEl) return
          if (
            videoEl.readyState >= 2 &&
            performance.now() - lastDetectAt >= DETECT_INTERVAL_MS
          ) {
            try {
              const frame = grabFrame()
              const code = frame ? await decode(frame) : null
              if (cancelled) return
              if (code) {
                onDetectedRef.current(code)
                return
              }
            } catch {
              /* tek kare hatası — döngü devam etsin */
            } finally {
              lastDetectAt = performance.now()
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
      stream?.getTracks().forEach((t) => t.stop())
      if (videoEl) videoEl.srcObject = null
    }
  }, [])

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-black outline outline-1 -outline-offset-1 outline-black/10 sm:aspect-video dark:outline-white/10">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        playsInline
        muted
        autoPlay
      />
      {status === "scanning" && <BarcodeSilhouette />}
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
