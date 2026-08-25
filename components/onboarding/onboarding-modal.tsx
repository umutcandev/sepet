"use client"

import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { RiArrowRightLine, RiPauseFill, RiPlayFill } from "@remixicon/react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { completeOnboarding } from "@/lib/actions/onboarding"

type Step = {
  title: string
  description: string
  video: string
}

const ONBOARDING_STEPS: Step[] = [
  {
    title: "Yapay zeka ile sepetini oluştur",
    description:
      "Alışveriş listeni yaz, Sepet listeni kalemlere dönüştürür ve gerçek market kataloglarıyla eşler. Tarif veya yemek adı yazarsan malzeme listesini de çıkarabilir.",
    video: "/onboarding/1-dogal-dil.mp4",
  },
  {
    title: "Fişini fotoğrafla, analiz edelim",
    description:
      "Market fişinin fotoğrafını yükle; yapay zeka market adını, tarihi ve tüm kalemleri çıkarır. Ödediğin tutar, aynı sepetin bugünkü en iyi fiyatıyla karşılaştırılır.",
    video: "/onboarding/2-fis-okuma.mp4",
  },
  {
    title: "Yemek görselinden en ucuz malzemeleri bul",
    description:
      "Yapmak istediğin yemeğin fotoğrafını paylaş. Sepet, tabaktaki yemeği tanır ve evde yapmak için gerekli malzemeleri en ucuz marketde senin için bulur.",
    video: "/onboarding/3-yemek-gorseli.mp4",
  },
  {
    title: "Barkod tarayıcı ile fiyat karşılaştırması yap",
    description:
      "Ürünlerin barkodlarını tarayarak farklı marketlerdeki fiyatları karşılaştır. En ucuz seçeneği anında gör, tasarruf etmeye başla.",
    video: "/onboarding/4-barkod.mp4",
  },
  {
    title: "Sepetlerini ya da fişlerini kaydet",
    description:
      "Onayladığın sepetleri ve analiz ettiğin fişleri kaydedebilirsin. Böylece daha sonra ne kadar tasarruf ettiğini görebilir, geçmiş sepetlerini ve fişlerini takip edebilirsin.",
    video: "/onboarding/5-gecmis.mp4",
  },
]

function StepVideo({ src }: { src: string }) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  // Hareket azaltma tercihinde döngü kendiliğinden BAŞLAMAZ (WCAG 2.2.2 +
  // vestibüler tetikleyici); kullanıcı isterse oynatır.
  const reduceMotion = useReducedMotion()
  // Durum elemanın KENDİSİNDEN okunur (onPlay/onPause), effect'ten yazılmaz:
  // tarayıcı otomatik oynatmayı engellerse buton yine doğru ikonu gösterir.
  const [playing, setPlaying] = React.useState(!reduceMotion)

  React.useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = 0
    if (!reduceMotion) video.play().catch(() => {})
  }, [src, reduceMotion])

  const toggle = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().catch(() => {})
      setPlaying(true)
    } else {
      video.pause()
      setPlaying(false)
    }
  }

  return (
    <div className="group/step-video relative aspect-video w-full overflow-hidden rounded-lg bg-muted ring-1 ring-border/50">
      <video
        ref={videoRef}
        src={src}
        autoPlay={!reduceMotion}
        loop
        muted
        playsInline
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* 5 saniyeden uzun otomatik hareketin görünür bir durdurma kontrolü
          olmalı. Duraklatılmışken kalıcı, oynarken hover/odakta belirir —
          kontrol her zaman klavyeyle ulaşılabilir. */}
      <Button
        type="button"
        size="icon-sm"
        variant="secondary"
        onClick={toggle}
        aria-label={playing ? "Videoyu duraklat" : "Videoyu oynat"}
        className={cn(
          "absolute right-2 bottom-2 rounded-full transition-opacity duration-150",
          playing &&
            "opacity-0 group-hover/step-video:opacity-100 focus-visible:opacity-100"
        )}
      >
        {playing ? (
          <RiPauseFill className="size-3.5" />
        ) : (
          <RiPlayFill className="size-3.5" />
        )}
      </Button>
    </div>
  )
}

