"use client"

// Özellik kartlarının SOLDAKİ maketi: bir kart göstermek yerine o kartı
// DOĞURAN konuşmayı canlandırır.
//
//   1. Kullanıcı mesajını gönderir (balon sağdan oturur)
//   2. "Hallediyorum…"            — araç çağrısı işareti (3 sn)
//   3. "Düşünüyorum"              — reasoning satırı (3 sn)
//   4. Sepetindeki Kalemler kartı — insanın onayladığı adım
//
// Metinler uydurma değil: assistant-chat'te sepet taslağı aracının yükleme
// etiketi birebir "Hallediyorum…", reasoning satırı da akış sırasında
// "Düşünüyorum"dur (bkz. renderToolPart ve ReasoningBlock). Kart da
// basket-approval-card'ın statik ikizi.
//
// Üç beat aynı YUVAYI paylaşır: durum satırı çıkar, yerine bir sonraki gelir,
// en sonunda yuvayı kart devralır. Satırlar üst üste yığılsaydı kart 60px
// aşağıdan başlar, panelin bulanık dibine gömülürdü.
//
// Kart gelince maket KENDİ İÇİNDE kaydırılır: sohbet, tıpkı gerçeğinde olduğu
// gibi son mesajı takip eder, balon yukarıdan çıkar ve kart panelin tepesine
// oturur. Kaydırma gerçek bir scroll kabı DEĞİL, `transform` — kullanıcının
// tekerlekle/parmağıyla karışabileceği bir yüzey bırakmıyoruz; maket
// `pointer-events-none` ile tamamen dokunulmaz.
//
// DİNLENME HÂLİ SON KAREDİR (balon + kart). JS hiç çalışmazsa, motion
// yüklenmezse ya da kullanıcı hareket azaltma istiyorsa maket eksiksiz ve sabit
// görünür; zamanlayıcı da observer da kurulmaz. Sıfırlama useLayoutEffect'te,
// yani ilk boyamadan ÖNCE yapılır: son kare bir kare bile görünüp geri sarmaz.

import * as React from "react"
import { AnimatePresence, motion, type Variants } from "motion/react"
import {
  RiAddLine,
  RiArrowDownSLine,
  RiCheckLine,
  RiCloseLine,
} from "@remixicon/react"

import { EASE_OUT_EXPO, SPRING_SLIDE } from "@/lib/motion"
import { cn } from "@/lib/utils"

/* ── Zamanlama ────────────────────────────────────────────────────────────── */

/** Balon oturur, kısa bir nefes, sonra ilk durum satırı. */
const SEND_MS = 900
/** Her durum satırının ekranda kaldığı süre. */
const BEAT_MS = 3000

type Phase = "idle" | "sent" | "tool" | "thinking" | "widget"

/* ── Hareket ──────────────────────────────────────────────────────────────── */

// Balon "gönderildi" hissi için yayla oturur (projedeki liste öğesi yayı);
// opacity ayrı tween, yoksa yayın uzun kuyruğunda ağır ağır silikleşir.
const BUBBLE: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.96 },
  shown: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...SPRING_SLIDE,
      opacity: { duration: 0.25, ease: "easeOut" },
    },
  },
}

// Durum satırları yerinde takas olur: biri yukarı süzülüp bulanıklaşarak çıkar,
// diğeri aşağıdan netleşerek girer. Dil `reveal-fx` ile aynı (yüksel + netleş),
// yalnızca mesafesi kısaltılmış hâli.
const STATUS: Variants = {
  hidden: { opacity: 0, y: 6, filter: "blur(4px)" },
  shown: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.35, ease: EASE_OUT_EXPO },
  },
  out: {
    opacity: 0,
    y: -6,
    filter: "blur(4px)",
    transition: { duration: 0.2, ease: "easeIn" },
  },
}

// Kart girerken satırları kademeli açılır. `when: "beforeChildren"`
// KULLANILMIYOR: kartın kendi geçişi bitmeden satırlar başlasın, yoksa toplam
// giriş 1,4 sn'ye çıkıp ağırlaşıyor. Ölçek animasyonu da yok — kartın kılcal
// halkası (smooth-shadow-ring) ölçeklenirken bulanıklaşıyordu.
const CARD: Variants = {
  hidden: { opacity: 0, y: 10, filter: "blur(6px)" },
  shown: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.5,
      ease: EASE_OUT_EXPO,
      delayChildren: 0.1,
      staggerChildren: 0.06,
    },
  },
}

const ROW: Variants = {
  hidden: { opacity: 0, y: 8 },
  shown: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE_OUT_EXPO },
  },
}

// Kaydırma kartın ARDINDAN gelir: önce kart yerine oturmaya başlar, sonra
// görüş onu takip eder. Aynı anda başlarlarsa ikisi tek bir kayma gibi okunuyor.
const SCROLL_TRANSITION = { duration: 0.6, ease: EASE_OUT_EXPO, delay: 0.22 }

/* ── Ölçüler ──────────────────────────────────────────────────────────────── */

