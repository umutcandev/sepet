"use client"

import { SparklesIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { loginDialog } from "@/lib/stores/login-dialog"

export function UnauthenticatedState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-12 text-center">
      <div className="rounded-full bg-secondary p-3 text-primary">
        <SparklesIcon className="size-5" />
      </div>
      <h2 className="text-base font-medium">Fişlerim</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Yüklediğiniz fişleri ve potansiyel tasarruflarınızı görmek için giriş yapmalısınız.
      </p>
      <Button onClick={() => loginDialog.open()} className="mt-2">
        Giriş Yap
      </Button>
    </div>
  )
}
