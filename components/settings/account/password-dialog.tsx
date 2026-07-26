"use client"

import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { PasswordInput } from "@/components/auth/password-input"
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
  requestSetPasswordLinkAction,
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
          <SetPasswordLink
            key={open ? "open" : "closed"}
            onClose={() => setOpen(false)}
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
          <PasswordInput
            id="cur-password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="new-password">Yeni şifre</FieldLabel>
          <PasswordInput
            id="new-password"
            autoComplete="new-password"
            required
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="new-password2">Yeni şifre (tekrar)</FieldLabel>
          <PasswordInput
            id="new-password2"
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

// Şifresiz (sosyal giriş) hesap: şifre diyalogda DEĞİL, e-postaya giden bağlantıyla
// /sifre-sifirla sayfasında belirlenir ("şifremi unuttum" ile aynı akış;
// diyalogda kod ya da şifre alanı yok).
function SetPasswordLink({ onClose }: { onClose: () => void }) {
  const [sent, setSent] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState("")

  async function sendLink() {
    setError("")
    setBusy(true)
    const res = await requestSetPasswordLinkAction()
    setBusy(false)
    if (res.ok) {
      setSent(true)
    } else {
      setError(res.error)
    }
  }

  if (sent) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>E-postanı kontrol et</DialogTitle>
          <DialogDescription>
            Şifre belirleme bağlantısını e-postana gönderdik. Şifreni oradaki
            bağlantıdan belirleyebilirsin; bağlantı 15 dakika geçerli.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="py-1 text-xs text-destructive">{error}</p>
        ) : null}
        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={sendLink}
            disabled={busy}
            className="gap-2"
          >
            {busy ? <Spinner /> : null}
            Bağlantıyı tekrar gönder
          </Button>
          <Button type="button" onClick={onClose}>
            Tamam
          </Button>
        </DialogFooter>
      </>
    )
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Şifre belirle</DialogTitle>
        <DialogDescription>
          Mevcut giriş yöntemine ek olarak bir şifre belirle. Sana e-postanla
          bir bağlantı gönderelim; şifreni o sayfadan belirlersin.
        </DialogDescription>
      </DialogHeader>
      {error ? <p className="py-1 text-xs text-destructive">{error}</p> : null}
      <DialogFooter>
        <Button onClick={sendLink} disabled={busy} className="gap-2">
          {busy ? <Spinner /> : null}
          Bağlantı gönder
        </Button>
      </DialogFooter>
    </>
  )
}
