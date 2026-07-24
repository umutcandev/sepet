"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeftIcon, ArrowUpRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/auth/password-input"
import { Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { OtpField } from "@/components/auth/otp-field"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  LEGAL_LAST_UPDATED,
  PrivacyContent,
  TermsContent,
} from "@/components/legal/legal-content"
import { toast } from "sonner"

import { signInWithGoogleAction } from "@/lib/actions/auth"
import { sessionSnapshot } from "@/lib/auth/session-snapshot"
import {
  getLastLoginMethod,
  setLastLoginMethod,
  type LastLoginMethod,
} from "@/lib/auth/last-login-method"
import {
  registerAction,
  loginAction,
  verifySignupAction,
  resendSignupCodeAction,
  verifyTwoFactorAction,
} from "@/lib/actions/credentials-auth"
import { forgotPasswordAction } from "@/lib/actions/password"

// Sekiz aşamalı durum makinesi. Paylaşılan email/password/pendingToken state'i
// aşamalar arası taşınır. forgot* aşamaları Faz 6'da, two-factor/recovery Faz 7'de
// eklenir (aşağıdaki switch'e case eklenerek).
type Stage =
  | "method"
  | "email-login"
  | "register"
  | "verify-email"
  | "two-factor"
  | "recovery"
  | "forgot"
  | "forgot-sent"

type Props = {
  callbackUrl?: string
}

function stageHeader(
  stage: Stage,
  email: string,
): { title: string; subtitle: string } {
  switch (stage) {
    case "method":
      return {
        title: "Oturum Açın",
        subtitle: "Ne alacağını yaz, Sepet'in için en ucuz marketi bulalım.",
      }
    case "email-login":
      return {
        title: "E-posta ile devam et",
        subtitle: "Hesabına e-posta ve şifrenle giriş yap.",
      }
    case "register":
      return {
        title: "Hesap oluştur",
        subtitle: "E-posta ve şifrenle saniyeler içinde başla.",
      }
    case "verify-email":
      return {
        title: "E-postanı doğrula",
        subtitle: email
          ? `${email} adresine gönderdiğimiz 6 haneli kodu gir.`
          : "Sana gönderdiğimiz 6 haneli kodu gir.",
      }
    case "two-factor":
      return {
        title: "İki adımlı doğrulama",
        subtitle: "Doğrulama uygulamandaki 6 haneli kodu gir.",
      }
    case "recovery":
      return {
        title: "Kurtarma kodu",
        subtitle: "Kurtarma kodlarından birini gir.",
      }
    case "forgot":
      return {
        title: "Şifreni sıfırla",
        subtitle: "E-postanı gir, sana bir sıfırlama bağlantısı gönderelim.",
      }
    case "forgot-sent":
      return {
        title: "E-postanı kontrol et",
        subtitle: email
          ? `${email} adresine bir sıfırlama bağlantısı gönderdik. Yeni şifreni oradaki bağlantıdan belirle.`
          : "Sana bir sıfırlama bağlantısı gönderdik. Yeni şifreni oradaki bağlantıdan belirle.",
      }
  }
}

// Geri butonu hedefi (method'ta yok).
function backTarget(stage: Stage): Stage | null {
  switch (stage) {
    case "method":
      return null
    case "email-login":
    case "register":
      return "method"
    case "verify-email":
      return "register"
    case "two-factor":
    case "forgot":
      return "email-login"
    case "recovery":
      return "two-factor"
    case "forgot-sent":
      return "email-login"
  }
}

