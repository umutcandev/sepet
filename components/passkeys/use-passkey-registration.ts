"use client"

import * as React from "react"
import {
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
} from "@simplewebauthn/browser"

import {
  beginPasskeyRegistrationAction,
  finishPasskeyRegistrationAction,
  type PasskeyItem,
} from "@/lib/actions/passkeys"

type Args = {
  onCreated: (passkey: PasskeyItem) => void
  /** Sudo penceresi yok ya da kapandı: çağıran kimlik doğrulamayı açar. */
  onSudoRequired: () => void
}

/**
 * Geçiş anahtarı oluşturma (Ayarlar + giriş sonrası öneri diyaloğu). Seçenekler
 * `prepare()` ile önceden çekilir; `create()` tıklamada hiçbir await olmadan
 * tarayıcı penceresini açar (Safari user-gesture kuralı). Başarısız denemeden
 * sonra seçenekler yenilenir.
 */
export function usePasskeyRegistration({ onCreated, onSudoRequired }: Args) {
  const [options, setOptions] =
    React.useState<PublicKeyCredentialCreationOptionsJSON | null>(null)
  const [preparing, setPreparing] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState("")

  const argsRef = React.useRef({ onCreated, onSudoRequired })
  React.useEffect(() => {
    argsRef.current = { onCreated, onSudoRequired }
  })

  const prepare = React.useCallback(async () => {
    setOptions(null)
    setPreparing(true)
    const res = await beginPasskeyRegistrationAction().catch(() => null)
    setPreparing(false)
    if (!res) {
      setError("Bağlantı kurulamadı. Tekrar dene.")
      return
    }
    if (!res.ok) {
      if (res.code === "sudo_required") argsRef.current.onSudoRequired()
      else setError(res.error)
      return
    }
    setOptions(res.options)
  }, [])

  const create = React.useCallback(() => {
    if (!options || busy) return
    setError("")
    setBusy(true)
    startRegistration({ optionsJSON: options })
      .then(async (response) => {
        const res = await finishPasskeyRegistrationAction({ response })
        setBusy(false)
        if (res.ok) {
          setOptions(null)
          argsRef.current.onCreated(res.passkey)
          return
        }
        setError(res.error)
        void prepare()
      })
      .catch((err: unknown) => {
        setBusy(false)
        const name = err instanceof Error ? err.name : ""
        // excludeCredentials: bu şifre yöneticisinde hesaba ait anahtar zaten var.
        if (name === "InvalidStateError") {
          setError(
            "Bu cihazda ya da şifre yöneticinde bu hesap için zaten bir geçiş anahtarın var."
          )
        } else if (name !== "NotAllowedError" && name !== "AbortError") {
          setError("Geçiş anahtarı oluşturulamadı. Tekrar dene.")
        }
        void prepare()
      })
  }, [options, busy, prepare])

  return {
    ready: options !== null,
    preparing,
    busy,
    error,
    prepare,
    create,
  }
}
