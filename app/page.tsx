"use client"

import { Mic, Plus, ShoppingCart } from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { useRequireAuth } from "@/lib/hooks/use-require-auth"

const CHIPS = [
  "Haftalık market listesi",
  "Kahvaltılık ürünler",
  "Temizlik malzemeleri",
  "Fiş yükle ve analiz et",
]

export default function HomePage() {
  const guard = useRequireAuth()

  const handleSubmit = guard((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // TODO: wire up basket creation server action
  })

  const handleAdd = guard(() => {
    // TODO: open add-attachment flow
  })

  const handleMic = guard(() => {
    // TODO: open voice input flow
  })

  const handleChip = guard(() => {
    // TODO: prefill prompt with chip value
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

        <form className="w-full" onSubmit={handleSubmit}>
          <Field>
            <FieldLabel htmlFor="shopping-prompt" className="sr-only">
              Alışveriş listesi
            </FieldLabel>
            <InputGroup className="rounded-xl bg-sidebar">
              <InputGroupTextarea
                id="shopping-prompt"
                rows={2}
                placeholder="Alışveriş listeni yaz ya da fişinin fotoğrafını yükle."
                className="placeholder: text-sm"
              />
              <InputGroupAddon align="block-end">
                <InputGroupButton
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Ekle"
                  onClick={handleAdd}
                >
                  <Plus />
                </InputGroupButton>
                <InputGroupButton
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Sesli giriş"
                  className="ml-auto"
                  onClick={handleMic}
                >
                  <Mic />
                </InputGroupButton>
                <InputGroupButton size="sm" variant="default" type="submit">
                  <ShoppingCart />
                  Sepeti Oluştur
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </Field>
        </form>

        <div className="flex flex-wrap justify-center gap-2">
          {CHIPS.map((chip) => (
            <Button
              key={chip}
              type="button"
              variant="outline"
              size="sm"
              onClick={handleChip}
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