// Sohbetin çerçevesi HER YÖNDE 14px: `px-3.5`. Sağdaki `mr-5` çerçeve DEĞİL,
// taşma payı — panel kartın sağından 20px taşıyor (home-features-section'daki
// MOCK_PANEL), o 20px düşülmezse içerik kartın görünen sağ kenarına 14px değil
// -6px kalıyor. İkisi ayrı yazılıyor ki hangisinin çerçeve, hangisinin
// düzeltme olduğu okunsun. Soldaki 14px bölümün ROW_X'iyle de aynı: üç maketin
// içeriği aynı hizada başlar.
const CHAT_X = "px-3.5 mr-5"

// Dikey ritim aynı 14px'e bağlı ve `gap` ile `pt` EŞİT OLMAK ZORUNDA:
// kaydırma balonun alt kenarını panelin tepesine getirdiği için kartın üst
// boşluğu `gap` kadar olur. Eşit değillerse kaydırmadan önceki üst boşluk ile
// sonraki farklı görünür.
const CHAT_Y = "flex flex-col gap-3.5 pt-3.5"

// Durum satırları: assistant-chat'teki Marker/ThinkingText ile aynı punto ve
// renk. `shimmer` globals.css'ten gelir ve hareket azaltmada kendini kapatır.
const STATUS_ROW =
  "flex items-center gap-1 text-sm font-medium text-muted-foreground"

// Alan görünümü: gerçek Input/NativeSelect yerine aynı ölçüde statik kutular.
const FIELD =
  "rounded-md bg-black/25 px-2 py-1 text-xs text-foreground ring-1 ring-white/10"

const DRAFT_ITEMS = [
  { name: "pirinç", qty: "500", unit: "g" },
  { name: "haşlanmış nohut", qty: "200", unit: "g" },
  { name: "sıvı yağ", qty: "1", unit: "l" },
  { name: "tuz", qty: "1", unit: "paket" },
]

// useLayoutEffect sunucuda çalışmaz ve React uyarı basar; Next istemci
// bileşenlerini de SSR ettiği için izomorfik sarmalayıcı gerekiyor
// (animate-enter.tsx'te de aynısı var).
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect

