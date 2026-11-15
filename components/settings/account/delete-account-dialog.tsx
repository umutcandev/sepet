"use client"

import * as React from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/sonner"
import { useCurrentUser } from "@/components/providers/session-provider"
import { archiveAccount } from "@/lib/actions/profile"
import { getSudoStateAction } from "@/lib/actions/sudo"
import { getSubscription } from "@/lib/actions/subscription"
import type { ReauthMethods } from "@/lib/actions/passkeys"
import { SudoDialog } from "./sudo-dialog"

const dateFmt = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

// "Hesabımı sil" → arşivleme onayı. Onaylanınca archiveAccount hesabı arşivler,
// oturumları kapatır ve çıkış yaptırır (signOut redirect). 14 gün içinde tekrar
// giriş yapılmazsa veriler kalıcı silinir. Sunucu yeniden doğrulama (sudo)
// ister; pencere açık değilse önce SudoDialog gösterilir.
export function DeleteAccountDialog() {
  const { clearClientSession, refresh } = useCurrentUser()
  const [open, setOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [reauth, setReauth] = React.useState<ReauthMethods | null>(null)
  // null: Polar'da etkin Pro yok; "": tarih bilinmiyor.
  const [proUntil, setProUntil] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    let active = true
    getSubscription()
      .then((s) => {
        if (!active) return
        const billed = s?.plan === "pro" && s.hasCustomer && !s.cancelAtPeriodEnd
        setProUntil(
          billed
            ? s.currentPeriodEnd
              ? dateFmt.format(new Date(s.currentPeriodEnd))
              : ""
            : null,
        )
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [open])

  async function archive() {
    setBusy(true)
    try {
      // Redirect gelmeden önce istemci oturumunu temizle; yoksa çıkış sonrası
      // avatar/nav ekranda kalır (bkz. SessionProvider.clearClientSession).
      clearClientSession()
      const res = await archiveAccount()
      if (res?.code === "billing_error") {
        await refresh()
        toast.error(
          "Aboneliğin iptal edilemediği için hesabın silinmedi. Biraz sonra tekrar dene.",
        )
        return
      }
      // Sudo penceresi kontrolle istek arasında dolduysa sunucu reddeder ve
      // redirect olmaz: temizlenen istemci oturumunu geri getir, yeniden
      // doğrulamayı aç.
      if (res && res.code === "sudo_required") {
        await refresh()
        const state = await getSudoStateAction()
        if (state) {
          // Onay penceresi SudoDialog'un altında açık kalmasın.
          setOpen(false)
          setReauth(state.methods)
        }
      }
    } finally {
      setBusy(false)
    }
  }

  async function confirm() {
    setBusy(true)
    let state: Awaited<ReturnType<typeof getSudoStateAction>> = null
    try {
      state = await getSudoStateAction()
    } finally {
      setBusy(false)
    }
    if (!state) {
      toast.error("Oturum bulunamadı. Sayfayı yenileyip tekrar dene.")
      return
    }
    if (state.sudo) {
      await archive()
      return
    }
    setOpen(false)
    setReauth(state.methods)
  }

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        Hesabımı sil
      </Button>
      <AlertDialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Hesabını silmek istediğine emin misin?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-2">
                <p>
                  Hesabın arşivlenecek ve tüm oturumların kapatılacak. 14 gün
                  içinde tekrar giriş yapmazsan sepetlerin, fişlerin ve
                  sohbetlerin kalıcı olarak silinir. Bu süre içinde giriş
                  yaparsan hesabın geri açılır.
                </p>
                {proUntil !== null ? (
                  <p>
                    Pro aboneliğin yenilenmeyecek şekilde iptal edilir
                    {proUntil
                      ? `, ödediğin dönem ${proUntil} tarihine kadar açık kalır`
                      : ""}
                    . Hesabın kalıcı silindiğinde abonelik tamamen sona erer.
                    Hesabını geri açarsan iptali Ayarlar › Abonelik bölümünden
                    geri alabilirsin.
                  </p>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busy}
              onClick={(e) => {
                e.preventDefault()
                void confirm()
              }}
            >
              {busy ? "Siliniyor…" : "Hesabımı sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {reauth ? (
        <SudoDialog
          open
          onOpenChange={(o) => {
            if (!o) setReauth(null)
          }}
          methods={reauth}
          onVerified={() => {
            setReauth(null)
            void archive()
          }}
        />
      ) : null}
    </>
  )
}
