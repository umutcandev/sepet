"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { CheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { FormError } from "@/components/ui/form-error"
import { PasswordInput } from "@/components/auth/password-input"
import { loginDialog } from "@/lib/stores/login-dialog"
import { resetPasswordAction } from "@/lib/actions/password"

// Token yalnız submit'te (server action POST) tüketilir; sayfa yüklenirken
// doğrulanmaz → tarayıcı/link-önizleme botları tek kullanımlık token'ı yakmaz.
export function ResetPasswordCard({ token }: { token: string | null }) {
  const [password, setPassword] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState("")
  // null = form aşamasında; dolu = başarı ekranı. sessionsRevoked yalnız var
  // olan şifre değiştiğinde true olur (ilk belirlemede cihazlardan çıkış yok),
  // başarı alt metni buna göre seçilir.
  const [done, setDone] = React.useState<{ sessionsRevoked: boolean } | null>(
    null,
  )

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!token) return
    if (password !== confirm) {
      setError("Şifreler eşleşmiyor.")
      return
    }
    setBusy(true)
    const res = await resetPasswordAction({ token, newPassword: password })
    setBusy(false)
    if (res.ok) setDone({ sessionsRevoked: res.sessionsRevoked })
    else setError(res.error)
  }

  if (!token) {
    return (
      <Content
        title="Bağlantı geçersiz"
        subtitle="Sıfırlama bağlantısı eksik ya da hatalı görünüyor. Giriş ekranından yeni bir bağlantı isteyebilirsin."
      >
        <Button
          variant="outline"
          className="h-11 w-full rounded-xl"
          onClick={() => loginDialog.open()}
        >
          Giriş ekranına dön
        </Button>
      </Content>
    )
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {done ? (
        <motion.div
          key="done"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="flex w-full flex-col items-center"
        >
          <Content
            icon={
              <span className="mt-5 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckIcon className="h-5 w-5" />
              </span>
            }
            title={done.sessionsRevoked ? "Şifren güncellendi" : "Şifren belirlendi"}
            subtitle={
              done.sessionsRevoked
                ? "Diğer tüm cihazlar çıkış yaptı. Yeni şifrenle giriş yapabilirsin."
                : "Artık e-postan ve şifrenle de giriş yapabilirsin."
            }
          >
            <Button
              className="h-11 w-full rounded-xl"
              onClick={() => loginDialog.open()}
            >
              Giriş yap
            </Button>
          </Content>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          onSubmit={submit}
          className="flex w-full flex-col items-center"
        >
          <Content
            title="Yeni şifre belirle"
            subtitle="Hesabın için yeni bir şifre gir."
          >
            <div className="flex w-full flex-col gap-3 text-left">
              <Field>
                <FieldLabel htmlFor="new-password">Yeni şifre</FieldLabel>
                <PasswordInput
                  id="new-password"
                  autoComplete="new-password"
                  required
                  className="h-10.5 rounded-xl px-3"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="new-password2">Yeni şifre (tekrar)</FieldLabel>
                <PasswordInput
                  id="new-password2"
                  autoComplete="new-password"
                  required
                  className="h-10.5 rounded-xl px-3"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </Field>
              <p className="text-[0.6875rem] leading-[1.5] text-subtle-foreground">
                En az 8 karakter, bir harf ve bir rakam.
              </p>
              {error ? (
                <FormError>{error}</FormError>
              ) : null}
              <Button
                type="submit"
                disabled={busy}
                className="mt-1 h-11 w-full gap-2 rounded-xl text-sm font-medium"
              >
                {busy ? <Spinner /> : null}
                Şifreyi güncelle
              </Button>
            </div>
          </Content>
        </motion.form>
      )}
    </AnimatePresence>
  )
}

function Content({
  icon,
  title,
  subtitle,
  children,
}: {
  icon?: React.ReactNode
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="flex w-full flex-col items-center">
      {icon}
      <h1 className="mt-5 text-[1.375rem] leading-tight font-semibold tracking-[-0.02em] text-foreground">
        {title}
      </h1>
      <p className="mt-2 max-w-[300px] text-sm leading-[1.4] tracking-[-0.01em] text-muted-foreground">
        {subtitle}
      </p>
      <div className="mt-7 w-full">{children}</div>
    </div>
  )
}
