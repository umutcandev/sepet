"use client"

import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
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
  changePasswordAction,
  requestSetPasswordCodeAction,
  setPasswordAction,
} from "@/lib/actions/password"

type Props = {
  hasPassword: boolean
  onChanged: () => void
}

export function PasswordDialog({ hasPassword, onChanged }: Props) {
  const [open, setOpen] = React.useState(false)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
      }}
    >
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {hasPassword ? "Şifreni değiştir" : "Şifre belirle"}
      </Button>
      <DialogContent>
        {hasPassword ? (
          <ChangePasswordForm
            onDone={() => {
              setOpen(false)
              onChanged()
            }}
          />
        ) : (
          <SetPasswordForm
            key={open ? "open" : "closed"}
            onDone={() => {
              setOpen(false)
              onChanged()
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const [current, setCurrent] = React.useState("")
  const [next, setNext] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState("")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (next !== confirm) {
      setError("Yeni şifreler eşleşmiyor.")
      return
    }
    setBusy(true)
    const res = await changePasswordAction({
      currentPassword: current,
      newPassword: next,
    })
    setBusy(false)
    if (res.ok) {
      toast.success("Şifren güncellendi. Diğer cihazlar çıkış yaptı.")
      onDone()
    } else {
      setError(res.error)
    }
  }

  return (
    <form onSubmit={submit}>
      <DialogHeader>
        <DialogTitle>Şifreni değiştir</DialogTitle>
        <DialogDescription>
          Güvenlik için değişiklik sonrası diğer tüm cihazlar çıkış yapar.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-3 py-2">
        <Field>
          <FieldLabel htmlFor="cur-password">Mevcut şifre</FieldLabel>
          <Input
            id="cur-password"
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="new-password">Yeni şifre</FieldLabel>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="new-password2">Yeni şifre (tekrar)</FieldLabel>
          <Input
            id="new-password2"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
        <p className="text-xs text-muted-foreground">
          En az 8 karakter, bir harf ve bir rakam.
        </p>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={busy} className="gap-2">
          {busy ? <Spinner /> : null}
          Şifreyi güncelle
        </Button>
      </DialogFooter>
    </form>
  )
}

function SetPasswordForm({ onDone }: { onDone: () => void }) {
  const [step, setStep] = React.useState<"request" | "verify">("request")
  const [code, setCode] = React.useState("")
  const [next, setNext] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState("")

  async function requestCode() {
    setError("")
    setBusy(true)
    const res = await requestSetPasswordCodeAction()
    setBusy(false)
    if (res.ok) {
      toast.message("E-postana bir kod gönderdik.")
      setStep("verify")
    } else {
      setError(res.error)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (code.length !== 6) {
      setError("6 haneli kodu gir.")
      return
    }
    if (next !== confirm) {
      setError("Şifreler eşleşmiyor.")
      return
    }
    setBusy(true)
    const res = await setPasswordAction({ code, newPassword: next })
    setBusy(false)
    if (res.ok) {
      toast.success("Şifren belirlendi. Artık e-postanla da giriş yapabilirsin.")
      onDone()
    } else {
      setError(res.error)
    }
  }

  if (step === "request") {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Şifre belirle</DialogTitle>
          <DialogDescription>
            Google hesabına ek olarak bir şifre belirle. Önce e-postana bir
            doğrulama kodu gönderelim.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="py-1 text-xs text-destructive">{error}</p>
        ) : null}
        <DialogFooter>
          <Button onClick={requestCode} disabled={busy} className="gap-2">
            {busy ? <Spinner /> : null}
            Kod gönder
          </Button>
        </DialogFooter>
      </>
    )
  }

  return (
    <form onSubmit={submit}>
      <DialogHeader>
        <DialogTitle>Şifre belirle</DialogTitle>
        <DialogDescription>
          E-postana gelen 6 haneli kodu ve yeni şifreni gir.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-2">
        <div className="flex justify-center">
          <OtpField value={code} onChange={setCode} />
        </div>
        <Field>
          <FieldLabel htmlFor="set-password">Yeni şifre</FieldLabel>
          <Input
            id="set-password"
            type="password"
            autoComplete="new-password"
            required
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="set-password2">Yeni şifre (tekrar)</FieldLabel>
          <Input
            id="set-password2"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
        <p className="text-xs text-muted-foreground">
          En az 8 karakter, bir harf ve bir rakam.
        </p>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
      <DialogFooter className="sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={requestCode}
          disabled={busy}
        >
          Kodu tekrar gönder
        </Button>
        <Button type="submit" disabled={busy} className="gap-2">
          {busy ? <Spinner /> : null}
          Şifreyi belirle
        </Button>
      </DialogFooter>
    </form>
  )
}
