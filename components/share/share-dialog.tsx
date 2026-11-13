"use client"

import * as React from "react"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"
import {
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
import { Spinner } from "@/components/ui/spinner"
import { useMediaQuery } from "@/hooks/use-media-query"
import { copyText, copyTextWhenReady } from "@/lib/copy"
import type { ShareKind } from "@/lib/share/paths"
import {
  knownShareStatus,
  preloadShareIndex,
  rememberShareStatus,
} from "@/lib/share/share-index"
import type {
  ShareActionError,
  ShareInfo,
  ShareResult,
  ShareStatus,
} from "@/lib/share/types"
import { cn } from "@/lib/utils"

// Paylaşım penceresi: sohbet, sepet ve fiş ortak. Kaynağa özgü olan yalnız
// sunucu çağrıları (adapter) ve metinler (copy).

export type ShareDialogAdapter = {
  target: { kind: ShareKind; id: string }
  /** Arkadan tazeleme; durum bilinmiyorsa pencere bunu bekler. */
  status: () => Promise<ShareResult<{ status: ShareStatus }>>
  share: (opts: {
    anonymous: boolean
    hideImages: boolean
  }) => Promise<ShareResult<{ share: ShareInfo; created: boolean }>>
  setAnonymous: (
    anonymous: boolean
  ) => Promise<ShareResult<{ anonymous: boolean }>>
  setHideImages: (
    hideImages: boolean
  ) => Promise<ShareResult<{ hideImages: boolean }>>
  revoke: () => Promise<ShareResult<object>>
  /** token → paylaşılan sayfanın yolu. */
  path: (token: string) => string
}

export type ShareDialogCopy = {
  title: string
  description: string
  /** Kaynağa özgü hata metinleri (not_found, empty, too_large, unsupported). */
  errors: Partial<Record<ShareActionError, string>>
  hideImagesLabel: string
  /** false: görsel her yeni paylaşımda gizli başlar, son seçim hatırlanmaz. */
  rememberImageChoice: boolean
  icon: RemixiconComponentType
}

const ERROR_TEXT: Record<ShareActionError, string> = {
  unauthorized: "Oturumun sona ermiş. Tekrar giriş yapıp dener misin?",
  not_found: "Bulunamadı.",
  empty: "Paylaşılacak bir içerik yok.",
  too_large: "Paylaşmak için çok büyük.",
  unsupported: "Bu içerik paylaşılamıyor.",
  rate_limited: "Çok hızlı denedin. Biraz bekleyip tekrar dener misin?",
  failed: "Paylaşım şu an yapılamadı. Lütfen tekrar dene.",
}

// Yeni paylaşımda anahtarların başlangıcı: bu cihazdaki son seçim. Görseller
// varsayılan gizli; fiş fotoğrafında ad, adres ya da kart numarası olabilir.
const ANON_PREF_KEY = "sepet:share-anonymous"
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

// Yeni paylaşımda bu cihazdaki son seçim, var olanda bağlantınınki.
function startAnonymous(share: ShareInfo | null): boolean {
  return share ? share.anonymous : readPref(ANON_PREF_KEY, false)
}

function startHideImages(share: ShareInfo | null, remember: boolean): boolean {
  if (share) return share.hideImages
  return remember ? readPref(HIDE_IMAGES_PREF_KEY, true) : true
}

type Access = "private" | "link"
type Busy = "share" | "anonymous" | "images" | "revoke" | null

export function ShareDialog({
  open,
  onOpenChange,
  title,
  adapter,
  copy,
  hasImages,
  blockedLabel = null,
  initialStatus,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** Kimliği kaynak değişince değişmeli (useMemo). */
  adapter: ShareDialogAdapter
  copy: ShareDialogCopy
  /** "Resimleri gizle" yalnız o zaman. */
  hasImages: boolean
  /** Doluysa kopya alınamaz (ör. yanıt akarken); buton bu metni gösterir. */
  blockedLabel?: string | null
  /** Sunucuda okunmuş durum; indeks henüz yüklenmemişse kullanılır. */
  initialStatus?: ShareStatus
}) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{copy.title}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {copy.description}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        {/* İçerik her açılışta baştan kurulur, yarım kalan seçim taşınmaz. */}
        {open ? (
          <SharePanel
            title={title}
            adapter={adapter}
            copy={copy}
            hasImages={hasImages}
            blockedLabel={blockedLabel}
            initialStatus={initialStatus}
          />
        ) : null}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

function SharePanel({
  title,
  adapter,
  copy,
  hasImages,
  blockedLabel,
  initialStatus,
}: {
  title: string
  adapter: ShareDialogAdapter
  copy: ShareDialogCopy
  hasImages: boolean
  blockedLabel: string | null
  initialStatus: ShareStatus | undefined
}) {
  const { kind, id } = adapter.target
  const rememberImages = copy.rememberImageChoice
  const [initial] = React.useState(
    () => knownShareStatus(kind, id) ?? initialStatus
  )
  const [status, setStatus] = React.useState<ShareStatus>(
    () => initial ?? { authorName: null, share: null }
  )
  const [ready, setReady] = React.useState(!!initial)
  const [loadError, setLoadError] = React.useState<ShareActionError | null>(
    null
  )
  const [access, setAccess] = React.useState<Access>(
    initial?.share ? "link" : "private"
  )
  const [anonymous, setAnonymous] = React.useState(() =>
    initial ? startAnonymous(initial.share) : false
  )
  const [hideImages, setHideImages] = React.useState(() =>
    initial ? startHideImages(initial.share, rememberImages) : true
  )
  const [busy, setBusy] = React.useState<Busy>(null)
  const [copied, setCopied] = React.useState(false)
  // Tazelenen durum, kullanıcının bu arada yaptığı seçimi ezmesin.
  const touched = React.useRef(false)
  // Kopya bu açılışta bir kez şimdiki hâle getirilir.
  const synced = React.useRef(false)
  const anonId = React.useId()
  const hideImagesId = React.useId()

  const blocked = blockedLabel !== null
  const touch = useMediaQuery("(pointer: coarse)")
  const canNativeShare =
    touch && typeof navigator !== "undefined" && "share" in navigator

  const errorText = (error: ShareActionError) =>
    copy.errors[error] ?? ERROR_TEXT[error]
  const shareUrl = (token: string) =>
    `${window.location.origin}${adapter.path(token)}`

  React.useEffect(() => {
    let cancelled = false
    const known = !!initial
    void preloadShareIndex()
    adapter
      .status()
      .then((res) => {
        if (cancelled) return
        if (!res.ok) {
          if (!known || res.error === "not_found") setLoadError(res.error)
          return
        }
        setReady(true)
        if (touched.current) return
        const { share } = res.status
        setStatus(res.status)
        setAccess(share ? "link" : "private")
        setAnonymous(startAnonymous(share))
        setHideImages(startHideImages(share, rememberImages))
      })
      .catch(() => {
        // Elde durum varsa pencere çalışmaya devam eder.
        if (!cancelled && !known) setLoadError("failed")
      })
    return () => {
      cancelled = true
    }
  }, [adapter, initial, rememberImages])

  React.useEffect(() => {
    if (ready) rememberShareStatus(kind, id, status)
  }, [ready, kind, id, status])

  React.useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(t)
  }, [copied])

  const share = status.share
  const url = share ? shareUrl(share.token) : null

  function applyShare(next: ShareInfo) {
    setStatus((s) => ({ ...s, share: next }))
    setHideImages(next.hideImages)
  }

  async function handleShare() {
    if (busy || blocked) return
    touched.current = true
    setBusy("share")
    const request = adapter.share({ anonymous, hideImages })
    // Pano yazımı tıklama anında başlar, bağlantı sunucudan gelince dolar.
    const copying = copyTextWhenReady(
      request.then((res) => (res.ok ? shareUrl(res.share.token) : null))
    )
    try {
      const res = await request
      if (!res.ok) {
        toast.error(errorText(res.error))
        return
      }
      synced.current = true
      applyShare(res.share)
      writePref(ANON_PREF_KEY, anonymous)
      if (hasImages && rememberImages) {
        writePref(HIDE_IMAGES_PREF_KEY, hideImages)
      }
      const ok = await copying
      if (ok) setCopied(true)
      toast.success(
        ok ? "Bağlantı oluşturuldu ve kopyalandı." : "Bağlantı oluşturuldu."
      )
    } catch {
      toast.error(ERROR_TEXT.failed)
    } finally {
      setBusy(null)
    }
  }

  // Kopyalanan bağlantı her zaman şimdiki hâli göstersin: kopya arkada
  // güncellenir, token değişmez. Yanıt akarken yarım tur yakalanmasın diye atlanır.
  async function syncCopy() {
    if (blocked || synced.current) return
    synced.current = true
    try {
      const res = await adapter.share({ anonymous, hideImages })
      if (!res.ok) {
        synced.current = false
        toast.warning(
          "Paylaşılan sayfa güncellenemedi; bağlantı önceki hâlini gösteriyor."
        )
        return
      }
      applyShare(res.share)
      if (res.created) {
        // Bağlantı başka yerden kaldırılmıştı; kopyalanan adres açılmıyor.
        const ok = await copyText(shareUrl(res.share.token))
        toast.warning(
          ok
            ? "Önceki bağlantı kaldırılmıştı; yeni bağlantı oluşturulup kopyalandı."
            : "Önceki bağlantı kaldırılmıştı; yeni bağlantıyı alandan kopyalayabilirsin."
        )
      }
    } catch {
      synced.current = false
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
    void syncCopy()
  }

  async function handleNativeShare() {
    if (!url) return
    void syncCopy()
    try {
      await navigator.share({ title, url })
    } catch {
      // Kullanıcı paylaşım sayfasını kapattı ya da tarayıcı reddetti.
    }
  }

  async function handleAccessChange(next: Access) {
    if (!ready || busy || next === access) return
    touched.current = true
    setAccess(next)
    if (next === "link" || !share) return
    // Daha gizli yöne gidiş: onay sorulmaz, anında görünür; tekrar paylaşmak
    // yeni bağlantı üretir.
    setStatus((s) => ({ ...s, share: null }))
    setBusy("revoke")
    try {
      const res = await adapter.revoke()
      if (!res.ok) throw new Error(res.error)
      toast.success("Paylaşım kapatıldı. Bağlantı artık açılmıyor.")
    } catch {
      setAccess("link")
      setStatus((s) => ({ ...s, share }))
      toast.error(ERROR_TEXT.failed)
    } finally {
      setBusy(null)
    }
  }

  async function handleAnonymousChange(next: boolean) {
    if (busy) return
    touched.current = true
    setAnonymous(next)
    if (!share) return
    // Var olan bağlantıda ad anında gizlenir/gösterilir; kopyaya dokunulmaz.
    setBusy("anonymous")
    try {
      const res = await adapter.setAnonymous(next)
      if (!res.ok) {
        setAnonymous(!next)
        toast.error(errorText(res.error))
        return
      }
      writePref(ANON_PREF_KEY, next)
      setStatus((s) =>
        s.share ? { ...s, share: { ...s.share, anonymous: next } } : s
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
    touched.current = true
    setHideImages(next)
    if (!share) return
    // Var olan bağlantıda görseller anında gizlenir/gösterilir.
    setBusy("images")
    try {
      const res = await adapter.setHideImages(next)
      if (!res.ok) {
        setHideImages(!next)
        toast.error(errorText(res.error))
        return
      }
      if (rememberImages) writePref(HIDE_IMAGES_PREF_KEY, next)
      setStatus((s) =>
        s.share ? { ...s, share: { ...s.share, hideImages: next } } : s
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
          {errorText(loadError)}
        </p>
      </ResponsiveDialogBody>
    )
  }

  // Var olan bağlantıyı kopyalamak sunucuyu beklemez; engelliyken de serbest.
  const primaryLabel =
    blocked && !share ? blockedLabel : "Bağlantıyı kopyala"

  return (
    // Drawer'ın yüksekliği ekranın %80'iyle sınırlı; küçük telefonda içerik
    // kendi içinde kayar. Masaüstünde gövde `contents`, sınıf etkisiz.
    <ResponsiveDialogBody className="overflow-y-auto">
      <div className="grid gap-4" aria-busy={!ready}>
        <SharePreview
          title={title}
          author={!ready ? undefined : anonymous ? null : status.authorName}
          icon={copy.icon}
        />

        <section className="grid gap-2">
          <h3 className="text-xs font-medium text-muted-foreground">
            Kimler erişebilir
          </h3>
          {/* Durum bilinmeden seçim yok: "Yalnızca sen" yanlış olabilir. */}
          <RadioGroupPrimitive.Root
            value={ready ? access : ""}
            onValueChange={(v) => void handleAccessChange(v as Access)}
            aria-label="Kimler erişebilir"
            disabled={!ready || busy !== null}
            className="divide-y overflow-hidden rounded-xl smooth-shadow-ring-xs"
          >
            <AccessOption value="private" icon={RiLockLine} label="Yalnızca sen" />
            <AccessOption
              value="link"
              icon={RiGlobalLine}
              label="Bağlantıya sahip herkes"
            />
          </RadioGroupPrimitive.Root>
          {ready && access === "link" ? (
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
              {hasImages ? (
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
                    {copy.hideImagesLabel}
                  </label>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        {ready && access === "link" && url ? (
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
                  onClick={() => void syncCopy()}
                >
                  <RiExternalLinkLine />
                </a>
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        ) : null}

        <div className="flex gap-2">
          <Button
            variant="default"
            size="lg"
            className="flex-1"
            disabled={
              !ready ||
              access !== "link" ||
              busy !== null ||
              (!share && blocked)
            }
            onClick={() => (share ? void handleCopy() : void handleShare())}
          >
            {!ready || busy === "share" ? (
              <Spinner data-icon="inline-start" />
            ) : null}
            {share && copied ? (
              <>
                <RiCheckLine data-icon="inline-start" />
                Kopyalandı
              </>
            ) : (
              primaryLabel
            )}
          </Button>
          {canNativeShare && share ? (
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
}: {
  value: Access
  icon: RemixiconComponentType
  label: string
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
      <RadioGroupPrimitive.Indicator className="flex">
        <RiCheckLine aria-hidden="true" className="size-4" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}

/** Paylaşılan sayfanın başlığının önizlemesi: başkaları ne görecek. */
function SharePreview({
  title,
  author,
  icon: Icon,
}: {
  title: string
  /** undefined: henüz bilinmiyor; satır yerini korur. */
  author: string | null | undefined
  icon: RemixiconComponentType
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
      <div className="grid min-w-0 flex-1 gap-0.5">
        <span className="line-clamp-2 text-sm font-medium">{title}</span>
        <span className="truncate text-xs text-muted-foreground">
          {author === undefined ? " " : (author ?? "Anonim")}
        </span>
      </div>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground smooth-shadow-ring-xs">
        <Icon aria-hidden="true" className="size-5" />
      </div>
    </div>
  )
}
