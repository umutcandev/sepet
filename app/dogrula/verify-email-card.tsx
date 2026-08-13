"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { CheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { FormError } from "@/components/ui/form-error"
import { loginDialog } from "@/lib/stores/login-dialog"
import { verifySignupByTokenAction } from "@/lib/actions/credentials-auth"

type Stage = "idle" | "loading" | "success" | "error"

// Token GET'te DEĞİL, butonla (server action) tüketilir: mail tarayıcı/link
// önizleme botları GET prefetch yaparak tek kullanımlık token'ı yakmasın.
export function VerifyEmailCard({ token }: { token: string | null }) {
  const [stage, setStage] = React.useState<Stage>("idle")
  const [error, setError] = React.useState("")

  async function confirm() {
    if (!token || stage === "loading") return
    setStage("loading")
    const res = await verifySignupByTokenAction({ token })
    if (res.ok) {
      setStage("success")
    } else {
      setError(res.error)
      setStage("error")
    }
  }

  if (!token) {
    return (
      <Content
        title="Bağlantı geçersiz"
        subtitle="Doğrulama bağlantısı eksik ya da hatalı görünüyor. Giriş ekranından yeni bir kod isteyebilirsin."
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
      {stage === "success" ? (
        <motion.div
          key="success"
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
            title="Hesabın doğrulandı"
            subtitle="Artık e-posta ve şifrenle giriş yapabilirsin."
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
        <motion.div
          key="confirm"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="flex w-full flex-col items-center"
        >
          <Content
            title="E-postanı doğrula"
            subtitle="Hesabını etkinleştirmek için aşağıdaki butona tıkla."
          >
            <Button
              className="h-11 w-full gap-2 rounded-xl"
              disabled={stage === "loading"}
              onClick={confirm}
            >
              {stage === "loading" ? <Spinner /> : null}
              E-postamı doğrula
            </Button>
            {stage === "error" ? (
              <FormError>{error}</FormError>
            ) : null}
          </Content>
        </motion.div>
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
