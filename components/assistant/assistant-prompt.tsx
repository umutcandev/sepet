"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  AlertTriangleIcon,
  ImageIcon,
  PaperclipIcon,
  PlusIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

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
import { Spinner } from "@/components/ui/spinner"
import { uploadReceiptImage } from "@/lib/receipts/upload-image"
import { useCurrentUser } from "@/components/providers/session-provider"
import { loginDialog } from "@/lib/stores/login-dialog"

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
  // Footer'ın altında, kartın içinde açılan duyuru şeridi. Verildiğinde footer
  // aşağı doğru "açılarak" bu içeriği gösterir; null/undefined ise kapanır.
  announcement?: React.ReactNode
}

// Upload-on-attach: bir görsel input alanına paste edildiği ya da + ile
// seçildiği an R2'ye yüklenir. State, ekin data: URL'i ile anahtarlanır
// (her ek için benzersizdir). Böylece submit anında dosya zaten yüklü olur ve
// asistan beklemeden çalışır.
type UploadState = {
  status: "uploading" | "done" | "error"
  publicUrl?: string
  key?: string
}

const UploadsContext = React.createContext<Record<string, UploadState>>({})
const useUploads = () => React.useContext(UploadsContext)

export function AssistantPrompt({
  input,
  setInput,
  onSubmit,
  className,
  status,
  onStop,
  submitIcon,
  submitLabel,
  announcement,
}: AssistantPromptProps) {
  const [uploads, setUploads] = React.useState<Record<string, UploadState>>({})
  // Submit callback render dışında çalışır; en güncel upload haritasına ref
  // üzerinden ulaşırız.
  const uploadsRef = React.useRef(uploads)
  React.useEffect(() => {
    uploadsRef.current = uploads
  }, [uploads])

  // Dosya zaten yüklendiği için, parent'a iletmeden önce ekin data: URL'ini
  // R2 public URL'i + key ile değiştir. Parent artık upload beklemez.
  const handleSubmit = React.useCallback(
    (message: PromptInputMessage) => {
      const files = (message.files ?? []).map((f) => {
        const up = f.url ? uploadsRef.current[f.url] : undefined
        if (up?.status === "done" && up.publicUrl) {
          return { ...f, url: up.publicUrl, filename: up.key ?? f.filename }
        }
        return f
      })
      return onSubmit({ ...message, files })
    },
    [onSubmit],
  )

  return (
    <UploadsContext.Provider value={uploads}>
      <PromptInput
        accept="image/*"
        maxFiles={1}
        onSubmit={handleSubmit}
        className={cn(
          "rounded-xl border-ring/70 bg-muted shadow-sm dark:bg-muted",
          "has-[[data-slot=input-group-control]:focus-visible]:border-ring/70 has-[[data-slot=input-group-control]:focus-visible]:ring-0",
          "has-disabled:bg-muted has-disabled:opacity-100 dark:has-disabled:bg-muted",
          className,
        )}
      >
        <UploadManager setUploads={setUploads} />
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
              textEmpty={input.trim().length === 0}
            />
          </div>
        </PromptInputFooter>

        {/* Footer'ın bir uzantısı: yükseklik açılarak (height → auto) kartın
            içinde belirir. order-last ile footer'ın altına oturur; InputGroup
            zaten overflow-hidden olduğundan açılım temiz klipslenir. */}
        <AnimatePresence initial={false}>
          {announcement && (
            <motion.div
              key="prompt-announcement"
              initial={{ height: 0, opacity: 0 }}
              animate={{
                height: "auto",
                opacity: 1,
                transition: {
                  height: {
                    type: "spring",
                    stiffness: 420,
                    damping: 38,
                    mass: 0.8,
                    delay: 0.35,
                  },
                  opacity: { duration: 0.25, delay: 0.4 },
                },
              }}
              exit={{
                height: 0,
                opacity: 0,
                transition: { duration: 0.2, ease: "easeIn" },
              }}
              className="order-last w-full overflow-hidden"
            >
              <div className="flex items-center gap-2 border-t border-border/60 bg-foreground/[0.035] px-3 py-1.5 dark:bg-foreground/[0.04]">
                {announcement}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </PromptInput>
    </UploadsContext.Provider>
  )
}

/**
 * Eklenen görselleri attach anında R2'ye yükler. Görünür çıktısı yoktur;
 * yalnızca upload state'ini yönetir. PromptInput içinde olmalı ki
 * usePromptInputAttachments'a erişebilsin.
 */
function UploadManager({
  setUploads,
}: {
  setUploads: React.Dispatch<
    React.SetStateAction<Record<string, UploadState>>
  >
}) {
  const att = usePromptInputAttachments()
  const { isAuthenticated } = useCurrentUser()
  const startedRef = React.useRef<Set<string>>(new Set())

  React.useEffect(() => {
    const currentUrls = new Set<string>()

    for (const f of att.files) {
      if (!f.url) continue
      currentUrls.add(f.url)
      if (!f.mediaType?.startsWith("image/")) continue
      if (startedRef.current.has(f.url)) continue

      // Upload endpoint'i auth ister (aksi halde 401). Giriş yoksa eki kaldır
      // ve login dialog'u aç — guard davranışını yansıt.
      if (!isAuthenticated) {
        loginDialog.open()
        att.remove(f.id)
        continue
      }

      const url = f.url
      const mediaType = f.mediaType
      const filename = f.filename
      startedRef.current.add(url)
      setUploads((prev) => ({ ...prev, [url]: { status: "uploading" } }))

      uploadReceiptImage({ url, mediaType, filename })
        .then((res) => {
          setUploads((prev) => ({
            ...prev,
            [url]: { status: "done", publicUrl: res.publicUrl, key: res.key },
          }))
        })
        .catch((err) => {
          setUploads((prev) => ({ ...prev, [url]: { status: "error" } }))
          toast.error(
            err instanceof Error
              ? err.message
              : "Fotoğraf yüklenemedi. Lütfen tekrar dene.",
          )
        })
    }

    // Kaldırılan ekler için upload kayıtlarını temizle.
    setUploads((prev) => {
      let changed = false
      const next: Record<string, UploadState> = {}
      for (const [key, value] of Object.entries(prev)) {
        if (currentUrls.has(key)) {
          next[key] = value
        } else {
          changed = true
          startedRef.current.delete(key)
        }
      }
      return changed ? next : prev
    })
  }, [att, isAuthenticated, setUploads])

  return null
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
  const uploads = useUploads()
  if (att.files.length === 0) return null
  return (
    <PromptInputHeader className="justify-start px-2.5 pt-2 pb-0">
      {att.files.map((f) => {
        const isImage = f.mediaType?.startsWith("image/")
        const upload = f.url ? uploads[f.url] : undefined
        const uploading = upload?.status === "uploading"
        const errored = upload?.status === "error"
        return (
          <div
            key={f.id}
            className={cn(
              "group relative inline-flex items-center gap-1.5 rounded-full border bg-background/80 py-1 pr-1 pl-1 text-xs",
              errored && "border-destructive/50",
            )}
          >
            <span className="relative inline-flex size-5 shrink-0 items-center justify-center">
              {isImage && f.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={f.url}
                  alt={f.filename ?? "fiş"}
                  className={cn(
                    "size-5 rounded-full object-cover transition",
                    uploading && "blur-[1px]",
                  )}
                />
              ) : (
                <PaperclipIcon className="size-3.5 text-muted-foreground" />
              )}
              {uploading && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/40">
                  <Spinner className="size-3 text-foreground/80" />
                </span>
              )}
              {errored && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-destructive/15">
                  <AlertTriangleIcon className="size-3 text-destructive" />
                </span>
              )}
            </span>
            <span
              className={cn(
                "max-w-[120px] truncate",
                errored && "text-destructive",
              )}
            >
              {uploading
                ? "Yükleniyor…"
                : errored
                  ? "Yüklenemedi"
                  : (f.filename ?? "Fiş fotoğrafı")}
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
  textEmpty,
}: {
  status?: ChatStatus
  onStop?: () => void
  submitIcon?: React.ReactNode
  submitLabel?: React.ReactNode
  textEmpty: boolean
}) {
  const att = usePromptInputAttachments()
  const uploads = useUploads()
  const isGenerating = status === "submitted" || status === "streaming"

  // Görsel ekleri henüz yüklenmediyse (uploading/error) gönderimi engelle.
  const imagesNotReady = att.files.some(
    (f) =>
      f.mediaType?.startsWith("image/") &&
      (f.url ? uploads[f.url]?.status : undefined) !== "done",
  )

  // Text girdisi zorunlu — boşken ya da yükleme bitmemişken send pasif. Üretim
  // sırasında buton "durdur" görevi gördüğü için aktif kalmalı.
  const disabled = !isGenerating && (textEmpty || imagesNotReady)

  // Use "sm" when displaying text so it's not square, otherwise "icon-sm"
  const size = submitLabel && !isGenerating ? "sm" : "icon-sm"

  return (
    <PromptInputSubmit
      status={status}
      onStop={onStop}
      disabled={disabled}
      className={cn(
        "ml-auto",
        submitLabel && !isGenerating && "px-3 rounded-full",
      )}
      size={size}
    >
      {isGenerating || (!submitIcon && !submitLabel) ? undefined : (
        <>
          {submitIcon && (
            <span
              className={
                submitLabel ? "mr-1.5 flex items-center" : "flex items-center"
              }
            >
              {submitIcon}
            </span>
          )}
          {submitLabel && <span>{submitLabel}</span>}
        </>
      )}
    </PromptInputSubmit>
  )
}
