"use client"

import * as React from "react"
import { RiMoreLine } from "@remixicon/react"
import { browserSupportsWebAuthn, sendSignal } from "@simplewebauthn/browser"

import { toast } from "@/components/ui/sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { FormError } from "@/components/ui/form-error"
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  deletePasskeyAction,
  getPasskeyStateAction,
  renamePasskeyAction,
  type PasskeyItem,
  type PasskeyState,
} from "@/lib/actions/passkeys"
import { PASSKEY_NAME_MAX } from "@/lib/auth/passkey-names"
import { isRpIdValidForHost } from "@/lib/auth/webauthn-config"
import { passkeysUsableHere } from "@/lib/auth/passkey-availability"

import { SettingGroup, SettingRow } from "../settings-row"
import { CreatePasskeyDialog } from "./create-passkey-dialog"
import { SudoDialog } from "./sudo-dialog"

type EnabledState = Extract<PasskeyState, { enabled: true }>
type Pending = { kind: "create" } | { kind: "delete"; item: PasskeyItem }

const dateFmt = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

function fmt(iso: string): string {
  return dateFmt.format(new Date(iso))
}

// Şifre yöneticisini sunucu durumuyla eşitle (Signal API, Chrome 132+ / Safari
// 26+): listede olmayan anahtarlar öneriden kalkar, ad/e-posta güncellenir.
// Desteklemeyen tarayıcıda sendSignal reddeder → sessizce yutulur.
function syncSignals(state: EnabledState) {
  if (!state.signal) return
  const { rpID, userID, userName, userDisplayName } = state.signal
  void sendSignal({
    signalName: "allAcceptedCredentials",
    rpID,
    userID,
    allAcceptedCredentialIDs: state.passkeys.map((p) => p.credentialId),
  }).catch(() => {})
  void sendSignal({
    signalName: "currentUserDetails",
    rpID,
    userID,
    userName,
    userDisplayName,
  }).catch(() => {})
}

// Ayarlar > Hesap > Geçiş anahtarları. Ekleme ve silme sudo penceresi ister
// (bkz. lib/auth/sudo.ts); yeniden adlandırma istemez.
export function PasskeysGroup() {
  const [state, setState] = React.useState<EnabledState | null>(null)
  // Ayarlar diyaloğu yalnız istemcide mount olur → lazy initializer güvenli.
  // Bu host'ta geçiş anahtarı çalışmayacaksa iskelet hiç çizilmez.
  const [status, setStatus] = React.useState<"loading" | "ready" | "hidden">(
    () => (passkeysUsableHere() ? "loading" : "hidden")
  )
  const [supported, setSupported] = React.useState(true)
  const [sudoFor, setSudoFor] = React.useState<Pending | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [renaming, setRenaming] = React.useState<PasskeyItem | null>(null)
  const [deleting, setDeleting] = React.useState<PasskeyItem | null>(null)

  const apply = React.useCallback((s: PasskeyState | null) => {
    // Ortamda kapalı ya da rpID bu alan adına uymuyorsa bölüm hiç görünmez.
    if (!s?.enabled || !isRpIdValidForHost(s.rpID, window.location.hostname)) {
      setStatus("hidden")
      return
    }
    setSupported(browserSupportsWebAuthn())
    setState(s)
    setStatus("ready")
    syncSignals(s)
  }, [])

  const refresh = React.useCallback(async () => {
    apply(await getPasskeyStateAction().catch(() => null))
  }, [apply])

  React.useEffect(() => {
    if (!passkeysUsableHere()) return
    let active = true
    getPasskeyStateAction()
      .then((s) => {
        if (active) apply(s)
      })
      .catch(() => {
        if (active) setStatus("hidden")
      })
    return () => {
      active = false
    }
  }, [apply])

  function run(p: Pending) {
    if (p.kind === "create") setCreateOpen(true)
    else setDeleting(p.item)
  }

  // Sunucu sudo istedi (pencere hiç açılmadı ya da 10 dk doldu).
  function requireSudo(p: Pending) {
    setState((s) => (s ? { ...s, sudo: false } : s))
    setSudoFor(p)
  }

  function withSudo(p: Pending) {
    if (state?.sudo) run(p)
    else setSudoFor(p)
  }

  if (status === "hidden") return null

  return (
    <>
      {status === "loading" || !state ? (
        <PasskeysSkeleton />
      ) : (
        <PasskeysGroupView
          passkeys={state.passkeys}
          supported={supported}
          onCreate={() => withSudo({ kind: "create" })}
          onRename={setRenaming}
          onDelete={(item) => withSudo({ kind: "delete", item })}
        />
      )}

      {state ? (
        <SudoDialog
          open={sudoFor !== null}
          onOpenChange={(open) => {
            if (!open) setSudoFor(null)
          }}
          methods={state.reauth}
          onVerified={() => {
            const pending = sudoFor
            setSudoFor(null)
            setState((s) => (s ? { ...s, sudo: true } : s))
            if (pending) run(pending)
          }}
        />
      ) : null}

      <CreatePasskeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setCreateOpen(false)
          void refresh()
        }}
        onSudoRequired={() => {
          setCreateOpen(false)
          requireSudo({ kind: "create" })
        }}
      />

      <RenamePasskeyDialog
        item={renaming}
        onClose={() => setRenaming(null)}
        onRenamed={(id, name) => {
          setRenaming(null)
          setState((s) =>
            s
              ? {
                  ...s,
                  passkeys: s.passkeys.map((p) =>
                    p.id === id ? { ...p, name } : p
                  ),
                }
              : s
          )
        }}
      />

      <DeletePasskeyDialog
        item={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={() => {
          setDeleting(null)
          toast.success("Geçiş anahtarı silindi.")
          void refresh()
        }}
        onSudoRequired={(item) => {
          setDeleting(null)
          requireSudo({ kind: "delete", item })
        }}
      />
    </>
  )
}

