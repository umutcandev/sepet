"use client"

import * as React from "react"
import { ImageIcon, PaperclipIcon, PlusIcon, XIcon } from "lucide-react"

import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuItem,
  PromptInputActionMenuTrigger,
  usePromptInputAttachments,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input"
import type { ChatStatus } from "ai"
import { cn } from "@/lib/utils"
import { VoiceInput } from "@/components/assistant/voice-input"

interface AssistantPromptProps {
  input: string
  setInput: (value: string) => void
  onSubmit: (message: PromptInputMessage) => void | Promise<void>
  className?: string
  // For Assistant Chat
  status?: ChatStatus
  onStop?: () => void
  // Custom submit button
  submitIcon?: React.ReactNode
  submitLabel?: React.ReactNode
}

export function AssistantPrompt({
  input,
  setInput,
  onSubmit,
  className,
  status,
  onStop,
  submitIcon,
  submitLabel,
}: AssistantPromptProps) {
  return (
    <PromptInput
      accept="image/*"
      maxFiles={1}
      onSubmit={(message) => onSubmit(message)}
      className={cn(
        "rounded-xl border-ring/70 bg-muted shadow-sm",
        "has-[[data-slot=input-group-control]:focus-visible]:border-ring/70 has-[[data-slot=input-group-control]:focus-visible]:ring-0",
        "has-disabled:bg-muted has-disabled:opacity-100",
        className,
      )}
    >
      <AttachmentHeader />
      <PromptInputBody>
        <PromptInputTextarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Alışveriş listeni, yemek görselini veya fiş fotoğrafını yükle."
          className="text-sm placeholder:text-foreground/60"
        />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTools>
          <AddAttachmentMenu />
        </PromptInputTools>
        <div className="ml-auto flex items-center gap-1">
          <VoiceInput
            value={input}
            onTranscript={setInput}
            disabled={status === "submitted" || status === "streaming"}
          />
          <SubmitButton
            status={status}
            onStop={onStop}
            submitIcon={submitIcon}
            submitLabel={submitLabel}
          />
        </div>
      </PromptInputFooter>
    </PromptInput>
  )
}

function AddAttachmentMenu() {
  const att = usePromptInputAttachments()
  return (
    <PromptInputActionMenu>
      <PromptInputActionMenuTrigger className="rounded-full">
        <PlusIcon className="size-4" />
      </PromptInputActionMenuTrigger>
      <PromptInputActionMenuContent>
        <PromptInputActionMenuItem onSelect={() => att.openFileDialog()}>
          <ImageIcon className="mr-2 size-4" />
          Resim yükle
        </PromptInputActionMenuItem>
      </PromptInputActionMenuContent>
    </PromptInputActionMenu>
  )
}

function AttachmentHeader() {
  const att = usePromptInputAttachments()
  if (att.files.length === 0) return null
  return (
    <PromptInputHeader className="justify-start px-2.5 pt-2 pb-0">
      {att.files.map((f) => {
        const isImage = f.mediaType?.startsWith("image/")
        return (
          <div
            key={f.id}
            className="group relative inline-flex items-center gap-1.5 rounded-full border bg-background/80 py-1 pr-1 pl-1 text-xs"
          >
            {isImage && f.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={f.url}
                alt={f.filename ?? "fiş"}
                className="size-5 rounded-full object-cover"
              />
            ) : (
              <PaperclipIcon className="ml-1 size-3.5 text-muted-foreground" />
            )}
            <span className="max-w-[120px] truncate">
              {f.filename ?? "Fiş fotoğrafı"}
            </span>
            <button
              type="button"
              onClick={() => att.remove(f.id)}
              className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Eki kaldır"
            >
              <XIcon className="size-3" />
            </button>
          </div>
        )
      })}
    </PromptInputHeader>
  )
}

function SubmitButton({
  status,
  onStop,
  submitIcon,
  submitLabel,
}: {
  status?: ChatStatus
  onStop?: () => void
  submitIcon?: React.ReactNode
  submitLabel?: React.ReactNode
}) {
  const isGenerating = status === "submitted" || status === "streaming"

  // Use "sm" when displaying text so it's not square, otherwise "icon-sm"
  const size = (submitLabel && !isGenerating) ? "sm" : "icon-sm"

  return (
    <PromptInputSubmit
      status={status}
      onStop={onStop}
      className={cn("ml-auto", submitLabel && !isGenerating && "px-3 rounded-full")}
      size={size}
    >
      {isGenerating || (!submitIcon && !submitLabel) ? undefined : (
        <>
          {submitIcon && <span className={submitLabel ? "mr-1.5 flex items-center" : "flex items-center"}>{submitIcon}</span>}
          {submitLabel && <span>{submitLabel}</span>}
        </>
      )}
    </PromptInputSubmit>
  )
}
