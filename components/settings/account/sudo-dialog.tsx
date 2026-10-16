"use client"

import * as React from "react"
import {
  startAuthentication,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser"

import { toast } from "@/components/ui/sonner"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { FormError } from "@/components/ui/form-error"
import { PasswordInput } from "@/components/auth/password-input"
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
  beginSudoPasskeyAction,
  confirmSudoAction,
  requestSudoEmailCodeAction,
  type SudoInput,
} from "@/lib/actions/sudo"
import type { ReauthMethods } from "@/lib/actions/passkeys"

type Method = keyof ReauthMethods

// En güçlüden zayıfa: varsayılan, hesapta bulunan ilk yöntem.
const ORDER: Method[] = ["passkey", "password", "totp", "email"]

const SWITCH_LABEL: Record<Method, string> = {
  passkey: "Geçiş anahtarı kullan",
  password: "Şifre kullan",
  totp: "Doğrulama uygulaması kullan",
  email: "E-posta kodu kullan",
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  methods: ReauthMethods
  onVerified: () => void
}

// Hassas işlem öncesi yeniden doğrulama (bkz. lib/auth/sudo.ts). Başarılı
// doğrulama bu oturuma 10 dk'lık pencere açar; o süre içinde tekrar sorulmaz.
export function SudoDialog({ open, onOpenChange, methods, onVerified }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <SudoForm
          key={open ? "open" : "closed"}
          methods={methods}
          onVerified={onVerified}
        />
      </DialogContent>
    </Dialog>
  )
}

function SudoForm({
  methods,
  onVerified,
}: {
  methods: ReauthMethods
  onVerified: () => void
}) {
  const available = ORDER.filter((m) => methods[m])
  const [method, setMethod] = React.useState<Method | undefined>(available[0])
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState("")

  async function submit(input: SudoInput): Promise<boolean> {
    setError("")
    setBusy(true)
    const res = await confirmSudoAction(input)
    setBusy(false)
    if (res.ok) {
      onVerified()
      return true
    }
    setError(res.error)
    return false
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Kimliğini doğrula</DialogTitle>
        <DialogDescription>
          Güvenliğin için devam etmeden önce kimliğini doğrula. Sonraki 10
          dakika boyunca tekrar sormayacağız.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-3 py-2">
        {method === "passkey" ? (
          <PasskeyMethod busy={busy} setBusy={setBusy} submit={submit} />
        ) : method === "password" ? (
          <PasswordMethod busy={busy} submit={submit} />
        ) : method === "totp" ? (
          <CodeMethod
            busy={busy}
            hint="Doğrulama uygulamandaki 6 haneli kodu gir."
            submit={(code) => submit({ method: "totp", code })}
          />
        ) : method === "email" ? (
          <EmailMethod busy={busy} setError={setError} submit={submit} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Hesabında doğrulama için kullanılabilecek bir yöntem bulunamadı.
          </p>
        )}

        {error ? <FormError>{error}</FormError> : null}

        {available.length > 1 ? (
          <div className="flex flex-col items-start gap-1.5 pt-1">
            {available
              .filter((m) => m !== method)
              .map((m) => (
                <Button
                  key={m}
                  variant="link-muted"
                  size="inline"
                  className="text-xs"
                  disabled={busy}
                  onClick={() => {
                    setError("")
                    setMethod(m)
                  }}
                >
                  {SWITCH_LABEL[m]}
                </Button>
              ))}
          </div>
        ) : null}
      </div>
    </>
  )
}