export function LoginForm({ callbackUrl }: Props) {
  const [stage, setStage] = React.useState<Stage>("method")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [otp, setOtp] = React.useState("")
  const [pendingToken, setPendingToken] = React.useState("")
  const [recoveryCode, setRecoveryCode] = React.useState("")
  const [error, setError] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [resendIn, setResendIn] = React.useState(0)
  // "Son kullanılan" rozeti. Lazy initializer güvenli: dialog içeriği yalnız
  // istemcide (kullanıcı açınca) mount olur, SSR/hidrasyon uyuşmazlığı olamaz;
  // getLastLoginMethod window yokken zaten null döner.
  const [lastMethod] = React.useState<LastLoginMethod | null>(() =>
    getLastLoginMethod(),
  )

  const { title, subtitle } = stageHeader(stage, email)
  const back = backTarget(stage)

  // "Kodu tekrar gönder" geri sayımı.
  React.useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  function goStage(next: Stage) {
    setError("")
    setOtp("")
    setRecoveryCode("")
    setStage(next)
  }

  // Başarılı girişte OAuth dönüşünü aynalayan tam navigasyon (fresh session).
  // markPending: navigasyon sonrası ilk boyamada iyimser "authed" ipucu — Google
  // akışıyla aynı; /api/me gerçeği yazana dek avatar skeleton'ı gösterilir.
  function completeLogin(target: string) {
    setLastLoginMethod("email")
    sessionSnapshot.markPending()
    window.location.assign(target)
  }

  // loginAction sonucunu işler: 2FA istiyorsa aşamaya geç, değilse yönlendir.
  function handleLoginResult(
    res: Awaited<ReturnType<typeof loginAction>>,
  ): boolean {
    if (res.ok && res.twoFactor) {
      setPendingToken(res.pendingToken)
      setBusy(false)
      goStage("two-factor")
      return true
    }
    if (res.ok) {
      completeLogin(res.callbackUrl)
      return true // busy kalır; sayfa yönleniyor
    }
    // pending_login süresi doldu/tüketildi: 2FA aşamasında sıkışmak yerine
    // kullanıcıyı girişe döndür (token bir daha işe yaramaz).
    if (res.code === "pending_expired") {
      setBusy(false)
      setPendingToken("")
      toast.error(res.error)
      goStage("email-login")
      return false
    }
    setBusy(false)
    setError(res.error)
    return false
  }

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setBusy(true)
    const res = await loginAction({ email, password, callbackUrl })
    handleLoginResult(res)
  }

  async function submitRegister(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (password !== confirmPassword) {
      setError("Şifreler eşleşmiyor.")
      return
    }
    setBusy(true)
    const res = await registerAction({ email, password })
    setBusy(false)
    if (res.ok) {
      setResendIn(30)
      goStage("verify-email")
    } else {
      setError(res.error)
    }
  }

  async function submitVerify(codeValue?: string) {
    const code = codeValue ?? otp
    if (code.length !== 6 || busy) return
    setError("")
    setBusy(true)
    const res = await verifySignupAction({ email, code })
    if (!res.ok) {
      setBusy(false)
      setError(res.error)
      setOtp("")
      return
    }
    // Doğrulama başarılı → tutulan bilgilerle otomatik giriş (yeniden yazmadan).
    const login = await loginAction({ email, password, callbackUrl })
    handleLoginResult(login)
  }

  async function resendCode() {
    if (resendIn > 0) return
    setError("")
    const res = await resendSignupCodeAction({ email })
    // Limit aşımında "gönderildi" yalanı söyleme: hatayı göster, sayacı başlatma.
    if (!res.ok) {
      setError(res.error)
      return
    }
    setResendIn(30)
  }

  async function submitForgot(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setBusy(true)
    const res = await forgotPasswordAction({ email })
    setBusy(false)
    // Limit aşımında "gönderdik" deme; hatayı göster ve aşamada kal.
    if (!res.ok) {
      setError(res.error)
      return
    }
    // Enumeration yok: kayıtlı olsun olmasın aynı bilgi + onay aşaması.
    toast.message("Bu e-posta kayıtlıysa bir sıfırlama bağlantısı gönderdik.")
    goStage("forgot-sent")
  }

  async function resendReset() {
    setError("")
    const res = await forgotPasswordAction({ email })
    // Limit aşımında "gönderildi" yalanı söyleme.
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.message("Bağlantı tekrar gönderildi.")
  }

  async function submitTwoFactor(codeValue?: string) {
    const code = codeValue ?? otp
    if (code.length !== 6 || busy) return
    setError("")
    setBusy(true)
    const res = await verifyTwoFactorAction({
      pendingToken,
      code,
      isRecovery: false,
      callbackUrl,
    })
    if (!handleLoginResult(res)) setOtp("")
  }

  async function submitRecovery(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    const code = recoveryCode.trim()
    if (!code) {
      setError("Kurtarma kodunu gir.")
      return
    }
    setError("")
    setBusy(true)
    const res = await verifyTwoFactorAction({
      pendingToken,
      code,
      isRecovery: true,
      callbackUrl,
    })
    handleLoginResult(res)
  }

  return (
    // Dış sarmalayıcı dialog genişliğini kaplar; geri butonu buna göre
    // konumlanır ki sağdaki kapat (X) ile tam aynı hizada dursun. İçerik kartı
    // ise ayrı bir iç sarmalayıcıda 402px'te tutulur.
    <div className="relative flex w-full flex-col items-center">
      {back ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute top-3 left-3 z-10"
          aria-label="Geri"
          onClick={() => goStage(back)}
        >
          <ArrowLeftIcon />
        </Button>
      ) : null}

      {/* Mobil (tam ekran): sola hizalı, büyük başlık, küçük logo — auth sayfası
          hissi. Masaüstü (dialog kartı): mevcut ortalanmış düzen aynen. */}
      <div className="flex w-full max-w-[402px] flex-col items-start px-6 pt-16 pb-6 text-left md:items-center md:pt-12 md:text-center">
        <Image
          src="/brand/sepet-square-dark.webp"
          alt="Sepet"
          width={256}
          height={256}
          className="h-12 w-12 rounded-xl md:h-16 md:w-16 dark:hidden"
        />
        <Image
          src="/brand/sepet-square-light.webp"
          alt=""
          aria-hidden
          width={256}
          height={256}
          className="hidden h-12 w-12 rounded-xl md:h-16 md:w-16 dark:block"
        />

        <h1 className="mt-6 text-[28px] leading-tight font-semibold tracking-[-0.02em] text-foreground md:mt-5 md:text-[22px]">
          {title}
        </h1>
        <p className="mt-2 max-w-[320px] text-[14px] leading-[1.4] tracking-[-0.01em] text-muted-foreground md:max-w-[300px]">
          {subtitle}
        </p>

        <div className="mt-7 w-full">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={stage}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              {stage === "method" ? (
                <div className="flex w-full flex-col gap-3">
                  <form
                    className="relative"
                    action={async () => {
                      // OAuth dönüşündeki ilk boyama için iyimser "authed" ipucu
                      // (callback sonrası /api/me gerçeği yazana dek).
                      setLastLoginMethod("google")
                      sessionSnapshot.markPending()
                      await signInWithGoogleAction(callbackUrl)
                    }}
                  >
                    <Button
                      type="submit"
                      variant="outline"
                      size="lg"
                      className="h-[44px] w-full gap-2 rounded-xl px-[6px] text-[14px] font-medium tracking-[-0.01em]"
                    >
                      <span className="flex h-[20px] w-[20px] items-center justify-center rounded-full">
                        <GoogleIcon />
                      </span>
                      Google ile devam et
                    </Button>
                    {lastMethod === "google" ? <LastUsedBadge /> : null}
                  </form>

                  <div className="flex items-center gap-3" aria-hidden>
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-[12px] tracking-[-0.01em] text-muted-foreground/60">
                      veya
                    </span>
                    <span className="h-px flex-1 bg-border" />
                  </div>

                  {/* E-posta buraya girilir; paylaşılan `email` state'i sayesinde
                      giriş ve kayıt aşamalarına doldurulmuş olarak taşınır. */}
                  <form
                    className="flex w-full flex-col gap-2.5 text-left"
                    onSubmit={(e) => {
                      e.preventDefault()
                      goStage("email-login")
                    }}
                  >
                    <Input
                      id="method-email"
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      aria-label="E-posta adresin"
                      required
                      placeholder="E-posta adresin"
                      className="h-[44px] rounded-xl px-3"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <div className="relative">
                      <Button
                        type="submit"
                        size="lg"
                        className="h-[44px] w-full rounded-xl text-[14px] font-medium tracking-[-0.01em]"
                      >
                        E-posta ile devam et
                      </Button>
                      {lastMethod === "email" ? <LastUsedBadge /> : null}
                    </div>
                  </form>
                </div>
              ) : null}

              {stage === "email-login" ? (
                <form
                  className="flex w-full flex-col gap-3 text-left"
                  onSubmit={submitLogin}
                >
                  <Field>
                    <FieldLabel htmlFor="login-email">E-posta</FieldLabel>
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      required
                      autoFocus={!email}
                      className="h-[42px] rounded-xl px-3"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="login-password">Şifre</FieldLabel>
                    <PasswordInput
                      id="login-password"
                      name="password"
                      autoComplete="current-password"
                      required
                      autoFocus={!!email}
                      className="h-[42px] rounded-xl px-3"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </Field>
                  {error ? (
                    <p className="text-xs text-destructive">{error}</p>
                  ) : null}
                  <Button
                    type="submit"
                    size="lg"
                    disabled={busy}
                    className="mt-1 h-[44px] w-full gap-2 rounded-xl text-[14px] font-medium"
                  >
                    {busy ? <Spinner /> : null}
                    Giriş yap
                  </Button>
                  <div className="mt-1 flex flex-col items-center gap-1.5 text-[13px]">
                    <button
                      type="button"
                      className="text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
                      onClick={() => {
                        setPassword("")
                        setConfirmPassword("")
                        goStage("forgot")
                      }}
                    >
                      Şifreni mi unuttun?
                    </button>
                    <button
                      type="button"
                      className="text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
                      onClick={() => goStage("register")}
                    >
                      Hesabın yok mu? Kayıt ol
                    </button>
                  </div>
                </form>
              ) : null}

              {stage === "register" ? (
                <form
                  className="flex w-full flex-col gap-3 text-left"
                  onSubmit={submitRegister}
                >
                  <Field>
                    <FieldLabel htmlFor="reg-email">E-posta</FieldLabel>
                    <Input
                      id="reg-email"
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      required
                      className="h-[42px] rounded-xl px-3"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="reg-password">Şifre</FieldLabel>
                    <PasswordInput
                      id="reg-password"
                      name="new-password"
                      autoComplete="new-password"
                      required
                      autoFocus={!!email}
                      className="h-[42px] rounded-xl px-3"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="reg-password2">Şifre (tekrar)</FieldLabel>
                    <PasswordInput
                      id="reg-password2"
                      name="confirm-password"
                      autoComplete="new-password"
                      required
                      className="h-[42px] rounded-xl px-3"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </Field>
                  <p className="text-[11px] leading-[1.5] text-muted-foreground/70">
                    En az 8 karakter, bir harf ve bir rakam.
                  </p>
                  {error ? (
                    <p className="text-xs text-destructive">{error}</p>
                  ) : null}
                  <Button
                    type="submit"
                    size="lg"
                    disabled={busy}
                    className="mt-1 h-[44px] w-full gap-2 rounded-xl text-[14px] font-medium"
                  >
                    {busy ? <Spinner /> : null}
                    Devam et
                  </Button>
                  <button
                    type="button"
                    className="mt-1 text-center text-[13px] text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
                    onClick={() => goStage("email-login")}
                  >
                    Zaten hesabın var mı? Giriş yap
                  </button>
                </form>
              ) : null}

              {stage === "verify-email" ? (
                <div className="flex w-full flex-col items-center gap-4">
                  <OtpField
                    value={otp}
                    onChange={setOtp}
                    onComplete={(v) => submitVerify(v)}
                    disabled={busy}
                  />
                  {error ? (
                    <p className="text-xs text-destructive">{error}</p>
                  ) : null}
                  <Button
                    type="button"
                    size="lg"
                    disabled={busy || otp.length !== 6}
                    className="h-[44px] w-full gap-2 rounded-xl text-[14px] font-medium"
                    onClick={() => submitVerify()}
                  >
                    {busy ? <Spinner /> : null}
                    Doğrula
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={resendIn > 0}
                    onClick={resendCode}
                    className="text-[13px] text-muted-foreground"
                  >
                    {resendIn > 0
                      ? `Kodu tekrar gönder (${resendIn})`
                      : "Kodu tekrar gönder"}
                  </Button>
                </div>
              ) : null}

              {stage === "forgot" ? (
                <form
                  className="flex w-full flex-col gap-3 text-left"
                  onSubmit={submitForgot}
                >
                  <Field>
                    <FieldLabel htmlFor="forgot-email">E-posta</FieldLabel>
                    <Input
                      id="forgot-email"
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      required
                      className="h-[42px] rounded-xl px-3"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </Field>
                  {error ? (
                    <p className="text-xs text-destructive">{error}</p>
                  ) : null}
                  <Button
                    type="submit"
                    size="lg"
                    disabled={busy}
                    className="mt-1 h-[44px] w-full gap-2 rounded-xl text-[14px] font-medium"
                  >
                    {busy ? <Spinner /> : null}
                    Sıfırlama bağlantısı gönder
                  </Button>
                  <button
                    type="button"
                    className="mt-1 text-center text-[13px] text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
                    onClick={() => goStage("email-login")}
                  >
                    Girişe dön
                  </button>
                </form>
              ) : null}

              {stage === "forgot-sent" ? (
                <div className="flex w-full flex-col gap-4 text-left">
                  <p className="text-[13px] leading-[1.5] text-muted-foreground">
                    Bağlantı birkaç dakika içinde gelmezse spam klasörünü kontrol
                    et. Bağlantı 15 dakika geçerlidir.
                  </p>
                  <Button
                    type="button"
                    size="lg"
                    onClick={() => goStage("email-login")}
                    className="mt-1 h-[44px] w-full gap-2 rounded-xl text-[14px] font-medium"
                  >
                    Girişe dön
                  </Button>
                  <button
                    type="button"
                    className="text-center text-[13px] text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
                    onClick={resendReset}
                  >
                    Bağlantı gelmedi mi? Tekrar gönder
                  </button>
                </div>
              ) : null}

              {stage === "two-factor" ? (
                <div className="flex w-full flex-col items-center gap-4">
                  <OtpField
                    value={otp}
                    onChange={setOtp}
                    onComplete={(v) => submitTwoFactor(v)}
                    disabled={busy}
                  />
                  {error ? (
                    <p className="text-xs text-destructive">{error}</p>
                  ) : null}
                  <Button
                    type="button"
                    size="lg"
                    disabled={busy || otp.length !== 6}
                    className="h-[44px] w-full gap-2 rounded-xl text-[14px] font-medium"
                    onClick={() => submitTwoFactor()}
                  >
                    {busy ? <Spinner /> : null}
                    Doğrula
                  </Button>
                  <button
                    type="button"
                    className="text-[13px] text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
                    onClick={() => goStage("recovery")}
                  >
                    Kurtarma kodu kullan
                  </button>
                </div>
              ) : null}

              {stage === "recovery" ? (
                <form
                  className="flex w-full flex-col gap-3 text-left"
                  onSubmit={submitRecovery}
                >
                  <Field>
                    <FieldLabel htmlFor="recovery-code">Kurtarma kodu</FieldLabel>
                    <Input
                      id="recovery-code"
                      type="text"
                      autoComplete="one-time-code"
                      required
                      placeholder="XXXXX-XXXXX"
                      className="h-[42px] rounded-xl px-3 tracking-[0.1em]"
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value)}
                    />
                  </Field>
                  {error ? (
                    <p className="text-xs text-destructive">{error}</p>
                  ) : null}
                  <Button
                    type="submit"
                    size="lg"
                    disabled={busy}
                    className="mt-1 h-[44px] w-full gap-2 rounded-xl text-[14px] font-medium"
                  >
                    {busy ? <Spinner /> : null}
                    Doğrula
                  </Button>
                  <button
                    type="button"
                    className="text-center text-[13px] text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
                    onClick={() => goStage("two-factor")}
                  >
                    Doğrulama koduna dön
                  </button>
                </form>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>

        {stage === "method" ? (
          <p className="mt-3.5 text-[11px] leading-[1.5] tracking-[-0.005em] text-muted-foreground/60">
            Devam ederek <TermsDialog /> ve <PrivacyDialog />
            &apos;i kabul ediyorsun.
          </p>
        ) : null}
      </div>
    </div>
  )
}

