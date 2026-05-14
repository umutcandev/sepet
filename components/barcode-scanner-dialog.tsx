"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
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
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Barkod tara</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Ürün barkodunu kameraya doğru tutun, çerçevenin içinde
            konumlandırın.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>
          {open ? (
            <ScannerSession
              key={attempt}
              onDetected={onDetected}
              onRetry={() => setAttempt((n) => n + 1)}
            />
          ) : (
            <div className="aspect-video w-full rounded-lg bg-muted" />
          )}
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

type Status = "starting" | "scanning" | "error"

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
    let controls: { stop: () => void } | null = null
    const videoEl = videoRef.current

    ;(async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser")
        if (cancelled) return

        const devices =
          await BrowserMultiFormatReader.listVideoInputDevices()
        if (cancelled) return

        if (devices.length === 0) {
          setStatus("error")
          setErrorMessage("Cihazda kamera bulunamadı.")
          return
        }

        const backCam =
          devices.find((d) => /back|rear|environment/i.test(d.label)) ??
          devices[devices.length - 1]

        if (!videoEl) return

        const reader = new BrowserMultiFormatReader()
        const ctrl = await reader.decodeFromVideoDevice(
          backCam.deviceId,
          videoEl,
          (result, _err, c) => {
            if (cancelled || !result) return
            const text = result.getText().trim()
            if (!text) return
            c.stop()
            controls = null
            onDetectedRef.current(text)
          },
        )

        if (cancelled) {
          ctrl.stop()
          return
        }
        controls = ctrl
        setStatus("scanning")
      } catch (err) {
        if (cancelled) return
        setStatus("error")
        const name = (err as Error).name
        if (name === "NotAllowedError" || name === "SecurityError") {
          setErrorMessage(
            "Kamera izni reddedildi. Tarayıcı ayarlarından izin verip tekrar dene.",
          )
        } else if (name === "NotFoundError") {
          setErrorMessage("Cihazda kullanılabilir kamera bulunamadı.")
        } else {
          setErrorMessage(
            (err as Error).message ?? "Kamera başlatılamadı.",
          )
        }
      }
    })()

    return () => {
      cancelled = true
      controls?.stop()
      const stream = videoEl?.srcObject as MediaStream | null
      stream?.getTracks().forEach((t) => t.stop())
      if (videoEl) videoEl.srcObject = null
    }
  }, [])

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border/60 bg-black">
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
