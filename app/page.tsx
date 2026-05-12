"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ShoppingCart } from "lucide-react"

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
  "Haftalık market listesi",
  "Kahvaltılık ürünler",
  "Temizlik malzemeleri",
  "Fiş yükle ve analiz et",
]

const ASSISTANT_SEED_KEY = "assistant:seed"
const ASSISTANT_FILE_KEY = "assistant:file"

export default function HomePage() {
  const router = useRouter()
  const guard = useRequireAuth()
  const [input, setInput] = React.useState("")

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
          window.sessionStorage.setItem(ASSISTANT_SEED_KEY, "Fişimi analiz et")
        }
      }
    }

    setInput("")
    router.push("/assistant")
  })

  const handleChip = guard((chip: string) => {
    setInput((current) => (current.trim() ? current : chip))
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
          <h1 className="text-3xl font-bold tracking-tight">
            Alışveriş listeni oluşturalım mı?
          </h1>
        </div>

        <AssistantPrompt
          input={input}
          setInput={setInput}
          onSubmit={handleSubmit}
          className="w-full"
          submitIcon={<ShoppingCart className="size-4" />}
          submitLabel="Sepeti Oluştur"
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

