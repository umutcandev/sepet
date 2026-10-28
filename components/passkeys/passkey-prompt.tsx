"use client"

import * as React from "react"
import {
  RiCheckLine,
  RiFingerprintLine,
  RiFlashlightLine,
  RiLoopRightLine,
  RiShieldCheckLine,
} from "@remixicon/react"
import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
} from "@simplewebauthn/browser"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { FormError } from "@/components/ui/form-error"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { useCurrentUser } from "@/components/providers/session-provider"
import { SudoDialog } from "@/components/settings/account/sudo-dialog"
import { usePasskeyRegistration } from "@/components/passkeys/use-passkey-registration"
import {
  getPasskeyStateAction,
  type ReauthMethods,
} from "@/lib/actions/passkeys"
import { isRpIdValidForHost } from "@/lib/auth/webauthn-config"
import { passkeysUsableHere } from "@/lib/auth/passkey-availability"

// "Şimdi değil" sonrası aynı cihazda tekrar sorulmayacak süre.
const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000
const DISMISSED_KEY = "sepet:passkey-prompt:dismissed-at:v1"
// Tarayıcı oturumu başına en fazla bir kez (tam yenilemede tekrar çıkmasın).
const SEEN_KEY = "sepet:passkey-prompt:seen:v1"
// Sayfa ve toast'lar otursun, öneri girişin hemen üstüne binmesin.
const SHOW_DELAY_MS = 1200

function readStorage(storage: "local" | "session", key: string) {
  try {
    return (storage === "local" ? localStorage : sessionStorage).getItem(key)
  } catch {
    return null
  }
}

function writeStorage(
  storage: "local" | "session",
  key: string,
  value: string
) {
  try {
    ;(storage === "local" ? localStorage : sessionStorage).setItem(key, value)
  } catch {
    // Erişim yoksa (gizli mod vb.) öneri bir sonraki oturumda yeniden çıkar.
  }
}

function recentlyDismissed(): boolean {
  const at = Number(readStorage("local", DISMISSED_KEY))
  return Number.isFinite(at) && at > 0 && Date.now() - at < COOLDOWN_MS
}

/**
 * Geçiş anahtarı olmayan kullanıcıya oluşturma önerisi (giriş sonrası "upgrade"
 * akışı). OnboardingHost ile aynı kalıp: kapı sağlanana dek hiç mount edilmez;
 * onboarding bitmeden çıkmaz ki iki modal üst üste binmesin.
 *
 * Yalnız cihazda biyometri/ekran kilidi olan bir platform doğrulayıcı varsa
 * önerilir (Touch ID, Face ID, Windows Hello, Android) — tek dokunuşla oluşan
 * anahtar ancak orada gerçekten "şifresiz" hissettirir.
 */
export function PasskeyPromptHost() {
  const { user } = useCurrentUser()
  if (!user || user.onboardingCompletedAt === null) return null
  return <PasskeyPrompt />
}

function PasskeyPrompt() {
  const [open, setOpen] = React.useState(false)
  const [step, setStep] = React.useState<"intro" | "done">("intro")
  const [sudo, setSudo] = React.useState(false)
  const [reauth, setReauth] = React.useState<ReauthMethods | null>(null)
  const [sudoOpen, setSudoOpen] = React.useState(false)

  const registration = usePasskeyRegistration({
    onCreated: () => setStep("done"),
    onSudoRequired: () => {
      setSudo(false)
      setOpen(false)
      setSudoOpen(true)
    },
  })
  const { prepare } = registration

  React.useEffect(() => {
    if (!browserSupportsWebAuthn() || !passkeysUsableHere()) return
    if (readStorage("session", SEEN_KEY) || recentlyDismissed()) return
    let active = true
    let timer: number | undefined

    void (async () => {
      const platform = await platformAuthenticatorIsAvailable().catch(
        () => false
      )
      if (!active || !platform) return
      // Sonuç ne olursa olsun bu tarayıcı oturumunda bir kez sorulur: anahtarı
      // olan kullanıcıda her tam yüklemede sunucuya gidilmesin.
      writeStorage("session", SEEN_KEY, "1")
      const state = await getPasskeyStateAction().catch(() => null)
      if (!active || !state?.enabled || state.passkeys.length > 0) return
      if (!isRpIdValidForHost(state.rpID, window.location.hostname)) return

      setReauth(state.reauth)
      setSudo(state.sudo)
      // Giriş yeni yapıldıysa sudo açık: seçenekler önceden hazır olsun ki
      // "Oluştur" tek dokunuşla tarayıcı penceresini açsın.
      if (state.sudo) void prepare()
      timer = window.setTimeout(() => {
        if (active) setOpen(true)
      }, SHOW_DELAY_MS)
    })()

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [prepare])

  function dismiss() {
    if (step === "intro")
      writeStorage("local", DISMISSED_KEY, String(Date.now()))
    setOpen(false)
  }

  function create() {
    if (registration.ready) {
      registration.create()
      return
    }
    if (!sudo) {
      setOpen(false)
      setSudoOpen(true)
      return
    }
    void prepare()
  }

  return (
    <>
      <PasskeyPromptDialog
        open={open}
        onOpenChange={(next) => {
          if (!next) dismiss()
        }}
        step={step}
        busy={registration.busy}
        preparing={registration.preparing}
        error={registration.error}
        onCreate={create}
        onDismiss={dismiss}
        onDone={() => setOpen(false)}
      />
      {reauth ? (
        <SudoDialog
          open={sudoOpen}
          onOpenChange={setSudoOpen}
          methods={reauth}
          onVerified={() => {
            setSudo(true)
            setSudoOpen(false)
            setOpen(true)
            void prepare()
          }}
        />
      ) : null}
    </>
  )
}

type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  step: "intro" | "done"
  /** Tarayıcı penceresi açık / kayıt doğrulanıyor. */
  busy: boolean
  /** Seçenekler çekiliyor: "Oluştur" bekler, "Şimdi değil" serbest. */
  preparing: boolean
  error: string
  onCreate: () => void
  onDismiss: () => void
  onDone: () => void
}

