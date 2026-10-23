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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/sonner"
import {
  getLinkedAccountsAction,
  linkFacebookAction,
  linkGoogleAction,
  unlinkFacebookAction,
  unlinkGoogleAction,
  type LinkedAccountsState,
  type LinkResult,
} from "@/lib/actions/linked-accounts"
import { getSudoStateAction } from "@/lib/actions/sudo"
import type { ReauthMethods } from "@/lib/actions/passkeys"
import {
  OAUTH_PROVIDER_LABELS,
  type OAuthProviderId,
} from "@/lib/auth/providers"

import {
  SettingActionSkeleton,
  SettingBadgeSkeleton,
  SettingDescriptionSkeleton,
  SettingGroup,
  SettingRow,
} from "../settings-row"
import { SudoDialog } from "./sudo-dialog"

const LINK_ACTIONS: Record<OAuthProviderId, () => Promise<LinkResult>> = {
  google: linkGoogleAction,
  facebook: linkFacebookAction,
}

const UNLINK_ACTIONS: Record<OAuthProviderId, () => Promise<LinkResult>> = {
  google: unlinkGoogleAction,
  facebook: unlinkFacebookAction,
}

const PROVIDERS: OAuthProviderId[] = ["google", "facebook"]

type Op = "link" | "unlink"

// Ayarlar > Hesap > Bağlı hesaplar: hesaba Google / Facebook ile giriş ekle ya
// da kaldır. Bağlama sağlayıcının sayfasına gidip döner; sonuç
// AccountLinkResultHost'ta toast olarak gösterilir. İki işlem de kalıcı bir
// giriş yolunu değiştirdiği için sunucu yeniden doğrulama (sudo) ister; pencere
// açık değilse önce SudoDialog açılır.
export function LinkedAccountsGroup() {
  const [state, setState] = React.useState<LinkedAccountsState | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [busy, setBusy] = React.useState<OAuthProviderId | null>(null)
  const [reauth, setReauth] = React.useState<{
    provider: OAuthProviderId
    op: Op
    methods: ReauthMethods
  } | null>(null)
  const [confirmUnlink, setConfirmUnlink] =
    React.useState<OAuthProviderId | null>(null)

  React.useEffect(() => {
    let active = true
    getLinkedAccountsAction()
      .then((s) => {
        if (active && s) setState(s)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function run(provider: OAuthProviderId, op: Op) {
    setBusy(provider)
    try {
      // Bağlamada başarı sağlayıcıya yönlendirir; buraya yalnız hata döner.
      const res = await (op === "link" ? LINK_ACTIONS : UNLINK_ACTIONS)[
        provider
      ]()
      if (res.ok) {
        if (op === "unlink") {
          setState((s) => (s ? { ...s, [provider]: false } : s))
          toast.success(
            `${OAUTH_PROVIDER_LABELS[provider]} bağlantısı kaldırıldı.`,
            { description: "Diğer cihazlardaki oturumların kapatıldı." }
          )
        }
        return
      }
      if (res.code === "sudo_required") {
        const sudo = await getSudoStateAction()
        if (sudo) {
          setReauth({ provider, op, methods: sudo.methods })
          return
        }
      }
      toast.error(res.error)
    } catch (err) {
      // Bağlamada başarı yönlendirmedir; onu hata sayma.
      if (
        String((err as { digest?: unknown })?.digest ?? "").startsWith(
          "NEXT_REDIRECT"
        )
      ) {
        throw err
      }
      // Ör. kullanıcı kilidi zaman aşımı (lib/security/user-lock.ts).
      toast.error("İşlem tamamlanamadı. Birazdan tekrar dene.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <SettingGroup title="Bağlı hesaplar">
      {PROVIDERS.map((provider) => {
        const label = OAUTH_PROVIDER_LABELS[provider]
        const linked = state?.[provider] ?? false
        return (
          <SettingRow
            key={provider}
            title={label}
            target={provider === "google" ? "bagli-hesaplar" : undefined}
            titleAccessory={
              loading ? (
                <SettingBadgeSkeleton />
              ) : (
                <Badge variant={linked ? "default" : "secondary"}>
                  {linked ? "Bağlı" : "Bağlı değil"}
                </Badge>
              )
            }
            description={
              loading ? (
                <SettingDescriptionSkeleton className="w-40" />
              ) : linked ? (
                `${label} ile giriş yapabilirsin`
              ) : (
                `Hesabına ${label} ile giriş ekle`
              )
            }
          >
            {loading ? (
              <SettingActionSkeleton className="w-16" />
            ) : linked ? (
              <Button
                variant="outline"
                size="sm"
                disabled={busy !== null}
                onClick={() => setConfirmUnlink(provider)}
              >
                {busy === provider ? "Kaldırılıyor…" : "Kaldır"}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={busy !== null}
                onClick={() => void run(provider, "link")}
              >
                {busy === provider ? "Yönlendiriliyor…" : "Bağla"}
              </Button>
            )}
          </SettingRow>
        )
      })}
      {reauth ? (
        <SudoDialog
          open
          onOpenChange={(o) => {
            if (!o) setReauth(null)
          }}
          methods={reauth.methods}
          onVerified={() => {
            const { provider, op } = reauth
            setReauth(null)
            void run(provider, op)
          }}
        />
      ) : null}
      <AlertDialog
        open={confirmUnlink !== null}
        onOpenChange={(o) => {
          if (!o) setConfirmUnlink(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmUnlink
                ? `${OAUTH_PROVIDER_LABELS[confirmUnlink]} bağlantısı kaldırılsın mı?`
                : null}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bu hesapla artık giriş yapamazsın. Güvenliğin için bu cihaz
              dışındaki tüm oturumların da kapatılır.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const provider = confirmUnlink
                setConfirmUnlink(null)
                if (provider) void run(provider, "unlink")
              }}
            >
              Kaldır
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingGroup>
  )
}
