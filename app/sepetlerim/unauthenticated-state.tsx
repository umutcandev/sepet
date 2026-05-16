"use client"

import { ShoppingBasketIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { loginDialog } from "@/lib/stores/login-dialog"

export function UnauthenticatedState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-12 text-center">
      <div className="rounded-full bg-secondary p-3 text-primary">
        <ShoppingBasketIcon className="size-5" />
      </div>
      <h2 className="text-base font-medium">Sepetlerim</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Oluşturduğunuz sepetleri ve en ucuz market seçeneklerini görmek için
        giriş yapmalısınız.
      </p>
      <Button onClick={() => loginDialog.open()} className="mt-2">
        Giriş Yap
      </Button>
    </div>
  )
}