// Saf görünüm: liste ve eylem tetikleyicileri.
export function PasskeysGroupView({
  passkeys,
  supported,
  onCreate,
  onRename,
  onDelete,
}: {
  passkeys: PasskeyItem[]
  supported: boolean
  onCreate: () => void
  onRename: (item: PasskeyItem) => void
  onDelete: (item: PasskeyItem) => void
}) {
  return (
    <SettingGroup title="Geçiş anahtarları">
      <SettingRow
        title="Şifresiz giriş"
        target="gecis-anahtarlari"
        description={
          supported
            ? "Parmak izin, yüzün ya da ekran kilidinle giriş yap"
            : "Bu tarayıcı geçiş anahtarlarını desteklemiyor"
        }
      >
        <Button
          variant="outline"
          size="sm"
          disabled={!supported}
          onClick={onCreate}
        >
          Oluştur
        </Button>
      </SettingRow>
      {passkeys.map((p) => (
        <SettingRow
          key={p.id}
          title={p.name}
          titleAccessory={
            <Badge variant="secondary">
              {p.synced ? "Senkronize" : "Cihaza bağlı"}
            </Badge>
          }
          description={[
            p.provider && p.provider !== p.name ? p.provider : null,
            `Eklendi ${fmt(p.createdAt)}`,
            p.lastUsedAt
              ? `Son kullanım ${fmt(p.lastUsedAt)}`
              : "Henüz kullanılmadı",
          ]
            .filter(Boolean)
            .join(" · ")}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Geçiş anahtarı eylemleri"
                hitArea
              >
                <RiMoreLine />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuItem onSelect={() => onRename(p)}>
                Yeniden adlandır
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => onDelete(p)}
              >
                Sil
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SettingRow>
      ))}
    </SettingGroup>
  )
}

function PasskeysSkeleton() {
  return (
    <SettingGroup title="Geçiş anahtarları">
      <div className="flex items-center justify-between gap-3 py-3">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-7 w-20" />
      </div>
    </SettingGroup>
  )
}

function RenamePasskeyDialog({
  item,
  onClose,
  onRenamed,
}: {
  item: PasskeyItem | null
  onClose: () => void
  onRenamed: (id: string, name: string) => void
}) {
  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {item ? (
          <RenameForm key={item.id} item={item} onRenamed={onRenamed} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function RenameForm({
  item,
  onRenamed,
}: {
  item: PasskeyItem
  onRenamed: (id: string, name: string) => void
}) {
  const [name, setName] = React.useState(item.name)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState("")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setError("")
    setBusy(true)
    const res = await renamePasskeyAction({ id: item.id, name })
    setBusy(false)
    if (res.ok) onRenamed(item.id, res.name)
    else setError(res.error)
  }

  return (
    <form onSubmit={submit}>
      <DialogHeader>
        <DialogTitle>Geçiş anahtarını yeniden adlandır</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-3 py-3">
        <Field>
          <FieldLabel htmlFor="passkey-name">Ad</FieldLabel>
          <Input
            id="passkey-name"
            autoFocus
            required
            maxLength={PASSKEY_NAME_MAX}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        {error ? <FormError>{error}</FormError> : null}
      </div>
      <DialogFooter>
        <Button variant="default" type="submit" disabled={busy || !name.trim()}>
          {busy ? <Spinner /> : null}
          Kaydet
        </Button>
      </DialogFooter>
    </form>
  )
}

function DeletePasskeyDialog({
  item,
  onClose,
  onDeleted,
  onSudoRequired,
}: {
  item: PasskeyItem | null
  onClose: () => void
  onDeleted: () => void
  onSudoRequired: (item: PasskeyItem) => void
}) {
  const [busy, setBusy] = React.useState(false)

  async function confirm() {
    if (!item || busy) return
    setBusy(true)
    const res = await deletePasskeyAction({ id: item.id })
    setBusy(false)
    if (res.ok) onDeleted()
    else if ("code" in res && res.code === "sudo_required") onSudoRequired(item)
    else toast.error(res.error)
  }

  return (
    <AlertDialog
      open={item !== null}
      onOpenChange={(open) => !open && !busy && onClose()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Geçiş anahtarını sil</AlertDialogTitle>
          <AlertDialogDescription>
            “{item?.name}” silinecek ve bu anahtarla artık giriş yapamayacaksın.
            Destekleyen tarayıcılarda şifre yöneticindeki kopyası da otomatik
            kaldırılır; değilse oradan ayrıca silebilirsin.
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
            {busy ? "Siliniyor…" : "Sil"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