const BENEFITS = [
  {
    icon: RiFlashlightLine,
    title: "Saniyeler içinde giriş",
    text: "Şifre yazmak ya da doğrulama kodu beklemek yok.",
  },
  {
    icon: RiShieldCheckLine,
    title: "Daha güvenli",
    text: "Sahte sitelerde çalışmaz, sızdırılabilecek bir şifre de yok.",
  },
  {
    icon: RiLoopRightLine,
    title: "Tüm cihazlarında",
    text: "iCloud Anahtar Zinciri ya da Google Şifre Yöneticisi ile senkronize olur.",
  },
] as const

// Saf görünüm: durum ve eylemler PasskeyPrompt'tan gelir.
export function PasskeyPromptDialog({
  open,
  onOpenChange,
  step,
  busy,
  preparing,
  error,
  onCreate,
  onDismiss,
  onDone,
}: DialogProps) {
  const done = step === "done"
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-[400px]">
        {/* Drawer'ın (mobil) iç dolgusu yok; Dialog'unki (masaüstü) var. */}
        <div className="flex flex-col gap-6 px-5 pt-2 pb-[max(env(safe-area-inset-bottom),1.25rem)] md:px-0 md:pt-4 md:pb-0">
          <div className="flex flex-col items-center text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {done ? (
                <RiCheckLine className="size-7" />
              ) : (
                <RiFingerprintLine className="size-7" />
              )}
            </span>
            <ResponsiveDialogTitle className="mt-4 text-lg font-medium tracking-[-0.01em]">
              {done ? "Geçiş anahtarın hazır" : "Şifresiz giriş yap"}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="mt-1.5 max-w-[300px] text-sm leading-[1.45]">
              {done
                ? "Bir dahaki girişte “Geçiş anahtarı ile devam et”i seç ya da e-posta alanına dokun; şifre gerekmez."
                : "Bir geçiş anahtarı oluştur; bir dahaki girişte parmak izin, yüzün ya da ekran kilidin yeterli."}
            </ResponsiveDialogDescription>
          </div>

          {done ? null : (
            <ul className="flex flex-col gap-3.5">
              {BENEFITS.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                    <Icon className="size-4" />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{title}</span>
                    <span className="text-xs leading-[1.45] text-muted-foreground">
                      {text}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {error ? <FormError>{error}</FormError> : null}

          <div className="flex flex-col gap-2">
            {done ? (
              <Button
                variant="default"
                size="xl"
                className="w-full"
                onClick={onDone}
              >
                Tamam
              </Button>
            ) : (
              <>
                <Button
                  variant="default"
                  size="xl"
                  className="w-full"
                  disabled={busy || preparing}
                  onClick={onCreate}
                >
                  {busy || preparing ? <Spinner /> : null}
                  Geçiş anahtarı oluştur
                </Button>
                <Button
                  size="xl"
                  variant="ghost"
                  className="w-full"
                  disabled={busy}
                  onClick={onDismiss}
                >
                  Şimdi değil
                </Button>
              </>
            )}
          </div>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
