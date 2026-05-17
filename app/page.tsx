"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input"
import { AssistantPrompt } from "@/components/assistant/assistant-prompt"

import { useRequireAuth } from "@/lib/hooks/use-require-auth"

const CHIPS = [
  "Kremalı makarna için malzemeler",
  "Limonata için malzemeler",
  "Fiş veya yemek fotoğrafımı analiz et",
]

const ROTATING_HEADINGS = [
  "Alışveriş listeni oluşturalım mı?",
  "Bugün ne pişirelim?",
  "Fişini veya yemek fotoğrafını analiz edelim mi?",
  "Tarifin için malzemeleri çıkaralım mı?",
  "Bütçeni birlikte planlayalım mı?",
]

const ASSISTANT_SEED_KEY = "assistant:seed"
const ASSISTANT_FILE_KEY = "assistant:file"

export default function HomePage() {
  const router = useRouter()
  const guard = useRequireAuth()
  const [input, setInput] = React.useState("")
  const [headingIndex, setHeadingIndex] = React.useState(0)

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

    setInput("")
    router.push("/asistan")
  })

  const handleChip = guard((chip: string) => {
    setInput(chip)
  })

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 pb-16">
      <div className="flex w-full max-w-2xl flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <AvatarGroup>
            <Avatar>
              <AvatarImage src="/a101-brand.jpg" alt="A101" />
              <AvatarFallback>A</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarImage src="/migros-brand.jpg" alt="Migros" />
              <AvatarFallback>M</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarImage src="/sok-brand.jpg" alt="ŞOK" />
              <AvatarFallback>Ş</AvatarFallback>
            </Avatar>
            <AvatarGroupCount>+42</AvatarGroupCount>
          </AvatarGroup>
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
                {ROTATING_HEADINGS[headingIndex]}
              </motion.span>
            </AnimatePresence>
          </h1>
        </div>

        <AssistantPrompt
          input={input}
          setInput={setInput}
          onSubmit={handleSubmit}
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
              className="h-auto rounded-full px-3 py-1.5 text-xs font-normal text-muted-foreground"
            >
              {chip}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

