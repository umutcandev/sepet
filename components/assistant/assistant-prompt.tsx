"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  ImageIcon,
  PaperclipIcon,
  PlusIcon,
  RefreshCwIcon,
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
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment"
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
  progress?: number // 0-100, yalnızca yüklenirken
  size?: number // byte cinsinden dosya boyutu, tamamlandığında
}

// "image/png" → "PNG", "image/jpeg" → "JPG". Sunucu yalnızca JPEG/PNG/WebP
// kabul ettiği için done state'inde mediaType her zaman bu kümeden gelir.
function fileTypeLabel(mediaType?: string, filename?: string): string {
  const sub = mediaType?.split("/")[1]?.split("+")[0]
  if (sub) {
    const upper = sub.toUpperCase()
    return upper === "JPEG" ? "JPG" : upper
  }
  const ext = filename?.split(".").pop()
  return ext ? ext.toUpperCase() : "DOSYA"
}

// Byte → insancıl boyut: "64 KB", "1.2 MB". 10'un altındaki değerlerde tek
// ondalık, üstünde tam sayı (örn. "8.4 KB", "64 KB", "1.2 MB").
function formatFileSize(bytes?: number): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return ""
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`
  const mb = kb / 1024
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`
}

type UploadFile = { url?: string; mediaType?: string; filename?: string }

type UploadsContextValue = {
  uploads: Record<string, UploadState>
  retry: (file: UploadFile) => void
}

const UploadsContext = React.createContext<UploadsContextValue>({
  uploads: {},
  retry: () => {},
})
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

  // Bir görseli R2'ye yükler ve upload state'ini günceller. Hem attach anında
  // (UploadManager) hem de hata sonrası "tekrar dene" akışında kullanılır.
  const startUpload = React.useCallback((file: UploadFile) => {
    const url = file.url
    if (!url) return
    setUploads((prev) => ({ ...prev, [url]: { status: "uploading" } }))
    uploadReceiptImage(file, {
      onProgress: (loaded, total) => {
        const percent = total > 0 ? Math.round((loaded / total) * 100) : 0
        setUploads((prev) => {
          const cur = prev[url]
          // Yalnızca hâlâ bu yükleme sürerken ilerlemeyi yaz (yarış önler).
          if (!cur || cur.status !== "uploading") return prev
          return { ...prev, [url]: { ...cur, progress: percent } }
        })
      },
    })
      .then((res) => {
        setUploads((prev) => ({
          ...prev,
          [url]: {
            status: "done",
            publicUrl: res.publicUrl,
            key: res.key,
            size: res.size,
          },
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
  }, [])

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
    <UploadsContext.Provider value={{ uploads, retry: startUpload }}>
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
        <UploadManager setUploads={setUploads} startUpload={startUpload} />
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
  startUpload,
}: {
  setUploads: React.Dispatch<
    React.SetStateAction<Record<string, UploadState>>
  >
  startUpload: (file: UploadFile) => void
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

      startedRef.current.add(f.url)
      startUpload({ url: f.url, mediaType: f.mediaType, filename: f.filename })
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
  }, [att, isAuthenticated, setUploads, startUpload])

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
  const { uploads, retry } = useUploads()
  if (att.files.length === 0) return null
  return (
    <PromptInputHeader className="justify-start px-2.5 pt-2 pb-0">
      <AttachmentGroup>
        {att.files.map((f) => {
          const url = f.url
          const isImage = f.mediaType?.startsWith("image/")
          const upload = url ? uploads[url] : undefined
          const state: "idle" | "uploading" | "error" | "done" =
            upload?.status === "uploading"
              ? "uploading"
              : upload?.status === "error"
                ? "error"
                : upload?.status === "done"
                  ? "done"
                  : "idle"
          const doneInfo = [
            fileTypeLabel(f.mediaType, f.filename),
            formatFileSize(upload?.size),
          ]
            .filter(Boolean)
            .join(" · ")
          return (
            <Attachment
              key={f.id}
              state={state}
              orientation="horizontal"
              size="sm"
            >
              <AttachmentMedia variant={isImage && url ? "image" : "icon"}>
                {isImage && url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt={f.filename ?? "fiş"} />
                ) : (
                  <PaperclipIcon />
                )}
                {state === "uploading" && (
                  <span className="absolute inset-0 flex items-center justify-center bg-background/40">
                    <Spinner className="size-3.5 text-foreground/80" />
                  </span>
                )}
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>
                  {f.filename ?? "Fiş fotoğrafı"}
                </AttachmentTitle>
                <AttachmentDescription>
                  {state === "uploading"
                    ? upload?.progress != null
                      ? `Yükleniyor · ${upload.progress}%`
                      : "Yükleniyor…"
                    : state === "error"
                      ? "Yüklenemedi. Tekrar dene."
                      : state === "done"
                        ? doneInfo || "Yüklendi"
                        : "Yüklenecek"}
                </AttachmentDescription>
              </AttachmentContent>
              <AttachmentActions>
                {state === "error" && url && (
                  <AttachmentAction
                    aria-label="Tekrar dene"
                    onClick={() =>
                      retry({
                        url,
                        mediaType: f.mediaType,
                        filename: f.filename,
                      })
                    }
                  >
                    <RefreshCwIcon />
                  </AttachmentAction>
                )}
                <AttachmentAction
                  aria-label="Eki kaldır"
                  onClick={() => att.remove(f.id)}
                >
                  <XIcon />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          )
        })}
      </AttachmentGroup>
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
  const { uploads } = useUploads()
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
