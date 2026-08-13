"use client"

import * as React from "react"
import { toast } from "@/components/ui/sonner"
import { QRCodeSVG } from "qrcode.react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { PasswordInput } from "@/components/auth/password-input"
import { Spinner } from "@/components/ui/spinner"
import { FormError } from "@/components/ui/form-error"
import { OtpField } from "@/components/auth/otp-field"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  beginTotpSetupAction,
  requestTotpSetupCodeAction,
  confirmTotpSetupAction,
  disableTotpAction,
  regenerateRecoveryCodesAction,
} from "@/lib/actions/two-factor"

type Props = {
  enabled: boolean
  hasPassword: boolean
  onChanged: () => void
}

export function TwoFactorDialog({ enabled, hasPassword, onChanged }: Props) {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {enabled ? "Yönet" : "Kur"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          {enabled ? (
            <ManageTwoFactor
              key={open ? "open" : "closed"}
              hasPassword={hasPassword}
              onDone={() => {
                setOpen(false)
                onChanged()
              }}
              onClose={() => setOpen(false)}
            />
          ) : (
            <SetupTwoFactor
              key={open ? "open" : "closed"}
              hasPassword={hasPassword}
              onDone={() => {
                setOpen(false)
                onChanged()
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function SetupTwoFactor({
  hasPassword,
  onDone,
}: {
  hasPassword: boolean
  onDone: () => void
}) {
  // Kurulum yeniden doğrulamayla başlar (reauth): şifreli hesap şifresini girer,
  // şifresiz (sosyal giriş) hesap e-postasına gelen kodu girer. Salt oturum
  // cookie'siyle 2FA kurulamaz (çalınmış oturum + kurtarma kodları = kilitleme).
  const [step, setStep] = React.useState<
    "reauth" | "qr" | "confirm" | "recovery"
  >("reauth")
  const [setup, setSetup] = React.useState<{
    otpauthUri: string
    secretB32: string
  } | null>(null)
  const [reauthValue, setReauthValue] = React.useState("")
  const [codeSent, setCodeSent] = React.useState(false)
  const [code, setCode] = React.useState("")
  const [codes, setCodes] = React.useState<string[]>([])
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState("")

  async function sendSetupCode() {
    setError("")
    setBusy(true)
    const res = await requestTotpSetupCodeAction()
    setBusy(false)
    if (res.ok) {
      toast.message("E-postana bir kod gönderdik.")
      setCodeSent(true)
    } else {
      setError(res.error)
    }
  }

  async function begin(value?: string) {
    const v = value ?? reauthValue
    if (!v || busy) return
    setError("")
    setBusy(true)
    const res = await beginTotpSetupAction(
      hasPassword ? { password: v } : { emailCode: v },
    )
    setBusy(false)
    if (res.ok) {
      setSetup({ otpauthUri: res.otpauthUri, secretB32: res.secretB32 })
      setStep("qr")
    } else {
      setError(res.error)
      if (!hasPassword) setReauthValue("")
    }
  }

  async function confirm(codeValue?: string) {
    const c = codeValue ?? code
    if (c.length !== 6 || busy) return
    setError("")
    setBusy(true)
    const res = await confirmTotpSetupAction({ code: c })
    setBusy(false)
    if (res.ok) {
      setCodes(res.recoveryCodes)
      setStep("recovery")
    } else {
      setError(res.error)
      setCode("")
    }
  }

  if (step === "reauth") {
    if (hasPassword) {
      return (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void begin()
          }}
        >
          <DialogHeader>
            <DialogTitle>İki adımlı doğrulamayı kur</DialogTitle>
            <DialogDescription>
              Devam etmek için önce şifreni gir.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <Field>
              <FieldLabel htmlFor="setup-password">Şifren</FieldLabel>
              <PasswordInput
                id="setup-password"
                autoComplete="current-password"
                required
                value={reauthValue}
                onChange={(e) => setReauthValue(e.target.value)}
              />
            </Field>
            {error ? <FormError>{error}</FormError> : null}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy || !reauthValue} className="gap-2">
              {busy ? <Spinner /> : null}
              Devam
            </Button>
          </DialogFooter>
        </form>
      )
    }
    if (!codeSent) {
      return (
        <>
          <DialogHeader>
            <DialogTitle>İki adımlı doğrulamayı kur</DialogTitle>
            <DialogDescription>
              Hesabının bir şifresi olmadığı için önce e-postana bir doğrulama
              kodu gönderelim.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <FormError>{error}</FormError>
          ) : null}
          <DialogFooter>
            <Button onClick={sendSetupCode} disabled={busy} className="gap-2">
              {busy ? <Spinner /> : null}
              Kod gönder
            </Button>
          </DialogFooter>
        </>
      )
    }
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void begin()
        }}
      >
        <DialogHeader>
          <DialogTitle>İki adımlı doğrulamayı kur</DialogTitle>
          <DialogDescription>
            E-postana gelen 6 haneli kodu gir.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 py-4">
          <OtpField
            value={reauthValue}
            onChange={setReauthValue}
            onComplete={(v) => begin(v)}
            disabled={busy}
          />
          {error ? <FormError>{error}</FormError> : null}
        </div>
        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={sendSetupCode}
            disabled={busy}
          >
            Kodu tekrar gönder
          </Button>
          <Button
            type="submit"
            disabled={busy || reauthValue.length !== 6}
            className="gap-2"
          >
            {busy ? <Spinner /> : null}
            Devam
          </Button>
        </DialogFooter>
      </form>
    )
  }

  if (step === "recovery") {
    return <RecoveryCodes codes={codes} onDone={onDone} />
  }

  if (step === "confirm") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void confirm()
        }}
      >
        <DialogHeader>
          <DialogTitle>Kodu doğrula</DialogTitle>
          <DialogDescription>
            Uygulamanda görünen 6 haneli kodu gir.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 py-4">
          <OtpField
            value={code}
            onChange={setCode}
            onComplete={(v) => confirm(v)}
            disabled={busy}
          />
          {error ? <FormError>{error}</FormError> : null}
        </div>
        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="ghost" onClick={() => setStep("qr")}>
            Geri
          </Button>
          <Button
            type="submit"
            disabled={busy || code.length !== 6}
            className="gap-2"
          >
            {busy ? <Spinner /> : null}
            Doğrula ve aç
          </Button>
        </DialogFooter>
      </form>
    )
  }

  // step === "qr"
  return (
    <>
      <DialogHeader>
        <DialogTitle>İki adımlı doğrulamayı kur</DialogTitle>
        <DialogDescription>
          Doğrulama uygulamanla (Google Authenticator, 1Password vb.) aşağıdaki
          QR kodu tara.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col items-center gap-3 py-3">
        <div className="rounded-xl bg-white p-3 ring-1 ring-border">
          {setup ? <QRCodeSVG value={setup.otpauthUri} size={172} /> : null}
        </div>
        {setup ? (
          <button
            type="button"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => {
              navigator.clipboard
                .writeText(setup.secretB32)
                .then(() => toast.success("Anahtar kopyalandı."))
                .catch(() => {})
            }}
          >
            Elle giriş anahtarı:{" "}
            <span className="font-mono tracking-wider">{setup.secretB32}</span>
          </button>
        ) : null}
      </div>
      <DialogFooter>
        <Button onClick={() => setStep("confirm")}>Devam</Button>
      </DialogFooter>
    </>
  )
}

