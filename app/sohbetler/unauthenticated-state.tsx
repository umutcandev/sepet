"use client"

import { RiQuestionAnswerLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { loginDialog } from "@/lib/stores/login-dialog"

export function UnauthenticatedState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-12 text-center">
      <div className="rounded-full bg-secondary p-3 text-primary">
        <RiQuestionAnswerLine className="size-5" />
      </div>
      <h2 className="text-base font-medium">Sohbetler</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Geçmiş sohbetlerini görmek ve yönetmek için giriş yapmalısın.
      </p>
      <Button onClick={() => loginDialog.open()} className="mt-2">
        Giriş Yap
      </Button>
    </div>
  )
}