export function FeatureChatMock() {
  const ref = React.useRef<HTMLDivElement>(null)
  const bubbleRef = React.useRef<HTMLDivElement>(null)
  const [phase, setPhase] = React.useState<Phase>("widget")
  // Kaydırma miktarı ÖLÇÜLÜR, sabit yazılmaz: balon dar kartta iki satıra
  // sarabilir. Balonun alt kenarı ile sohbetin üst kenarı arası kadar
  // kaydırınca balon tam olarak panelin dışında kalır.
  const [scrollY, setScrollY] = React.useState(0)

  useIsomorphicLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // İkisinde de dinlenme hâli KALIR: konuşma tamamlanmış görünür.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return
    if (typeof IntersectionObserver === "undefined") return

    setPhase("idle")

    const timers: number[] = []
    // armed: bir sonraki görünürlükte oynatılabilir mi. Observer görünürlük
    // değiştikçe birden çok kez tetiklenir; bu bayrak olmasa kullanıcı
    // izlerken dizi baştan sarardı.
    let armed = true

    const clear = () => {
      for (const id of timers) window.clearTimeout(id)
      timers.length = 0
    }

    const play = () => {
      if (!armed) return
      armed = false
      setPhase("sent")
      timers.push(
        window.setTimeout(() => setPhase("tool"), SEND_MS),
        window.setTimeout(() => setPhase("thinking"), SEND_MS + BEAT_MS),
        window.setTimeout(
          () => {
            // Ölçüm tam kart gelmeden önce: o ana kadar balon yerine oturmuş,
            // punto yüklenmiş, kart genişliği kesinleşmiş olur.
            const bubble = bubbleRef.current
            if (el && bubble) {
              setScrollY(
                bubble.getBoundingClientRect().bottom -
                  el.getBoundingClientRect().top
              )
            }
            setPhase("widget")
          },
          SEND_MS + BEAT_MS * 2
        )
      )
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          play()
          return
        }
        // Tamamen çıktı: kalan beat'leri iptal et ve başa sar. Sıfırlama ekran
        // dışında olduğu için görünmez; kullanıcı geri döndüğünde diziyi
        // baştan izler.
        clear()
        armed = true
        setPhase("idle")
      },
      // Kartın üst kenarı ekranın son %10'una girmeden dizi başlamasın: aksi
      // hâlde beat'ler kart daha okunmadan tükeniyordu.
      { rootMargin: "0px 0px -10% 0px" }
    )
    io.observe(el)

    return () => {
      io.disconnect()
      clear()
    }
  }, [setPhase])

  const status =
    phase === "tool"
      ? { label: "Hallediyorum…", chevron: false }
      : { label: "Düşünüyorum", chevron: true }

  return (
    // shrink-0: içerik panelden (h-56) uzun, esnetilmemeli — kırpılmalı.
    // Kaydırmayı bu kabın `y`si yapar, panelin `overflow-hidden`ı kırpar.
    // pointer-events-none + select-none: maket seyredilir, kurcalanmaz.
    <motion.div
      ref={ref}
      initial={false}
      animate={{ y: phase === "widget" ? -scrollY : 0 }}
      transition={SCROLL_TRANSITION}
      className={cn("pointer-events-none shrink-0 select-none", CHAT_Y, CHAT_X)}
    >
      {/* Balon "idle"da da AKIŞTA durur (yalnızca opacity 0): yuva boş kalırsa
          durum satırı önce yukarıda doğup sonra aşağı zıplardı. */}
      <motion.div
        ref={bubbleRef}
        initial={false}
        animate={phase === "idle" ? "hidden" : "shown"}
        variants={BUBBLE}
        className="ml-auto w-fit max-w-[85%] rounded-lg bg-secondary px-3 py-1.5 text-[0.8125rem]/[1.125rem] text-foreground"
      >
        Bu akşam nohutlu pilav yapacağım
      </motion.div>

      {/* mode="wait": giren satır, çıkanın yerini tam boşalttıktan sonra gelir.
          İkisi aynı anda dururken yuva bir an iki satır boyu açılıyor. */}
      <AnimatePresence mode="wait" initial={false}>
        {phase === "tool" || phase === "thinking" ? (
          <motion.div
            // key evre: her beat kendi giriş/çıkışını oynasın.
            key={phase}
            variants={STATUS}
            initial="hidden"
            animate="shown"
            exit="out"
            className={STATUS_ROW}
          >
            <span className="shimmer">{status.label}</span>
            {status.chevron ? <RiArrowDownSLine className="size-4" /> : null}
          </motion.div>
        ) : phase === "widget" ? (
          // `exit` yok: kart yalnızca ekran dışındaki sıfırlamada kaldırılır,
          // orada da anında gitmesi doğru.
          <motion.div
            key="widget"
            variants={CARD}
            initial="hidden"
            animate="shown"
          >
            <DraftItemsCard />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  )
}

/* ── Sepetindeki Kalemler (basket-approval-card'ın ikizi) ─────────────────── */

function DraftItemsCard() {
  return (
    // Sohbetin içindeki kart, gerçeğindeki gibi kendi yüzeyi: `bg-card` panel
    // zemininden bir ton açık, kenarı gölgeyle tek katmanda (smooth-shadow-ring).
    //
    // Köşe panelinkinden KÜÇÜK olmalı: panel `rounded-xl` (14px), kart onun
    // 14px içinde duruyor. İkisi de 14px olsaydı iç içe iki eş köşe görsel
    // gerilim yaratırdı (better-ui/surfaces, eşmerkezli köşe kuralı). 10px
    // aynı zamanda balonun köşesi — paneldeki iki yüzey tek dilde konuşuyor.
    <div className="overflow-hidden rounded-lg bg-card smooth-shadow-ring-sm smooth-ring-white/15">
      <motion.div
        variants={ROW}
        className="border-b border-white/10 px-3 py-2 text-sm font-medium text-foreground"
      >
        Sepetindeki Kalemler
      </motion.div>
      <div className="px-3 pb-1">
        {/* Sütun başlıkları ve satırlar aynı genişlik yuvalarını kullanır
            (w-11 / w-14 / w-5) — gap'e bırakılsa adet ve birim sütunları
            satırdan satıra kayardı. */}
        <motion.div
          variants={ROW}
          className="flex items-center gap-2 pt-1.5 pb-1 text-[0.625rem]/[0.875rem] font-medium tracking-wide text-muted-foreground uppercase"
        >
          <span className="min-w-0 flex-1">Ürün</span>
          <span className="w-11 text-right">Adet</span>
          <span className="w-14">Birim</span>
          <span className="w-5" />
        </motion.div>
        {DRAFT_ITEMS.map((item) => (
          <motion.div
            key={item.name}
            variants={ROW}
            className="flex items-center gap-2 pb-1"
          >
            <span className={cn("min-w-0 flex-1 truncate", FIELD)}>
              {item.name}
            </span>
            <span className={cn("w-11 text-right tabular-nums", FIELD)}>
              {item.qty}
            </span>
            <span
              className={cn("flex w-14 items-center justify-between", FIELD)}
            >
              <span className="truncate">{item.unit}</span>
              <RiArrowDownSLine className="size-3 shrink-0 text-muted-foreground" />
            </span>
            <span className="flex w-5 justify-center">
              <RiCloseLine className="size-3.5 text-muted-foreground" />
            </span>
          </motion.div>
        ))}
      </div>
      {/* Eylem çubuğu kaydırma sonrası tam panelin bulanık dibine denk gelir:
          okunmaz ama kartın kenarını kırpılmadan bitirir, yani "aşağıda devamı
          var" hissi kalır. Çıkarılırsa kartın altında boş bir şerit oluşuyor. */}
      <motion.div
        variants={ROW}
        className="flex items-center gap-2 border-t border-white/10 bg-black/15 px-3 py-2"
      >
        <span className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-foreground ring-1 ring-white/15">
          <RiAddLine className="size-3" />
          Yeni kalem
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
            İptal
          </span>
          <span className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
            <RiCheckLine className="size-3" />
            Onayla
          </span>
        </span>
      </motion.div>
    </div>
  )
}
