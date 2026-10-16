"use client"

import * as React from "react"
import {
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  sendSignal,
  startAuthentication,
  WebAuthnAbortService,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser"

import {
  beginPasskeyLoginAction,
  passkeyLoginAction,
} from "@/lib/actions/passkeys"
import { isRpIdValidForHost } from "@/lib/auth/webauthn-config"
import { passkeysUsableHere } from "@/lib/auth/passkey-availability"

// Sunucudaki challenge 5 dk yaşıyor; süresi dolmadan tazelenir.
const REFRESH_MS = 4 * 60 * 1000

type Args = {
  callbackUrl?: string
  onSuccess: (callbackUrl: string) => void
  onError: (message: string) => void
}

/**
 * Giriş modalında geçiş anahtarı. İki yol aynı önceden çekilmiş seçenekleri
 * kullanır:
 *  - Otomatik doldurma (conditional UI): `autocomplete="username webauthn"`
 *    alanına odaklanınca tarayıcı kayıtlı anahtarları önerir. Modal açık
 *    kaldıkça bekleyen istek durur, kapanınca iptal edilir.
 *  - Buton (modal istek): tıklamada hiçbir await olmadan başlar — Safari, async
 *    bir fetch'ten sonra gelen WebAuthn çağrısını kullanıcı etkileşiminden kopmuş
 *    sayıp reddedebiliyor. Başlaması bekleyen otomatik doldurma isteğini iptal
 *    eder (SimpleWebAuthn tek tören tutar).
 * Her törenden sonra challenge yandığı için seçenekler yeniden çekilir.
 */
export function usePasskeyLogin({ callbackUrl, onSuccess, onError }: Args) {
  // Dialog içeriği yalnız istemcide mount olur → lazy initializer güvenli.
  // rpID bu host'a uymuyorsa (preview, LAN IP'si) buton hiç çizilmez; sunucu
  // seçenekleri gelince gizlenip "1 sn görünüp kaybolma" olmaz.
  const [available, setAvailable] = React.useState(
    () => browserSupportsWebAuthn() && passkeysUsableHere()
  )
  const [busy, setBusy] = React.useState(false)

  const optionsRef = React.useRef<PublicKeyCredentialRequestOptionsJSON | null>(
    null
  )
  const autofillRef = React.useRef(false)
  // Modal tören sürerken tazeleme/otomatik doldurma onu iptal etmemeli.
  const modalRef = React.useRef(false)
  const busyRef = React.useRef(false)
  // Yönlendirme başladıysa ya da bileşen söküldüyse hiçbir şey yapma.
  const stoppedRef = React.useRef(false)

  const argsRef = React.useRef({ callbackUrl, onSuccess, onError })
  React.useEffect(() => {
    argsRef.current = { callbackUrl, onSuccess, onError }
  })

  const setBusyBoth = React.useCallback((value: boolean) => {
    busyRef.current = value
    setBusy(value)
  }, [])

  // load ↔ verify karşılıklı çağrılıyor; ref üzerinden bağlanır.
  const loadRef = React.useRef<() => Promise<void>>(async () => {})

  const verify = React.useCallback(
    async (response: AuthenticationResponseJSON) => {
      if (stoppedRef.current) return
      const rpID = optionsRef.current?.rpId
      optionsRef.current = null
      setBusyBoth(true)
      const { callbackUrl: target, onSuccess, onError } = argsRef.current
      // Ağ hatası reddetmesin: otomatik doldurma yolunda hata yutulduğu için
      // busy takılı kalırdı.
      const res = await passkeyLoginAction({
        response,
        callbackUrl: target,
      }).catch(() => ({
        ok: false as const,
        error: "Bağlantı kurulamadı. Tekrar dene.",
        code: undefined,
      }))
      if (stoppedRef.current) return
      if (res.ok) {
        stoppedRef.current = true
        onSuccess(res.callbackUrl)
        return // busy kalır; sayfa yönleniyor
      }
      setBusyBoth(false)
      // Sunucuda silinmiş anahtar: şifre yöneticisi de öneriden kaldırsın
      // (Signal API; desteklemeyen tarayıcıda sessizce atlanır).
      if (res.code === "passkey_unknown" && rpID) {
        void sendSignal({
          signalName: "unknownCredential",
          rpID,
          credentialID: response.id,
        }).catch(() => {})
      }
      onError(res.error)
      void loadRef.current()
    },
    [setBusyBoth]
  )

  const arm = React.useCallback(() => {
    const optionsJSON = optionsRef.current
    if (!optionsJSON || !autofillRef.current || modalRef.current) return
    startAuthentication({
      optionsJSON,
      useBrowserAutofill: true,
      // Alan o an ekranda olmayabilir (ör. kayıt aşaması); tarayıcı istek
      // bekledikçe uygun alan göründüğünde öneriyi gösterir.
      verifyBrowserAutofillInput: false,
    })
      .then(verify)
      // İptal (modal istek / tazeleme / kapanış) ve diğer hatalar: sessiz.
      // Yeniden kurma burada YAPILMAZ — iptali başlatan taraf kurar.
      .catch(() => {})
  }, [verify])

  const load = React.useCallback(async () => {
    if (stoppedRef.current) return
    const res = await beginPasskeyLoginAction().catch(() => null)
    if (stoppedRef.current) return
    if (!res) return
    if (!res.ok) {
      // Ortamda kapalı (ör. preview): butonu hiç gösterme. Hız limiti gibi
      // geçici hatalarda buton kalır; tıklamada yeniden denenir.
      if (res.code === "disabled") setAvailable(false)
      return
    }
    // rpID bu sayfanın alan adına uymuyorsa (yanlış yapılandırma, LAN IP'si)
    // tören tarayıcıda SecurityError ile düşer → hiç önerme.
    const rpId = res.options.rpId
    if (!rpId || !isRpIdValidForHost(rpId, window.location.hostname)) {
      setAvailable(false)
      return
    }
    optionsRef.current = res.options
    if (!modalRef.current && !busyRef.current) arm()
  }, [arm])

  React.useEffect(() => {
    loadRef.current = load
  }, [load])

  React.useEffect(() => {
    // Kullanılamayacak ortamda seçenek (ve Redis'te challenge) hiç üretilmez.
    if (!browserSupportsWebAuthn() || !passkeysUsableHere()) return
    stoppedRef.current = false
    let active = true
    void browserSupportsWebAuthnAutofill()
      .then((supported) => {
        autofillRef.current = supported
      })
      .catch(() => {})
      .finally(() => {
        if (active) void load()
      })
    const timer = window.setInterval(() => {
      if (!modalRef.current && !busyRef.current) void load()
    }, REFRESH_MS)
    return () => {
      active = false
      window.clearInterval(timer)
      // Yönlendirme başlamadıysa bekleyen otomatik doldurma isteğini kapat.
      if (!stoppedRef.current) WebAuthnAbortService.cancelCeremony()
      stoppedRef.current = true
    }
  }, [load])

  const signIn = React.useCallback(() => {
    if (busyRef.current || stoppedRef.current) return
    const optionsJSON = optionsRef.current
    if (!optionsJSON) {
      // Seçenekler henüz yok (ilk istek bitmedi ya da başarısız oldu):
      // çek ve sonra başlat. Nadir yol; Safari'de ikinci tıklama gerekebilir.
      void loadRef.current()
      argsRef.current.onError("Geçiş anahtarı hazırlanıyor, tekrar dene.")
      return
    }
    modalRef.current = true
    startAuthentication({ optionsJSON })
      .then((response) => {
        modalRef.current = false
        return verify(response)
      })
      .catch((err: unknown) => {
        modalRef.current = false
        if (stoppedRef.current) return
        const name = err instanceof Error ? err.name : ""
        // Kullanıcı vazgeçti ya da süre doldu: sessiz kal (NotAllowedError).
        if (name !== "NotAllowedError" && name !== "AbortError") {
          argsRef.current.onError("Geçiş anahtarıyla giriş yapılamadı.")
        }
        void loadRef.current()
      })
  }, [verify])

  return { available, busy, signIn }
}
