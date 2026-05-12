"use client"

import * as React from "react"
import { PaperclipIcon, XIcon } from "lucide-react"

import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  PromptInputButton,
  usePromptInputAttachments,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input"
import type { ChatStatus } from "ai"
import { cn } from "@/lib/utils"

interface AssistantPromptProps {
  input: string
  setInput: (value: string) => void
  onSubmit: (message: PromptInputMessage) => void | Promise<void>
  className?: string
  // For Assistant Chat
  isBusy?: boolean
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
  isBusy,
  status,
  onStop,
  submitIcon,
  submitLabel,
}: AssistantPromptProps) {
  return (
    <PromptInput
      accept="image/*"
      maxFiles={1}
      onSubmit={onSubmit as any}
      className={cn("rounded-xl border-primary/15 bg-background/70 shadow-sm backdrop-blur-sm", className)}
    >
      <PromptInputBody>
        <AttachmentPreviewStrip />
        <PromptInputTextarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Alışveriş listeni yaz ya da fişinin fotoğrafını yükle."
          className="text-sm"
        />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTools>
          <UploadReceiptButton />
        </PromptInputTools>
        <SubmitButton
          input={input}
          isBusy={isBusy}
          status={status}
          onStop={onStop}
          submitIcon={submitIcon}
          submitLabel={submitLabel}
        />
      </PromptInputFooter>
    </PromptInput>
  )
}

function UploadReceiptButton() {
  const att = usePromptInputAttachments()
  return (
    <PromptInputButton
      className="w-auto px-3 rounded-full text-xs font-normal"
      onClick={() => att.openFileDialog()}
    >
      <PaperclipIcon className="mr-1.5 size-3.5" />
      Fiş Yükle
    </PromptInputButton>
  )
}

function AttachmentPreviewStrip() {
  const att = usePromptInputAttachments()
  if (att.files.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2 px-3 pt-3">
      {att.files.map((f) => {
        const isImage = f.mediaType?.startsWith("image/")
        return (
          <div
            key={f.id}
            className="group relative flex items-center gap-2 rounded-lg border bg-background/60 px-2 py-1.5 text-xs"
          >
            {isImage && f.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={f.url}
                alt={f.filename ?? "fiş"}
                className="size-8 rounded object-cover"
              />
            ) : (
              <PaperclipIcon className="size-4 text-muted-foreground" />
            )}
            <span className="max-w-[140px] truncate">
              {f.filename ?? "Fiş fotoğrafı"}
            </span>
            <button
              type="button"
              onClick={() => att.remove(f.id)}
              className="ml-1 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Eki kaldır"
            >
              <XIcon className="size-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

function SubmitButton({
  input,
  isBusy,
  status,
  onStop,
  submitIcon,
  submitLabel,
}: {
  input: string
  isBusy?: boolean
  status?: ChatStatus
  onStop?: () => void
  submitIcon?: React.ReactNode
  submitLabel?: React.ReactNode
}) {
  const att = usePromptInputAttachments()
  const hasContent = !!input.trim() || att.files.length > 0
  const isGenerating = status === "submitted" || status === "streaming"

  // Use "sm" when displaying text so it's not square, otherwise "icon-sm"
  const size = (submitLabel && !isGenerating) ? "sm" : "icon-sm"

  return (
    <PromptInputSubmit
      status={status}
      onStop={onStop}
      disabled={!hasContent && !isBusy}
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
