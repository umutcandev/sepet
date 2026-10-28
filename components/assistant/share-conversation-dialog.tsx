"use client"

import * as React from "react"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"
import {
  RiChat3Line,
  RiCheckLine,
  RiExternalLinkLine,
  RiFileCopyLine,
  RiGlobalLine,
  RiLockLine,
  RiShareForwardLine,
  type RemixiconComponentType,
} from "@remixicon/react"

import { toast } from "@/components/ui/sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { useMediaQuery } from "@/hooks/use-media-query"
import {
  getConversationShareState,
  setConversationShareAnonymous,
  setConversationShareHideImages,
  shareConversation,
  unshareConversation,
  type ConversationShareState,
  type ShareActionError,
} from "@/lib/actions/conversation-shares"
import { copyText, copyTextWhenReady } from "@/lib/copy"
import { useAssistantConversations } from "@/lib/stores/assistant-conversations"
import type { ConversationListItem } from "@/components/assistant/assistant-conversations-group"
import { cn } from "@/lib/utils"

const ERROR_TEXT: Record<ShareActionError, string> = {
  unauthorized: "Oturumun sona ermiş. Tekrar giriş yapıp dener misin?",
  not_found: "Bu sohbet bulunamadı.",
  empty: "Bu sohbette paylaşılacak bir mesaj yok.",
  too_large: "Bu sohbet paylaşmak için çok uzun.",
  rate_limited: "Çok hızlı denedin. Biraz bekleyip tekrar dener misin?",
  failed: "Paylaşım şu an yapılamadı. Lütfen tekrar dene.",
}

// Yeni bir paylaşımda anahtarların başlangıç değeri: kullanıcının son seçimi.
// Yalnızca bu cihazda bir kolaylık; asıl değer paylaşım satırında.
const ANON_PREF_KEY = "sepet:share-anonymous"
// Görseller varsayılan olarak gizli: fiş fotoğrafında ad, adres ya da kart
// numarası olabilir; göstermek kullanıcının bilinçli seçimi olsun.
const HIDE_IMAGES_PREF_KEY = "sepet:share-hide-images"

function readPref(key: string, fallback: boolean): boolean {
  try {
    const value = window.localStorage.getItem(key)
    return value === null ? fallback : value === "1"
  } catch {
    return fallback
  }
}

function writePref(key: string, value: boolean) {
  try {
    window.localStorage.setItem(key, value ? "1" : "0")
  } catch {
    // gizli pencere / engellenmiş depolama: tercih hatırlanmaz, sorun değil
  }
}

function shareUrl(token: string): string {
  return `${window.location.origin}/paylasim/${token}`
}

const dateFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
})

type Access = "private" | "link"
type Busy = "share" | "anonymous" | "images" | "revoke" | null

// Hidrasyondan önce store boş; stabil referans (bkz. assistant-header-actions).
const EMPTY: ConversationListItem[] = []

/**
 * Sohbet başlığının yanındaki "Paylaş". Masaüstünde header'ın sağında,
 * mobilde avatarın yerinde (avatar menüsü kenar çubuğunda da var).
 */
export function ShareConversationButton({
  conversationId,
  title,
  className,
}: {
  conversationId: string
  title: string
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={className}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        Paylaş
      </Button>
      <ShareConversationDialog
        open={open}
        onOpenChange={setOpen}
        conversationId={conversationId}
        title={title}
      />
    </>
  )
}

export function ShareConversationDialog({
  open,
  onOpenChange,
  conversationId,
  title,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversationId: string
  title: string
}) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Sohbeti paylaş</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {/* Görseller "Resimleri gizle" seçeneğine bağlı (yalnız görselli
                sohbette görünür); şube adları hiçbir durumda paylaşılmaz. */}
            Yalnızca şu ana kadarki mesajlar paylaşılır; şube adları
            paylaşılmaz.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        {/* İçerik her açılışta baştan kurulur: durum (kopya güncel mi)
            sunucudan tazelenir, yarım kalan seçim taşınmaz. */}
        {open ? (
          <SharePanel conversationId={conversationId} title={title} />
        ) : null}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