function OnboardingStepContent({
  step,
  currentStep,
  totalSteps,
  onNext,
  onSkip,
  onFinish,
  disabled,
}: {
  step: Step
  currentStep: number
  totalSteps: number
  onNext: () => void
  onSkip: () => void
  onFinish: () => void
  disabled: boolean
}) {
  const isLastStep = currentStep === totalSteps - 1

  return (
    <div className="flex flex-col">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <StepVideo src={step.video} />
          <div className="mt-4 space-y-1.5 px-1">
            <h3 className="cn-font-heading text-base font-medium leading-tight text-foreground">
              {step.title}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {step.description}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5" aria-hidden>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <motion.span
              key={i}
              className="h-2 rounded-full"
              animate={{
                width: i === currentStep ? 18 : 8,
                backgroundColor:
                  i === currentStep
                    ? "var(--foreground)"
                    : "color-mix(in srgb, var(--muted-foreground) 30%, transparent)",
              }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            />
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            disabled={disabled}
            className="text-xs text-muted-foreground"
          >
            Atla
          </Button>
          {isLastStep ? (
            <Button size="sm" onClick={onFinish} disabled={disabled}>
              Başla
            </Button>
          ) : (
            <Button size="sm" onClick={onNext} disabled={disabled}>
              İleri
              <RiArrowRightLine className="ml-1 h-3.5 w-3.5" data-icon="inline-end" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Yalnızca OnboardingHost tarafından, kapı koşulu sağlandığında mount edilir
 * (bkz. onboarding-host.tsx). Bu yüzden `open` doğrudan true başlar: kapıyı
 * prop olarak alıp `useState(prop)` ile okumak, oturum asenkron geldiği için
 * modalı kalıcı olarak kapalıya kilitliyordu.
 */
export function OnboardingModal() {
  const isMobile = useIsMobile()
  const [open, setOpen] = React.useState(true)
  const [currentStep, setCurrentStep] = React.useState(0)
  const [isClosing, setIsClosing] = React.useState(false)
  const [videosReady, setVideosReady] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    const videos: HTMLVideoElement[] = []
    const promises = ONBOARDING_STEPS.map(
      (step) =>
        new Promise<void>((resolve) => {
          const video = document.createElement("video")
          videos.push(video)
          video.preload = "auto"
          video.muted = true
          video.onloadeddata = () => resolve()
          video.onerror = () => resolve()
          video.src = step.video
        }),
    )

    Promise.all(promises).then(() => {
      if (!cancelled) setVideosReady(true)
    })

    return () => {
      cancelled = true
      videos.forEach((v) => {
        v.onloadeddata = null
        v.onerror = null
        v.src = ""
        v.load()
      })
    }
  }, [])

  const handleComplete = React.useCallback(async () => {
    if (isClosing) return
    setIsClosing(true)
    setOpen(false)
    try {
      await completeOnboarding()
    } catch {
      // Tamamlama isteği başarısız olsa bile modal'i tekrar açmıyoruz;
      // sonraki ziyarette getCurrentUser tekrar kontrol edecek.
    } finally {
      setIsClosing(false)
    }
  }, [isClosing])

  const handleNext = React.useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, ONBOARDING_STEPS.length - 1))
  }, [])

  if (!videosReady || !open) return null

  const stepContent = (
    <OnboardingStepContent
      step={ONBOARDING_STEPS[currentStep]}
      currentStep={currentStep}
      totalSteps={ONBOARDING_STEPS.length}
      onNext={handleNext}
      onSkip={handleComplete}
      onFinish={handleComplete}
      disabled={isClosing}
    />
  )

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={(o) => {
          if (!o) handleComplete()
        }}
      >
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader className="sr-only">
              <DrawerTitle>Sepet&apos;e hoş geldin</DrawerTitle>
              <DrawerDescription>
                Hızlıca temel özellikleri keşfet
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pt-2 pb-6">{stepContent}</div>
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleComplete()
      }}
    >
      <DialogContent className="p-5 sm:max-w-md" showCloseButton={false}>
        <DialogHeader className="sr-only">
          <DialogTitle>Sepet&apos;e hoş geldin</DialogTitle>
          <DialogDescription>
            Hızlıca temel özellikleri keşfet
          </DialogDescription>
        </DialogHeader>
        {stepContent}
      </DialogContent>
    </Dialog>
  )
}