function ManageTwoFactor({
  hasPassword,
  onDone,
  onClose,
}: {
  hasPassword: boolean
  onDone: () => void
  onClose: () => void
}) {
  const [secret, setSecret] = React.useState("")
  // Telefonu (doğrulama uygulamasını) kaybetmiş kullanıcı için kurtarma koduyla
  // yeniden doğrulama alternatifi; şifresiz hesabın tek çıkış yolu budur.
  const [useRecovery, setUseRecovery] = React.useState(false)
  const [busy, setBusy] = React.useState<"disable" | "regen" | null>(null)
  const [error, setError] = React.useState("")
  const [codes, setCodes] = React.useState<string[] | null>(null)

  function creds() {
    if (useRecovery) return { recoveryCode: secret }
    return hasPassword ? { password: secret } : { otp: secret }
  }
  function missing() {
    if (useRecovery) return "Kurtarma kodunu gir."
    return hasPassword ? "Şifreni gir." : "Doğrulama kodunu gir."
  }
  const inputLabel = useRecovery
    ? "Kurtarma kodu"
    : hasPassword
      ? "Şifren"
      : "Doğrulama kodu"

  async function regen() {
    if (!secret) {
      setError(missing())
      return
    }
    setError("")
    setBusy("regen")
    const res = await regenerateRecoveryCodesAction(creds())
    setBusy(null)
    if (res.ok) setCodes(res.recoveryCodes)
    else setError(res.error)
  }

  async function disable() {
    if (!secret) {
      setError(missing())
      return
    }
    setError("")
    setBusy("disable")
    const res = await disableTotpAction(creds())
    setBusy(null)
    if (res.ok) {
      toast.success("İki adımlı doğrulama kapatıldı.")
      onDone()
    } else {
      setError(res.error)
    }
  }

  if (codes) return <RecoveryCodes codes={codes} onDone={onClose} />

  return (
    <>
      <DialogHeader>
        <DialogTitle>İki adımlı doğrulama</DialogTitle>
        <DialogDescription>
          Kurtarma kodlarını yenilemek ya da iki adımlı doğrulamayı kapatmak için{" "}
          {useRecovery
            ? "kurtarma kodlarından birini"
            : hasPassword
              ? "şifreni"
              : "doğrulama kodunu"}{" "}
          gir.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-3 py-2">
        <Field>
          <FieldLabel htmlFor="reauth">{inputLabel}</FieldLabel>
          {!useRecovery && hasPassword ? (
            <PasswordInput
              id="reauth"
              autoComplete="current-password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
          ) : (
            <Input
              id="reauth"
              type="text"
              inputMode={useRecovery ? undefined : "numeric"}
              autoComplete="one-time-code"
              placeholder={useRecovery ? "XXXXX-XXXXX" : undefined}
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
          )}
        </Field>
        <button
          type="button"
          className="self-start text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
          onClick={() => {
            setSecret("")
            setError("")
            setUseRecovery((v) => !v)
          }}
        >
          {useRecovery
            ? hasPassword
              ? "Şifre kullan"
              : "Doğrulama kodu kullan"
            : "Kurtarma kodu kullan"}
        </button>
        {error ? <FormError>{error}</FormError> : null}
      </div>
      <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={regen}
          disabled={busy !== null}
          className="gap-2"
        >
          {busy === "regen" ? <Spinner /> : null}
          Kurtarma kodlarını yenile
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={disable}
          disabled={busy !== null}
          className="gap-2"
        >
          {busy === "disable" ? <Spinner /> : null}
          Kapat
        </Button>
      </DialogFooter>
    </>
  )
}

function RecoveryCodes({
  codes,
  onDone,
}: {
  codes: string[]
  onDone: () => void
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Kurtarma kodların</DialogTitle>
        <DialogDescription>
          Bunları güvenli bir yerde sakla. Telefonunu kaybedersen bu kodlarla
          giriş yaparsın. Bu kodları bir daha göremezsin; her biri yalnızca bir
          kez çalışır.
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-2 py-3">
        {codes.map((c) => (
          <span
            key={c}
            className="rounded-md bg-muted px-3 py-2 text-center font-mono text-sm tracking-wider"
          >
            {c}
          </span>
        ))}
      </div>
      <DialogFooter className="sm:justify-between">
        <Button
          variant="outline"
          onClick={() => {
            navigator.clipboard
              .writeText(codes.join("\n"))
              .then(() => toast.success("Kurtarma kodları kopyalandı."))
              .catch(() => {})
          }}
        >
          Tümünü kopyala
        </Button>
        <Button onClick={onDone}>Bitir</Button>
      </DialogFooter>
    </>
  )
}
