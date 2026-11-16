"use client"

import { RiQuestionAnswerLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { loginDialog } from "@/lib/stores/login-dialog"

export function UnauthenticatedState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <div className="rounded-full bg-secondary p-3 text-primary">
          <RiQuestionAnswerLine className="size-5" />
        </div>
        <h2 className="text-base font-medium">Sohbetler</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Geçmiş sohbetlerini görmek ve yönetmek için giriş yapmalısın.
        </p>
        <Button
          variant="default"
          onClick={() => loginDialog.open()}
          className="mt-2"
        >
          Giriş Yap
        </Button>
      </CardContent>
    </Card>
  )
}
