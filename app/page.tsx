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

export default function HomePage() {
  const router = useRouter()
  const guard = useRequireAuth()
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

  const handleSubmit = guard((message: PromptInputMessage) => {
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
  })

  const handleChip = guard((chip: string) => {
    setInput(chip)
  })

  return (
    <>
      <link
        rel="preload"
        as="image"
        href="/background-image.avif"
        type="image/avif"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        href="/background-image.webp"
        type="image/webp"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        href="/background-image-dark.avif"
        type="image/avif"
      />
      <link
        rel="preload"
        as="image"
        href="/background-image-dark.webp"
        type="image/webp"
      />
      <link rel="preload" as="image" href="/market-logos/a101.webp" />
      <link rel="preload" as="image" href="/market-logos/migros.webp" />
      <link rel="preload" as="image" href="/market-logos/sok.webp" />
      <link rel="preload" as="image" href="/market-logos/bim.webp" />
      <link rel="preload" as="image" href="/market-logos/tarim-kredi.webp" />
      <link rel="preload" as="image" href="/market-logos/carrefoursa.webp" />
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 pb-16">
        <div
          aria-hidden
          className="dark:hidden pointer-events-none absolute inset-x-0 bottom-0 h-full bg-[image:image-set(url('/background-image.avif')_type('image/avif'),url('/background-image.webp')_type('image/webp'))] bg-cover bg-bottom bg-no-repeat [mask-image:linear-gradient(to_top,black_0%,black_30%,rgba(0,0,0,0.85)_50%,rgba(0,0,0,0.55)_65%,rgba(0,0,0,0.25)_80%,rgba(0,0,0,0.08)_92%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_top,black_0%,black_30%,rgba(0,0,0,0.85)_50%,rgba(0,0,0,0.55)_65%,rgba(0,0,0,0.25)_80%,rgba(0,0,0,0.08)_92%,transparent_100%)]"
        />
        <div
          aria-hidden
          className="hidden dark:block pointer-events-none absolute inset-x-0 bottom-0 h-full bg-[image:image-set(url('/background-image-dark.avif')_type('image/avif'),url('/background-image-dark.webp')_type('image/webp'))] bg-cover bg-bottom bg-no-repeat [mask-image:linear-gradient(to_top,black_0%,black_30%,rgba(0,0,0,0.85)_50%,rgba(0,0,0,0.55)_65%,rgba(0,0,0,0.25)_80%,rgba(0,0,0,0.08)_92%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_top,black_0%,black_30%,rgba(0,0,0,0.85)_50%,rgba(0,0,0,0.55)_65%,rgba(0,0,0,0.25)_80%,rgba(0,0,0,0.08)_92%,transparent_100%)]"
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
                className="h-auto rounded-full border-border px-3 py-1.5 text-xs font-normal text-muted-foreground dark:border-muted-foreground/25 dark:bg-muted dark:hover:bg-muted/80"
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