function PasskeyMethod({
  busy,
  setBusy,
  submit,
}: {
  busy: boolean
  setBusy: (v: boolean) => void
  submit: (input: SudoInput) => Promise<boolean>
}) {
  // Seçenekler önceden çekilir: tıklamada await olmadan tören başlar (Safari
  // user-gesture kuralı). Her denemeden sonra challenge yenilenir.
  const [options, setOptions] =
    React.useState<PublicKeyCredentialRequestOptionsJSON | null>(null)
  const [loadError, setLoadError] = React.useState("")

  const load = React.useCallback(async () => {
    setOptions(null)
    const res = await beginSudoPasskeyAction().catch(() => null)
    if (!res) {
      setLoadError("Bağlantı kurulamadı. Tekrar dene.")
      return
    }
    if (!res.ok) {
      setLoadError(res.error)
      return
    }
    setLoadError("")
    setOptions(res.options)
  }, [])

  React.useEffect(() => {
    let active = true
    beginSudoPasskeyAction()
      .then((res) => {
        if (!active) return
        if (res.ok) setOptions(res.options)
        else setLoadError(res.error)
      })
      .catch(() => {
        if (active) setLoadError("Bağlantı kurulamadı. Tekrar dene.")
      })
    return () => {
      active = false
    }
  }, [])

  function verify() {
    if (!options || busy) return
    setBusy(true)
    startAuthentication({ optionsJSON: options })
      .then(async (response) => {
        const ok = await submit({ method: "passkey", response })
        if (!ok) void load()
      })
      .catch((err: unknown) => {
        setBusy(false)
        const name = err instanceof Error ? err.name : ""
        if (name !== "NotAllowedError" && name !== "AbortError") {
          toast.error("Geçiş anahtarıyla doğrulanamadı.")
        }
        void load()
      })
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Bu hesaba kayıtlı bir geçiş anahtarıyla doğrula.
      </p>
      {loadError ? <FormError>{loadError}</FormError> : null}
      <DialogFooter>
        <Button variant="default" disabled={busy || !options} onClick={verify}>
          {busy || (!options && !loadError) ? <Spinner /> : null}
          Geçiş anahtarıyla doğrula
        </Button>
      </DialogFooter>
    </>
  )
}

function PasswordMethod({
  busy,
  submit,
}: {
  busy: boolean
  submit: (input: SudoInput) => Promise<boolean>
}) {
  const [password, setPassword] = React.useState("")
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (password && !busy) void submit({ method: "password", password })
      }}
    >
      <Field>
        <FieldLabel htmlFor="sudo-password">Şifren</FieldLabel>
        <PasswordInput
          id="sudo-password"
          autoComplete="current-password"
          autoFocus
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <DialogFooter>
        <Button variant="default" type="submit" disabled={busy || !password}>
          {busy ? <Spinner /> : null}
          Doğrula
        </Button>
      </DialogFooter>
    </form>
  )
}

function CodeMethod({
  busy,
  hint,
  submit,
}: {
  busy: boolean
  hint: string
  submit: (code: string) => Promise<boolean>
}) {
  const [code, setCode] = React.useState("")
  async function send(value = code) {
    if (value.length !== 6 || busy) return
    if (!(await submit(value))) setCode("")
  }
  return (
    <>
      <p className="text-sm text-muted-foreground">{hint}</p>
      <OtpField
        value={code}
        onChange={setCode}
        onComplete={(v) => void send(v)}
        disabled={busy}
      />
      <DialogFooter>
        <Button
          variant="default"
          disabled={busy || code.length !== 6}
          onClick={() => void send()}
        >
          {busy ? <Spinner /> : null}
          Doğrula
        </Button>
      </DialogFooter>
    </>
  )
}

function EmailMethod({
  busy,
  setError,
  submit,
}: {
  busy: boolean
  setError: (message: string) => void
  submit: (input: SudoInput) => Promise<boolean>
}) {
  const [sent, setSent] = React.useState(false)
  const [sending, setSending] = React.useState(false)

  async function sendCode() {
    setError("")
    setSending(true)
    const res = await requestSudoEmailCodeAction()
    setSending(false)
    // Limit aşımında "gönderdik" deme: hatayı göster.
    if (!res.ok) {
      setError(res.error)
      return
    }
    toast.message("E-postana bir kod gönderdik.")
    setSent(true)
  }

  if (!sent) {
    return (
      <>
        <p className="text-sm text-muted-foreground">
          Hesabının bir şifresi olmadığı için e-postana bir doğrulama kodu
          gönderelim.
        </p>
        <DialogFooter>
          <Button variant="default" disabled={sending} onClick={sendCode}>
            {sending ? <Spinner /> : null}
            Kod gönder
          </Button>
        </DialogFooter>
      </>
    )
  }

  return (
    <>
      <CodeMethod
        busy={busy}
        hint="E-postana gelen 6 haneli kodu gir."
        submit={(code) => submit({ method: "email", code })}
      />
      <Button
        variant="link-muted"
        size="inline"
        className="self-start text-xs"
        disabled={sending || busy}
        onClick={sendCode}
      >
        Kodu tekrar gönder
      </Button>
    </>
  )
}
