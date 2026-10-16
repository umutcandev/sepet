"use client"

import * as React from "react"

import { toast } from "@/components/ui/sonner"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { FormError } from "@/components/ui/form-error"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { usePasskeyRegistration } from "@/components/passkeys/use-passkey-registration"
import type { PasskeyItem } from "@/lib/actions/passkeys"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (passkey: PasskeyItem) => void
  onSudoRequired: () => void
}

// Açıklama adımı bilinçli: seçenekler bu sırada çekilir, "Devam" tıklaması
// tarayıcı penceresini await olmadan açar (Safari user-gesture kuralı).
export function CreatePasskeyDialog({
  open,
  onOpenChange,
  onCreated,
  onSudoRequired,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open ? (
          <CreatePasskeyStep
            onCancel={() => onOpenChange(false)}
            onCreated={onCreated}
            onSudoRequired={onSudoRequired}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function CreatePasskeyStep({
  onCancel,
  onCreated,
  onSudoRequired,
}: {
  onCancel: () => void
  onCreated: (passkey: PasskeyItem) => void
  onSudoRequired: () => void
}) {
  const registration = usePasskeyRegistration({
    onCreated: (passkey) => {
      toast.success("Geçiş anahtarı oluşturuldu.")
      onCreated(passkey)
    },
    onSudoRequired,
  })
  const { prepare } = registration

  React.useEffect(() => {
    void prepare()
  }, [prepare])

  const waiting = registration.preparing || registration.busy

  return (
    <>
      <DialogHeader>
        <DialogTitle>Geçiş anahtarı oluştur</DialogTitle>
        <DialogDescription>
          Devam ettiğinde cihazın parmak izini, yüzünü ya da ekran kilidini
          isteyecek. Anahtar şifre yöneticinde saklanır ve cihazlarınla
          senkronize olabilir.
        </DialogDescription>
      </DialogHeader>
      <p className="text-xs leading-[1.5] text-muted-foreground">
        Geçiş anahtarıyla girişte iki adımlı doğrulama kodu sorulmaz; geçiş
        anahtarı tek başına iki faktörlüdür (cihazın + biyometri ya da PIN).
      </p>
      {registration.error ? <FormError>{registration.error}</FormError> : null}
      <DialogFooter>
        <Button variant="ghost" onClick={onCancel} disabled={registration.busy}>
          Vazgeç
        </Button>
        <Button
          variant="default"
          disabled={!registration.ready || waiting}
          onClick={registration.create}
        >
          {waiting ? <Spinner /> : null}
          Devam
        </Button>
      </DialogFooter>
    </>
  )
}