// Method aşamasında son kullanılan yöntemin butonuna iliştirilen küçük rozet
// (buton kenarının üstüne taşar; tıklamayı engellemesin diye pointer-events-none).
function LastUsedBadge() {
  return (
    <span className="pointer-events-none absolute -top-2 right-3 z-10 rounded-full bg-primary px-2 py-0.5 text-[10px] leading-4 font-medium tracking-[-0.005em] text-primary-foreground ring-2 ring-background">
      Son kullanılan
    </span>
  )
}

function TermsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="underline underline-offset-2 transition-colors hover:text-foreground"
        >
          Şartlar
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Kullanım Şartları</DialogTitle>
          <DialogDescription>
            Son güncelleme: {LEGAL_LAST_UPDATED}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <TermsContent />
        </ScrollArea>
        <Link
          href="/kullanim-sartlari"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          Tam sayfada aç
          <ArrowUpRightIcon className="size-3" />
        </Link>
      </DialogContent>
    </Dialog>
  )
}

function PrivacyDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="underline underline-offset-2 transition-colors hover:text-foreground"
        >
          Gizlilik Politikası
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Gizlilik Politikası</DialogTitle>
          <DialogDescription>
            Son güncelleme: {LEGAL_LAST_UPDATED}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <PrivacyContent />
        </ScrollArea>
        <Link
          href="/gizlilik"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          Tam sayfada aç
          <ArrowUpRightIcon className="size-3" />
        </Link>
      </DialogContent>
    </Dialog>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" className="h-[18px] w-[18px]" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}
