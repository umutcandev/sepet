"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"

import { Button } from "@/components/ui/button"
import { HeroMarketBadge } from "@/components/hero-market-badge"
import { AnimateEnter } from "@/components/motion/animate-enter"
import { PressFx } from "@/components/motion/press-fx"
import { type PromptInputMessage } from "@/components/ai-elements/prompt-input"
import { AssistantPrompt } from "@/components/assistant/assistant-prompt"

import { useRequireAuth } from "@/lib/hooks/use-require-auth"
import { useRequireLocation } from "@/lib/hooks/use-require-location"
import { useCurrentUser } from "@/components/providers/session-provider"

const CHIPS = [
  "Fiş veya yemek fotoğrafımı analiz et",
  "Nohutlu pilav yapmak istiyorum",
  "Limonata için malzemeler",
]

const ROTATING_HEADINGS = [
  "Liste yapalım mı?",
  "Fiş okuyalım mı?",
  "Yemeğe bakalım mı?",
  "Tarif fiyatlayalım mı?",
  "Bütçe kuralım mı?",
]

const ASSISTANT_SEED_KEY = "assistant:seed"
const ASSISTANT_FILE_KEY = "assistant:file"

/**
 * Hero yüksekliğini `100svh`e değil, BİR KEZ ölçülen bir değere bağlar.
 *
 * Kök layout `interactiveWidget: "resizes-content"` kullanıyor (mobil login
 * dialogunda odaklanan input klavyenin altında kalmasın diye). Bunun yan
 * etkisi: klavye açılınca LAYOUT viewport küçülüyor ve `svh` dâhil bütün
 * viewport birimleri yeniden hesaplanıyor. Ana sayfada hero 809px'ten 336px'e
 * çöküyor, altındaki logo şeridi prompt'un dibine tırmanıyordu (ölçüldü).
 *
 * `--hero-vh` yalnız GENİŞLİK değiştiğinde (döndürme, pencere boyutlandırma)
 * tazelenir; yalnız yüksekliğin değiştiği resize = klavye demektir, yok sayılır.
 * JS çalışmazsa Tailwind sınıfındaki `100svh` fallback'i devrededir.
 */
function useFrozenViewportHeight() {
  React.useEffect(() => {
    const root = document.documentElement
    const apply = () =>
      root.style.setProperty("--hero-vh", `${window.innerHeight}px`)

    let lastWidth = window.innerWidth
    apply()

    const onResize = () => {
      if (window.innerWidth === lastWidth) return
      lastWidth = window.innerWidth
      apply()
    }

    window.addEventListener("resize", onResize)
    return () => {
      window.removeEventListener("resize", onResize)
      root.style.removeProperty("--hero-vh")
    }
  }, [])
}