function SharePanel({
  conversationId,
  title,
}: {
  conversationId: string
  title: string
}) {
  const [state, setState] = React.useState<ConversationShareState | null>(null)
  const [loadError, setLoadError] = React.useState<ShareActionError | null>(
    null
  )
  const [access, setAccess] = React.useState<Access>("private")
  const [anonymous, setAnonymous] = React.useState(false)
  const [hideImages, setHideImages] = React.useState(true)
  const [busy, setBusy] = React.useState<Busy>(null)
  const [copied, setCopied] = React.useState(false)
  const anonId = React.useId()
  const hideImagesId = React.useId()

  // Yanıt akarken kopya yarım bir turu yakalardı (kullanıcı mesajı kayıtlı,
  // cevap henüz değil).
  const list = useAssistantConversations(EMPTY)
  const streaming = list.some((c) => c.id === conversationId && c.streaming)
  const touch = useMediaQuery("(pointer: coarse)")
  const canNativeShare =
    touch && typeof navigator !== "undefined" && "share" in navigator

  React.useEffect(() => {
    let cancelled = false
    getConversationShareState(conversationId)
      .then((res) => {
        if (cancelled) return
        if (!res.ok) {
          setLoadError(res.error)
          return
        }
        setState(res.state)
        setAccess(res.state.share ? "link" : "private")
        setAnonymous(
          res.state.share
            ? res.state.share.anonymous
            : readPref(ANON_PREF_KEY, false)
        )
        setHideImages(
          res.state.share
            ? res.state.share.hideImages
            : readPref(HIDE_IMAGES_PREF_KEY, true)
        )
      })
      .catch(() => {
        if (!cancelled) setLoadError("failed")
      })
    return () => {
      cancelled = true
    }
  }, [conversationId])

  React.useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(t)
  }, [copied])

  const share = state?.share ?? null
  const url = share ? shareUrl(share.token) : null

  async function handleShare() {
    if (busy || streaming) return
    setBusy("share")
    const request = shareConversation({
      conversationId,
      anonymous,
      hideImages,
    })
    // Pano yazımı tıklama anında başlar, bağlantı sunucudan gelince dolar.
    const copying = copyTextWhenReady(
      request.then((res) =>
        res.ok && res.state.share ? shareUrl(res.state.share.token) : null
      )
    )
    try {
      const res = await request
      if (!res.ok) {
        toast.error(ERROR_TEXT[res.error])
        return
      }
      setState(res.state)
      // Görselsiz kopyada sunucu gizli saklar; kutu kaydedileni göstersin.
      if (res.state.share) setHideImages(res.state.share.hideImages)
      writePref(ANON_PREF_KEY, anonymous)
      if (res.state.hasImages) writePref(HIDE_IMAGES_PREF_KEY, hideImages)
      const ok = await copying
      if (ok) setCopied(true)
      const copiedText = ok ? " ve kopyalandı" : ""
      if (!res.created) {
        toast.success(`Bağlantı güncellendi${copiedText}.`)
      } else if (share) {
        // Pencere açıkken eski bağlantı başka yerden kaldırılmış: gönderilmiş
        // olan artık açılmıyor, bunu söylemeden "güncellendi" denmemeli.
        toast.warning(
          `Önceki bağlantı kaldırılmıştı; yeni bir bağlantı oluşturuldu${copiedText}.`
        )
      } else {
        toast.success(`Bağlantı oluşturuldu${copiedText}.`)
      }
    } catch {
      toast.error(ERROR_TEXT.failed)
    } finally {
      setBusy(null)
    }
  }

  async function handleCopy() {
    if (!url) return
    if (await copyText(url)) {
      setCopied(true)
      toast.success("Bağlantı kopyalandı.")
    } else {
      toast.error("Bağlantı kopyalanamadı. Alandan seçip kopyalayabilirsin.")
    }
  }

  async function handleNativeShare() {
    if (!url) return
    try {
      await navigator.share({ title, url })
    } catch {
      // Kullanıcı paylaşım sayfasını kapattı ya da tarayıcı reddetti.
    }
  }

  async function handleAccessChange(next: Access) {
    if (busy || next === access) return
    setAccess(next)
    if (next === "link" || !share) return
    // Paylaşım kapatılır. Daha gizli yöne gidiş olduğu için onay sorulmaz;
    // tekrar paylaşmak yeni bir bağlantı üretir.
    setBusy("revoke")
    try {
      const res = await unshareConversation(conversationId)
      if (!res.ok) {
        setAccess("link")
        toast.error(ERROR_TEXT[res.error])
        return
      }
      setState((s) => (s ? { ...s, share: null } : s))
      toast.success("Paylaşım kapatıldı. Bağlantı artık açılmıyor.")
    } catch {
      setAccess("link")
      toast.error(ERROR_TEXT.failed)
    } finally {
      setBusy(null)
    }
  }

  async function handleAnonymousChange(next: boolean) {
    if (busy) return
    setAnonymous(next)
    if (!share) return
    // Var olan bağlantıda ad anında gizlenir/gösterilir; kopyaya dokunulmaz.
    setBusy("anonymous")
    try {
      const res = await setConversationShareAnonymous({
        conversationId,
        anonymous: next,
      })
      if (!res.ok) {
        setAnonymous(!next)
        toast.error(ERROR_TEXT[res.error])
        return
      }
      writePref(ANON_PREF_KEY, next)
      setState((s) =>
        s?.share ? { ...s, share: { ...s.share, anonymous: next } } : s
      )
    } catch {
      setAnonymous(!next)
      toast.error(ERROR_TEXT.failed)
    } finally {
      setBusy(null)
    }
  }

  async function handleHideImagesChange(next: boolean) {
    if (busy) return
    setHideImages(next)
    if (!share) return
    // Var olan bağlantıda görseller anında gizlenir/gösterilir; kopyaya
    // dokunulmaz (görsel numaraları kopyada hep durur).
    setBusy("images")
    try {
      const res = await setConversationShareHideImages({
        conversationId,
        hideImages: next,
      })
      if (!res.ok) {
        setHideImages(!next)
        toast.error(ERROR_TEXT[res.error])
        return
      }
      writePref(HIDE_IMAGES_PREF_KEY, next)
      setState((s) =>
        s?.share ? { ...s, share: { ...s.share, hideImages: next } } : s
      )
    } catch {
      setHideImages(!next)
      toast.error(ERROR_TEXT.failed)
    } finally {
      setBusy(null)
    }
  }

  if (loadError) {
    return (
      <ResponsiveDialogBody>
        <p role="alert" className="text-sm text-destructive">
          {ERROR_TEXT[loadError]}
        </p>
      </ResponsiveDialogBody>
    )
  }

  if (!state) {
    return (
      <ResponsiveDialogBody>
        <div className="grid gap-4" aria-busy="true">
          <Skeleton className="h-[4.5rem] rounded-xl" />
          <Skeleton className="h-[6.5rem] rounded-xl" />
          <Skeleton className="h-9 rounded-lg" />
        </div>
      </ResponsiveDialogBody>
    )
  }

  const stale = !!share?.stale
  // Var olan, güncel bağlantıyı kopyalamak sunucuya gitmez; yanıt akarken de
  // serbest. Oluşturma/güncelleme kopyayı alır, akış bitmeden yapılmaz.
  const needsServer = !share || stale
  const primaryLabel =
    streaming && needsServer
      ? "Yanıt tamamlanınca paylaşabilirsin"
      : stale
        ? "Güncelle ve kopyala"
        : "Bağlantıyı kopyala"

  return (
    // Drawer'ın yüksekliği ekranın %80'iyle sınırlı; küçük telefonda içerik
    // kendi içinde kayar. Masaüstünde gövde `contents`, sınıf etkisiz.
    <ResponsiveDialogBody className="overflow-y-auto">
      <div className="grid gap-4">
        <SharePreview
          title={title}
          author={anonymous ? null : state.authorName}
        />

        <section className="grid gap-2">
          <h3 className="text-xs font-medium text-muted-foreground">
            Kimler erişebilir
          </h3>
          <RadioGroupPrimitive.Root
            value={access}
            onValueChange={(v) => void handleAccessChange(v as Access)}
            aria-label="Kimler erişebilir"
            disabled={busy !== null}
            className="divide-y overflow-hidden rounded-xl border"
          >
            <AccessOption
              value="private"
              icon={RiLockLine}
              label="Yalnızca sen"
              busy={busy === "revoke"}
            />
            <AccessOption
              value="link"
              icon={RiGlobalLine}
              label="Bağlantıya sahip herkes"
            />
          </RadioGroupPrimitive.Root>
          {/* Yalnızca bağlantı paylaşımının alt seçeneği: kartın hemen altında,
              "Bağlantıya sahip herkes" seçiliyken. */}
          {access === "link" ? (
            <div className="grid gap-2.5 px-1 pt-1">
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id={anonId}
                  checked={anonymous}
                  onCheckedChange={(v) =>
                    void handleAnonymousChange(v === true)
                  }
                  disabled={busy !== null}
                />
                <label htmlFor={anonId} className="text-sm font-medium">
                  Anonim olarak paylaş
                </label>
              </div>
              {/* Yalnız görsel içeren sohbette: görselsizde seçeneğin
                  etkisi olmazdı. */}
              {state.hasImages ? (
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id={hideImagesId}
                    checked={hideImages}
                    onCheckedChange={(v) =>
                      void handleHideImagesChange(v === true)
                    }
                    disabled={busy !== null}
                  />
                  <label htmlFor={hideImagesId} className="text-sm font-medium">
                    Resimleri gizle
                  </label>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        {access === "link" ? (
          <>
            {url ? (
              <InputGroup>
                <InputGroupInput
                  readOnly
                  value={url}
                  aria-label="Paylaşım bağlantısı"
                  onFocus={(e) => e.currentTarget.select()}
                  className="text-xs md:text-xs"
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label="Bağlantıyı kopyala"
                    onClick={() => void handleCopy()}
                  >
                    {copied ? <RiCheckLine /> : <RiFileCopyLine />}
                  </InputGroupButton>
                  <InputGroupButton size="icon-xs" asChild>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Paylaşılan sayfayı aç"
                    >
                      <RiExternalLinkLine />
                    </a>
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            ) : null}

            {stale ? (
              <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                Paylaştıktan sonra sohbet değişti. Bağlantı hâlâ{" "}
                {dateFormat.format(new Date(share!.sharedAt))} tarihli hâlini
                gösteriyor.
              </p>
            ) : null}
          </>
        ) : null}

        <div className="flex gap-2">
          <Button
            variant="default"
            size="lg"
            className="flex-1"
            disabled={
              access !== "link" || busy !== null || (needsServer && streaming)
            }
            onClick={() =>
              needsServer ? void handleShare() : void handleCopy()
            }
          >
            {busy === "share" ? <Spinner data-icon="inline-start" /> : null}
            {share && !stale && copied ? (
              <>
                <RiCheckLine data-icon="inline-start" />
                Kopyalandı
              </>
            ) : (
              primaryLabel
            )}
          </Button>
          {canNativeShare && share && !stale ? (
            <Button
              variant="outline"
              size="icon-lg"
              aria-label="Paylaş"
              onClick={() => void handleNativeShare()}
            >
              <RiShareForwardLine />
            </Button>
          ) : null}
        </div>
      </div>
    </ResponsiveDialogBody>
  )
}

function AccessOption({
  value,
  icon: Icon,
  label,
  busy = false,
}: {
  value: Access
  icon: RemixiconComponentType
  label: string
  busy?: boolean
}) {
  return (
    <RadioGroupPrimitive.Item
      value={value}
      className={cn(
        "group/access flex w-full items-center gap-3 px-3 py-3 text-left text-sm transition-colors outline-none",
        "hover:bg-foreground/4 focus-visible:bg-foreground/6 disabled:cursor-not-allowed",
        "data-[state=checked]:text-primary dark:data-[state=checked]:text-foreground"
      )}
    >
      <Icon aria-hidden className="size-4 shrink-0 opacity-80" />
      <span className="flex-1 font-medium">{label}</span>
      {busy ? (
        <Spinner className="size-4" />
      ) : (
        <RadioGroupPrimitive.Indicator className="flex">
          <RiCheckLine aria-hidden="true" className="size-4" />
        </RadioGroupPrimitive.Indicator>
      )}
    </RadioGroupPrimitive.Item>
  )
}

/** Paylaşılan sayfanın başlığının önizlemesi: başkaları ne görecek. */
function SharePreview({
  title,
  author,
}: {
  title: string
  author: string | null
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
      <div className="grid min-w-0 flex-1 gap-0.5">
        <span className="line-clamp-2 text-sm font-medium">{title}</span>
        <span className="truncate text-xs text-muted-foreground">
          {author ?? "Anonim"}
        </span>
      </div>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground">
        <RiChat3Line aria-hidden="true" className="size-5" />
      </div>
    </div>
  )
}
