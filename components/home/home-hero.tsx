"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"

import { Button } from "@/components/ui/button"
import { HeroMarketBadge } from "@/components/hero-market-badge"
import {
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input"
import { AssistantPrompt } from "@/components/assistant/assistant-prompt"

import { useRequireAuth } from "@/lib/hooks/use-require-auth"
import { useRequireLocation } from "@/lib/hooks/use-require-location"
import { useCurrentUser } from "@/components/providers/session-provider"

const CHIPS = [
  "Fiş veya yemek fotoğrafımı analiz et",
  "Nohutlu pilav yapmak istiyorum",
  "Limonata için malzemeler",
]

const ROTATING_HEADINGS = [
  "Alışveriş listesi yapalım mı?",
  "Market fişine göz atalım mı?",
  "Yemek görseline bakalım mı?",
  "Tarifinin fiyatını çıkaralım mı?",
  "Alışveriş bütçeni planlayalım mı?",
]

const ASSISTANT_SEED_KEY = "assistant:seed"
const ASSISTANT_FILE_KEY = "assistant:file"

export function HomeHero() {
  const router = useRouter()
  const guard = useRequireAuth()
  const locationGuard = useRequireLocation()
  const { user } = useCurrentUser()

  const firstName = user?.name ? user.name.trim().split(/\s+/)[0] : ""

  const headings = React.useMemo(() => {
    if (!firstName) return ROTATING_HEADINGS
    return ROTATING_HEADINGS.map((heading) => {
      const lowerFirst = heading.charAt(0).toLowerCase() + heading.slice(1)
      return `${firstName}, ${lowerFirst}`
    })
  }, [firstName])

  const [input, setInput] = React.useState("")
  const [headingIndex, setHeadingIndex] = React.useState(0)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined

    const timeoutId = setTimeout(() => {
      setHeadingIndex((prev) => (prev + 1) % ROTATING_HEADINGS.length)
      intervalId = setInterval(() => {
        setHeadingIndex((prev) => (prev + 1) % ROTATING_HEADINGS.length)
      }, 10000)
    }, 3200)

    return () => {
      clearTimeout(timeoutId)
      if (intervalId) clearInterval(intervalId)
    }
  }, [])

  // Önce auth, sonra konum kapısı: giriş yoksa login modalı, konum yoksa konum
  // modalı açılır; kaydedince gönderim kaldığı yerden devam eder.
  const submitToAssistant = (message: PromptInputMessage) => {
    if (isSubmitting) return

    const text = message.text?.trim() ?? ""
    const imageFile = (message.files ?? []).find((f) =>
      f.mediaType?.startsWith("image/"),
    )

    if (!text && !imageFile) return

    if (typeof window !== "undefined") {
      if (text) {
        window.sessionStorage.setItem(ASSISTANT_SEED_KEY, text)
      }
      if (imageFile) {
        // Store file info so assistant page can pick it up
        window.sessionStorage.setItem(
          ASSISTANT_FILE_KEY,
          JSON.stringify({
            url: imageFile.url,
            mediaType: imageFile.mediaType,
            filename: imageFile.filename,
          }),
        )
        // If no text was given, set a default seed
        if (!text) {
          window.sessionStorage.setItem(ASSISTANT_SEED_KEY, "Bu görseli analiz et")
        }
      }
    }

    setIsSubmitting(true)
    setInput("")
    router.push("/asistan")
  }

  const handleSubmit = guard(locationGuard(submitToAssistant))

  const handleChip = guard((chip: string) => {
    setInput(chip)
  })

  return (
    <>
      <link
        rel="preload"
        as="image"
        href="/backgrounds/background-image.avif"
        type="image/avif"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        href="/backgrounds/background-image.webp"
        type="image/webp"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        href="/backgrounds/background-image-dark.avif"
        type="image/avif"
      />
      <link
        rel="preload"
        as="image"
        href="/backgrounds/background-image-dark.webp"
        type="image/webp"
      />
      <link rel="preload" as="image" href="/market-logos/a101.webp" />
      <link rel="preload" as="image" href="/market-logos/migros.webp" />
      <link rel="preload" as="image" href="/market-logos/sok.webp" />
      <link rel="preload" as="image" href="/market-logos/bim.webp" />
      <link rel="preload" as="image" href="/market-logos/tarim-kredi.webp" />
      <link rel="preload" as="image" href="/market-logos/carrefoursa.webp" />
      <div className="relative flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center overflow-hidden px-4 pb-16">
        <div
          aria-hidden
          className="dark:hidden pointer-events-none absolute inset-x-0 bottom-0 h-full bg-[image:image-set(url('/backgrounds/background-image.avif')_type('image/avif'),url('/backgrounds/background-image.webp')_type('image/webp'))] bg-cover bg-bottom bg-no-repeat [mask-image:linear-gradient(to_top,black_0%,black_30%,rgba(0,0,0,0.85)_50%,rgba(0,0,0,0.55)_65%,rgba(0,0,0,0.25)_80%,rgba(0,0,0,0.08)_92%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_top,black_0%,black_30%,rgba(0,0,0,0.85)_50%,rgba(0,0,0,0.55)_65%,rgba(0,0,0,0.25)_80%,rgba(0,0,0,0.08)_92%,transparent_100%)]"
        />
        <div
          aria-hidden
          className="hidden dark:block pointer-events-none absolute inset-x-0 bottom-0 h-full bg-[image:image-set(url('/backgrounds/background-image-dark.avif')_type('image/avif'),url('/backgrounds/background-image-dark.webp')_type('image/webp'))] bg-cover bg-bottom bg-no-repeat [mask-image:linear-gradient(to_top,black_0%,black_30%,rgba(0,0,0,0.85)_50%,rgba(0,0,0,0.55)_65%,rgba(0,0,0,0.25)_80%,rgba(0,0,0,0.08)_92%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_top,black_0%,black_30%,rgba(0,0,0,0.85)_50%,rgba(0,0,0,0.55)_65%,rgba(0,0,0,0.25)_80%,rgba(0,0,0,0.08)_92%,transparent_100%)]"
        />
        {/* Görselin alt kenarını blog bölümünün dip rengine (--home-base, temaya
            bağlı) yumuşak fade ile bağlar: dipte tam renk, yukarı doğru saydamlaşır.
            Gradient detayları `.home-hero-fade` içinde (globals.css) — tek hue alfa
            rampası, görselin alt tepe siluetini çizgisiz yedirir. Kısa tutulur
            (h-[22%]) ki üst kısımdaki görüntüyü maskelemesin. */}
        <div
          aria-hidden
          className="home-hero-fade pointer-events-none absolute inset-x-0 bottom-0 h-[22%]"
        />
        <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <HeroMarketBadge />
            <h1 className="relative flex min-h-[2.5rem] items-center justify-center text-3xl font-bold tracking-tight">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={headingIndex}
                  initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="inline-block"
                >
                  {headings[headingIndex]}
                </motion.span>
              </AnimatePresence>
            </h1>
          </div>

          <AssistantPrompt
            input={input}
            setInput={setInput}
            onSubmit={handleSubmit}
            status={isSubmitting ? "submitted" : undefined}
            className="w-full"
          />

          <div className="flex flex-wrap justify-center gap-2">
            {CHIPS.map((chip) => (
              <Button
                key={chip}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleChip(chip)}
                className="h-auto rounded-lg border-border bg-muted px-3 py-1.5 text-xs font-normal text-muted-foreground hover:border-foreground/20 hover:bg-muted hover:text-foreground dark:border-muted-foreground/25 dark:bg-muted dark:hover:border-muted-foreground/35 dark:hover:bg-muted"
              >
                {chip}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