export function HomeHero() {
  const router = useRouter()
  useFrozenViewportHeight()
  const guard = useRequireAuth()
  const locationGuard = useRequireLocation()
  // displayUser: çözümlenmiş kullanıcı ya da localStorage snapshot'ı — isim
  // /api/me beklenmeden hidrasyonla birlikte gelir, başlık geç swap yapmaz.
  const { displayUser } = useCurrentUser()

  const firstName = displayUser?.name
    ? displayUser.name.trim().split(/\s+/)[0]
    : ""

  // İsim ilk boyamada YOK: snapshot hidrasyon güvenli okunuyor (session-provider,
  // useSyncExternalStore) ve ilk istemci render'ında sunucu değerini (null)
  // döndürüyor. Adı geldiği anda uygulamak, daha yeni girmiş olan başlığı aynı
  // yerde ikinci kez anime ediyordu: "Market fişine göz atalım mı?" → hemen
  // "Can, market fişine göz atalım mı?". Bunun yerine ad rotasyon sınırında
  // devralınır — ekrandaki cümle olduğu gibi kalır, ad sıradaki geçişle gelir.
  const [activeFirstName, setActiveFirstName] = React.useState(firstName)
  const firstNameRef = React.useRef(firstName)

  React.useEffect(() => {
    firstNameRef.current = firstName
  }, [firstName])

  const headings = React.useMemo(() => {
    if (!activeFirstName) return ROTATING_HEADINGS
    return ROTATING_HEADINGS.map((heading) => {
      const lowerFirst = heading.charAt(0).toLowerCase() + heading.slice(1)
      return `${activeFirstName}, ${lowerFirst}`
    })
  }, [activeFirstName])

  const [input, setInput] = React.useState("")
  const [headingIndex, setHeadingIndex] = React.useState(0)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined

    // Ad ve index birlikte ilerler: ikisi tek geçişte değişsin, ad kendi başına
    // araya girip fazladan bir animasyon tetiklemesin.
    const advance = () => {
      setActiveFirstName(firstNameRef.current)
      setHeadingIndex((prev) => (prev + 1) % ROTATING_HEADINGS.length)
    }

    const timeoutId = setTimeout(() => {
      advance()
      intervalId = setInterval(advance, 10000)
    }, 3200)

    return () => {
      clearTimeout(timeoutId)
      if (intervalId) clearInterval(intervalId)
    }
  }, [])

  // Önce auth, sonra konum kapısı: giriş yoksa login modalı, konum yoksa konum
  // modalı açılır; kaydedince gönderim kaldığı yerden devam eder.
  const submitToAssistant = (message: PromptInputMessage) => {
    if (isSubmitting) return

    const text = message.text?.trim() ?? ""
    const imageFile = (message.files ?? []).find((f) =>
      f.mediaType?.startsWith("image/")
    )

    if (!text && !imageFile) return

    if (typeof window !== "undefined") {
      if (text) {
        window.sessionStorage.setItem(ASSISTANT_SEED_KEY, text)
      }
      if (imageFile) {
        // Store file info so assistant page can pick it up
        window.sessionStorage.setItem(
          ASSISTANT_FILE_KEY,
          JSON.stringify({
            url: imageFile.url,
            mediaType: imageFile.mediaType,
            filename: imageFile.filename,
          })
        )
        // If no text was given, set a default seed
        if (!text) {
          window.sessionStorage.setItem(
            ASSISTANT_SEED_KEY,
            "Bu görseli analiz et"
          )
        }
      }
    }

    setIsSubmitting(true)
    setInput("")
    router.push("/asistan")
  }

  const handleSubmit = guard(locationGuard(submitToAssistant))

  const handleChip = guard((chip: string) => {
    setInput(chip)
  })

  return (
    <>
      <link rel="preload" as="image" href="/market-logos/a101.webp" />
      <link rel="preload" as="image" href="/market-logos/migros.webp" />
      <link rel="preload" as="image" href="/market-logos/sok.webp" />
      <link rel="preload" as="image" href="/market-logos/bim.webp" />
      <link rel="preload" as="image" href="/market-logos/tarim-kredi.webp" />
      <link rel="preload" as="image" href="/market-logos/carrefoursa.webp" />
      <div className="relative flex min-h-[calc(var(--hero-vh,100svh)-4rem)] flex-col items-center justify-center overflow-hidden px-4 pb-16">
        {/* ZEMİN BURADA DEĞİL. Hero'nun arkasındaki Warp shader'ı app-shell'de,
            header ile <main>'in ALTINDA duran bir katman (HomeHeroBackdrop).

            Sebep: shader'ın `colorBack`i yok, tuvalin tamamı renkli. Zemin
            hero'nun içinde kaldığı sürece header ayrı bir `bg-background`
            şeridi oluyor ve tepede sayfayı kesen bir renk basamağı kalıyordu;
            maskeyle/fade ile gizlemeye çalışmak basamağın yerine soluk bir bant
            koyuyordu. Tek zemin ikisinin de altından geçince basamak diye bir
            şey kalmıyor. Gerekçenin tamamı hero-shader.tsx'in başında.

            `--hero-vh` (aşağıdaki hook) o katmanın da yüksekliğini veriyor:
            header 4rem + bu kap calc(--hero-vh - 4rem) = --hero-vh. */}
        {/* Kolon başlıkla birlikte genişler; prompt ve chip'ler kendi
            `max-w-2xl`lerinde kalır. Sebep: dönen başlıkların en uzunu
            ("Abdurrahman, yemeğe bakalım mı?") Cooper'da 15.82em — büyük
            puntoda tek satırda durabilmesi için geniş bir kap şart, ama girdi
            alanının aynı oranda genişlemesi ergonomiyi bozar. Basamaklar
            ölçülerek seçildi (bkz. h1). */}
        <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-6 sm:max-w-3xl lg:max-w-5xl lg:gap-8 xl:max-w-6xl">
          <div className="flex w-full flex-col items-center gap-3 text-center">
            {/* Hero ilk ekranda: scroll beklenmez, açılışta kademeli girer.
                Sıra rozet → başlık → prompt → chip, adım ~0.12s. Şeridin
                gecikmesi de bu diziyi sürdürür (home-blog-section). */}
            <AnimateEnter isWhileInView={false} delay={0.1}>
              <HeroMarketBadge />
            </AnimateEnter>
            {/* Başlık da diziye dahil. İçindeki AnimatePresence ile çakışmaz:
                bu sarmalayıcı yalnızca açılışta bir kez oynar (~0.85s'de biter),
                rotasyon ise 3.2s'de başlar. Sarmalayıcı olmadan ilk başlık
                (AnimatePresence initial={false} olduğu için) animasyonsuz,
                birden beliriyordu. */}
            <AnimateEnter isWhileInView={false} delay={0.22} className="w-full">
              {/* Vitrin yüzü (Cooper) — kapanış çağrısındaki başlıkla eşleşir.
                  Ağırlık `font-normal`: ailede yalnız 400 kayıtlı, `font-bold`
                  tarayıcıya sahte bold çizdirirdi (bkz. lib/fonts.ts).

                  Punto basamakları fontun gerçek hmtx metrikleriyle seçildi: en
                  uzun cümle ("Abdurrahman, yemeğe bakalım mı?") 15.82em tutuyor,
                  yani tek satır için text-5xl'de 760px, text-6xl'de 950px ister.
                  Basamaklar bu yüzden kabın büyüdüğü kırılımlara bağlı: lg'de iç
                  genişlik 992px, xl'de 1120px — ikisi de kendi puntosunu tek
                  satırda taşıyor.

                  YÜKSEKLİK REZERVİ SATIR SAYISINA GÖRE, bu yüzden iki basamaklı.
                  Sorun şuydu: mobilde başlıkların bir kısmı tek, bir kısmı çift
                  satır oluyor (320px'te kap 288px, en uzun cümle 475px) ve
                  rotasyon her döndüğünde kabın boyu değişip altındaki prompt
                  zıplıyordu. Rezerv en kötü satır sayısına sabitlenince kutunun
                  boyu HİÇ değişmiyor; kısa başlık ortalanmış duruyor, uzun olan
                  tam oturuyor. Ölçüldü: sm altında en fazla 2 satır, sm'den
                  itibaren (kap 608px, punto 36px) hepsi tek satır.

                  Birim `rem` değil `em`: punto her basamakta değişiyor, sabit
                  bir rem ya fazla boşluk bırakır ya da yetmezdi. Satır yüksekliği
                  1.06 (cn-font-display), yani 2 satır = 2.12em; 2.2em ve 1.2em
                  değerleri o tavanların hemen üstünde duruyor. */}
              <h1 className="relative flex min-h-[2.2em] items-center justify-center cn-font-display text-3xl font-normal sm:min-h-[1.2em] sm:text-4xl lg:text-5xl xl:text-6xl">
                <AnimatePresence mode="wait" initial={false}>
                  {/* Anahtar index değil metnin kendisi. Ad artık yalnızca
                    rotasyonla birlikte değiştiği için metin de tam o anda
                    değişir; anahtar ikisini tek geçişte toplar. */}
                  <motion.span
                    key={headings[headingIndex]}
                    initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    // `text-balance`: dar ekranda uzun başlık iki satıra
                    // düştüğünde satırlar eşit uzunlukta kırılsın, tek kelimelik
                    // sarkan bir alt satır kalmasın.
                    className="inline-block text-balance"
                  >
                    {headings[headingIndex]}
                  </motion.span>
                </AnimatePresence>
              </h1>
            </AnimateEnter>
          </div>

          <AnimateEnter
            isWhileInView={false}
            delay={0.34}
            className="w-full max-w-2xl"
          >
            <AssistantPrompt
              input={input}
              setInput={setInput}
              onSubmit={handleSubmit}
              status={isSubmitting ? "submitted" : undefined}
              className="w-full"
            />
          </AnimateEnter>

          <AnimateEnter
            isWhileInView={false}
            delay={0.46}
            className="w-full max-w-2xl"
          >
            <div className="flex flex-wrap justify-center gap-2">
              {CHIPS.map((chip) => (
                <PressFx key={chip}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleChip(chip)}
                    className="h-auto rounded-lg border-border bg-muted px-3 py-1.5 text-xs font-normal text-muted-foreground hover:border-foreground/20 hover:bg-muted hover:text-foreground dark:border-muted-foreground/25 dark:bg-muted dark:hover:border-muted-foreground/35 dark:hover:bg-muted"
                  >
                    {chip}
                  </Button>
                </PressFx>
              ))}
            </div>
          </AnimateEnter>
        </div>
      </div>
    </>
  )
}
