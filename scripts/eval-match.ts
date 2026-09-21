/**
 * Faz 2 — golden set koşucusu. Seam `selectMatches` (lib/ai/tools.ts): match
 * cache'i çağıran tarafta olduğu için burası LLM'i ölçer, cache'i değil.
 *
 *   pnpm eval:match                     tek tur
 *   pnpm eval:match --repeat=3          kararsızlığı ortaya çıkarır
 *   pnpm eval:match --filter=peynir     sadece eşleşen id'ler
 *   pnpm eval:match --model=google/gemini-2.5-flash
 *   pnpm eval:match --json              makine okunur rapor
 *   pnpm eval:match --update-baseline   ELLE — temiz koşudan sonra
 *   pnpm eval:match --freeze-last       son koşuyu API'ye gitmeden baseline yap
 *   pnpm eval:match --fresh             checkpoint'i yoksay, baştan koş
 *
 * Yarıda kalan koşu checkpoint bırakır; aynı komutu tekrar koşmak kaldığı
 * yerden devam ettirir.
 *
 * CI'da KOŞMAZ (plan K3): env değişkeni + para + flakiness.
 */
import { readFile, rm, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { gateway } from "ai"

import {
  aggregateRuns,
  diffBaseline,
  scoreCase,
  summarizeBySplit,
  toBaseline,
} from "@/lib/ai/eval/score"
import type {
  AggregatedCase,
  Baseline,
  CaseResult,
  EvalReport,
  GoldenCase,
  SelectionOutput,
} from "@/lib/ai/eval/types"
import { GEMINI_FLASH } from "@/lib/ai/models"
import type { ParsedItem } from "@/lib/ai/schemas"
import { MATCH_PROMPT_VERSION, selectMatches } from "@/lib/ai/tools"
import type { ProductDetail } from "@/lib/marketfiyati/types"

const EVAL_DIR = join(process.cwd(), "lib/ai/eval")
const CASES_FILE = join(EVAL_DIR, "cases/match-golden.json")
const BASELINE_FILE = join(EVAL_DIR, "baseline.json")
const CKPT_FILE = join(EVAL_DIR, ".run-checkpoint.json")

/**
 * K4 — üretimdeki tipik sepete yakın batch; prompt uzunluğu kaliteyi etkiler.
 * --batch=N ile geçilebilir: batch boyutunun kaliteye etkisini ölçmek için.
 */
const DEFAULT_BATCH_SIZE = 8
/**
 * Bilinen modellerin M token başına fiyatı. --model ile listede olmayan bir
 * model koşulursa TUTAR BASILMAZ: yanlış fiyatla hesaplanmış bir rakam,
 * hiç rakam olmamasından daha kötüdür.
 */
const PRICE_PER_M: Record<string, { input: number; output: number }> = {
  "google/gemini-2.5-flash-lite": { input: 0.1, output: 0.4 },
  "google/gemini-2.5-flash": { input: 0.3, output: 2.5 },
}

/**
 * Koşu başlamadan önce tahmini tutar basılır; bu eşiğin üstünde ONAY istenir.
 * Sebebi ölçülmüş: flash ile tek bir repeat=3 koşusu $0,57 tutuyor, yani $5'lik
 * gateway kredisinin %11'i. Pahalı bir koşuyu yanlışlıkla başlatmak, yapılan
 * tüm ölçüm çalışmasının maliyetine yakın.
 */
const CONFIRM_ABOVE_USD = 0.2

/**
 * Vaka-koşusu başına ölçülen ortalama token. 82 vaka × 3 tur = 246 vaka-koşusu
 * için gerçekleşen 583,9K girdi / 84,4K çıktıdan türetildi. DİKKAT: kural bloğu
 * 8'erli grupta paylaşıldığı için vaka başına girdi, tek vakalık bir koşununkinden
 * çok daha azdır; tek vakanın rakamıyla çarpmak tahmini 3 katına çıkarır.
 */
const TOKENS_PER_CASE = { input: 2374, outputLite: 343 }
/** Vaka başına basılacak en fazla ürün satırı. */
const MAX_DETAIL = 6

const args = process.argv.slice(2)
const flag = (name: string) => args.includes(`--${name}`)
const value = (name: string) =>
  args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3)

const repeat = Math.max(1, Number(value("repeat") ?? 1))
// Varsayılan ÜRETİM modeli. Koşucu modeli her zaman açıkça geçirir; aksi
// halde üretim varsayılanı değiştiğinde rapor yanlış model adı basar.
const modelId = value("model") ?? GEMINI_FLASH
const filter = value("filter")
const BATCH_SIZE = Math.max(1, Number(value("batch") ?? DEFAULT_BATCH_SIZE))
const thinking = value("thinking") === undefined ? undefined : Number(value("thinking"))

/**
 * Golden adayını selectMatches'in beklediği ProductDetail'e genişletir. Prompt
 * yalnız productId/name/brand/category okur (prompts.ts → MatchPromptItem);
 * kalan alanlar tip uyumu için sıfırlanır.
 */
function toDetail(c: GoldenCase["candidates"][number]): ProductDetail {
  return {
    ...c,
    imageUrl: null,
    averagePrice: null,
    marketCount: 1,
    minPrice: null,
    maxPrice: null,
    markets: [],
    cachedAt: "",
  }
}

const toItem = (c: GoldenCase): ParsedItem => ({
  name: c.input.rawName,
  quantity: c.input.quantity,
  unit: c.input.unit,
  searchQuery: c.input.rawName,
})

/** withLlmCall'ın `[ai] ... in=N out=N` satırını yakalar — üretim kodu değişmez. */
function captureTokens() {
  const totals = { input: 0, output: 0 }
  const original = console.log
  console.log = (...a: unknown[]) => {
    const line = a.map(String).join(" ")
    const m = line.match(/^\[ai\] selectMatches .* in=(\d+) out=(\d+)/)
    if (m) {
      totals.input += Number(m[1])
      totals.output += Number(m[2])
      return
    }
    if (line.startsWith("[ai]") || line.startsWith("[lookupProducts]")) return
    original(...a)
  }
  return { totals, restore: () => (console.log = original) }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Sağlayıcı tavanı: bu takım/bölge için dakikada 5 istek. Ölçüldü — 11 grup ×
 * 3 tur koşusunda tekrarlar üst üste binince limit aşılıp koşu düştü.
 * Çağrılar arasına tavanın altında sabit bir aralık koyuyoruz; model gecikmesi
 * zaten çoğu zaman bundan uzun olduğu için pratikte ek maliyeti yok.
 */
const MIN_INTERVAL_MS = 13_000
let lastCallAt = 0

async function paced<T>(run: () => Promise<T>): Promise<T> {
  const wait = lastCallAt + MIN_INTERVAL_MS - Date.now()
  if (wait > 0) await sleep(wait)
  lastCallAt = Date.now()
  return run()
}

/** Hata metnindeki "Retry after 5s" ipucunu kullan; yoksa üstel geri çekil. */
function backoffFor(message: string, attempt: number): number {
  const hint = message.match(/retry after (\d+)s/i)
  if (hint) return Number(hint[1]) * 1000 + 1000
  return Math.min(30_000, 3000 * 2 ** (attempt - 1))
}

/**
 * Batch düzeyinde tekrar. generateObject'in kendi retry'ı BİLEREK kapatılıyor
 * (maxRetries: 0): iç ve dış tekrar çarpışınca tek saniyede 9 isteğe kadar
 * çıkıp rate limit'i tetikliyordu. Tüm tekrar mantığı burada, aralıklı.
 */
async function withBatchRetry<T>(run: () => Promise<T>, label: string): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await paced(run)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (attempt >= 5) throw err
      const wait = backoffFor(message, attempt)
      console.warn(
        `  ! ${label} ${attempt}/5 düştü, ${Math.round(wait / 1000)} sn sonra tekrar` +
          `\n    ${message.slice(0, 120)}`,
      )
      await sleep(wait)
    }
  }
}

async function runBatch(batch: GoldenCase[], label: string): Promise<CaseResult[]> {
  const selections = await withBatchRetry(
    () =>
      selectMatches(batch.map((c) => ({ item: toItem(c), hits: c.candidates.map(toDetail) })), {
        maxRetries: 0,
        ...(thinking === undefined ? {} : { thinkingBudget: thinking }),
        model: gateway(modelId),
        modelId,
      }),
    label,
  )

  return batch.map((c, i) => {
    const sel = selections.get(i)
    const out: SelectionOutput = {
      primaryProductId: sel?.primaryProductId ?? null,
      // Ölçülen şey ham LLM çıktısı; üretimdeki resolveSelection normalizasyonu
      // burada UYGULANMAZ — aksi halde eval kendi düzelttiği hatayı göremez.
      // Tek istisna tekilleştirme: aynı id'yi birden çok döndürmek skoru
      // etkilemiyor, sadece raporu şişiriyor.
      acceptedProductIds: [...new Set(sel?.acceptedProductIds ?? [])],
      sizeMismatch: sel?.sizeMismatch ?? false,
      reason: sel?.reason,
    }
    return scoreCase(c, out)
  })
}

function line(c: AggregatedCase, byId: Map<string, GoldenCase>): string[] {
  const g = byId.get(c.id)!
  const names = new Map(g.candidates.map((x) => [x.productId, x.name]))
  const mark = c.unstable ? "~" : "✗"
  const head = `  ${mark} ${c.id.padEnd(16)} ${g.input.rawName}, ${g.input.quantity} ${g.input.unit}${
    c.unstable ? `  (${c.passCount}/${c.runCount} geçti)` : ""
  }`
  const out = [head]
  // Uzun listeleri kırp: 60 satırlık bir döküm raporu okunmaz hale getiriyor.
  const show = (ids: string[], label: string) => {
    for (const id of ids.slice(0, MAX_DETAIL)) {
      out.push(`      ${label} ${id} "${names.get(id) ?? "?"}"`)
    }
    if (ids.length > MAX_DETAIL) {
      out.push(`      … ve ${ids.length - MAX_DETAIL} aday daha`)
    }
  }
  show(c.sample.wronglyAccepted, "beklenen red,   KABUL EDİLDİ:")
  show(c.sample.missed, "beklenen kabul, REDDEDİLDİ:")
  if (!c.sample.checks.primary) {
    const want = g.expect.primary
      ? `"${names.get(g.expect.primary) ?? g.expect.primary}"`
      : `${g.expect.primaryIn?.length ?? 0} adaylık kabul grubundan biri`
    out.push(
      `      primary ${want} olmalıydı, dönen: ` +
        `"${names.get(c.sample.primaryActual ?? "") ?? c.sample.primaryActual ?? "null"}"`,
    )
  }
  if (!c.sample.checks.size) {
    out.push(
      `      sizeMismatch beklenen ${g.expect.sizeMismatch}, dönen ${c.sample.sizeMismatchActual}`,
    )
  }
  if (!c.sample.checks.nonEmpty) out.push("      boş küme döndü, en az bir kabul bekleniyordu")
  return out
}

/**
 * Son koşuyu LLM'e hiç gitmeden baseline yapar. Metodoloji değiştirdiğimizde
 * (ör. repeat=1 → repeat=3) parası ödenmiş bir ölçümü tekrar satın almamak için.
 */
async function freezeLast(): Promise<void> {
  const file = join(EVAL_DIR, "last-run.json")
  if (!existsSync(file)) {
    console.error("✗ last-run.json yok — önce `pnpm eval:match` koş.")
    process.exitCode = 1
    return
  }
  const last: EvalReport = JSON.parse(await readFile(file, "utf8"))
  await writeFile(
    BASELINE_FILE,
    `${JSON.stringify(toBaseline(last.cases, { promptVersion: last.promptVersion, model: last.model, createdAt: last.runAt }), null, 2)}\n`,
  )
  const passed = last.cases.filter((c) => c.passed).length
  console.log(
    `✓ baseline ${last.runAt.slice(0, 16)} koşusundan donduruldu · ` +
      `${passed}/${last.cases.length} · repeat=${last.repeat} · prompt ${last.promptVersion}`,
  )
}

async function main() {
  if (flag("freeze-last")) return freezeLast()

  if (!existsSync(CASES_FILE)) {
    console.error(`✗ ${CASES_FILE} yok. Önce: pnpm eval:build`)
    process.exit(1)
  }
  let cases: GoldenCase[] = JSON.parse(await readFile(CASES_FILE, "utf8"))
  // Virgülle birden çok id parçası verilebilir: --filter=kahve,kola,cay
  if (filter) {
    const wanted = filter.split(",").map((f) => f.trim()).filter(Boolean)
    cases = cases.filter((c) => wanted.some((w) => c.id.includes(w)))
  }
  if (cases.length === 0) {
    console.error("✗ koşulacak vaka yok")
    process.exit(1)
  }

  const byId = new Map(cases.map((c) => [c.id, c]))
  const batches = Array.from({ length: Math.ceil(cases.length / BATCH_SIZE) }, (_, i) =>
    cases.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE),
  )

  console.log(
    `Sepet — match golden set · ${cases.length} vaka · ${batches.length} grup · ${modelId}`,
  )
  console.log(`prompt: MATCH_PROMPT_VERSION=${MATCH_PROMPT_VERSION}`)
  // §17 fixture çürümesi: ürünler raftan kalkar. Tuzak SINIFI kalıcı olduğu
  // için acele yok, ama vakanın kaç aylık olduğu görünür olmalı.
  const oldest = cases.reduce((a, c) => (c.capturedAt < a ? c.capturedAt : a), cases[0].capturedAt)
  const ageDays = Math.round((Date.now() - Date.parse(oldest)) / 86_400_000)
  const loc = cases[0].location
  console.log(
    `fixture: ${oldest.slice(0, 10)} (${ageDays} gün) · ${loc.lat}, ${loc.lng} · ${loc.depotCount} depo` +
      (ageDays > 365 ? "  ⚠ bir yıldan eski, yenilemeyi düşün" : ""),
  )
  if (repeat > 1) console.log(`repeat: ${repeat}`)
  console.log("")

  // Checkpoint — tamamlanan her grup diske yazılır. Ağ tarafı kırılgan
  // (gateway connect timeout, rate limit) ve 33 çağrılık bir koşu 20+ dakika
  // sürüyor; yarıda düşen koşunun parasını ve süresini ikinci kez ödememek
  // için kaldığı yerden devam eder. Anahtar prompt sürümünü içerir: prompt
  // değişince eski checkpoint otomatik geçersiz olur.
  const ckptKey = `${MATCH_PROMPT_VERSION}:${modelId}:${repeat}:${BATCH_SIZE}:${cases.length}:${filter ?? ""}`
  type Checkpoint = { key: string; doneBatches: string[]; runs: Record<string, CaseResult[]> }
  let ckpt: Checkpoint = { key: ckptKey, doneBatches: [], runs: {} }
  if (existsSync(CKPT_FILE) && !flag("fresh")) {
    const saved: Checkpoint = JSON.parse(await readFile(CKPT_FILE, "utf8"))
    if (saved.key === ckptKey) {
      ckpt = saved
      console.log(`↻ checkpoint bulundu: ${saved.doneBatches.length} grup atlanıyor\n`)
    }
  }

  // Maliyet kapısı — koşmadan ÖNCE. Düşünme açıksa çıktı ~2 katına çıkıyor.
  const price = PRICE_PER_M[modelId]
  if (price) {
    const n = cases.length * repeat
    const outPerCase =
      TOKENS_PER_CASE.outputLite * (thinking === undefined || thinking > 0 ? 1.9 : 1)
    const est =
      (n * TOKENS_PER_CASE.input * price.input + n * outPerCase * price.output) / 1e6
    console.log(`tahmini tutar: ~$${est.toFixed(3)}\n`)
    if (est > CONFIRM_ABOVE_USD && !flag("yes")) {
      console.error(
        `✗ Bu koşu ~$${est.toFixed(2)} tutuyor ($${CONFIRM_ABOVE_USD} eşiğinin üstünde).\n` +
          "  Onaylıyorsan --yes ekle. Daha ucuz seçenekler:\n" +
          "    --repeat=1        turu üçte bire indirir\n" +
          "    --filter=a,b,c    yalnız ilgili vakaları koşar\n" +
          "    --model çıkar     flash-lite ~7 kat ucuz",
      )
      process.exitCode = 1
      return
    }
  }

  const { totals, restore } = captureTokens()
  const runs = new Map<string, CaseResult[]>(Object.entries(ckpt.runs))
  try {
    for (let r = 0; r < repeat; r++) {
      for (const [b, batch] of batches.entries()) {
        const key = `r${r}b${b}`
        if (ckpt.doneBatches.includes(key)) continue
        const results = await runBatch(
          batch,
          `tur ${r + 1}/${repeat} grup ${b + 1}/${batches.length}`,
        )
        for (const res of results) {
          const list = runs.get(res.id) ?? []
          list.push(res)
          runs.set(res.id, list)
        }
        ckpt.doneBatches.push(key)
        ckpt.runs = Object.fromEntries(runs)
        await writeFile(CKPT_FILE, JSON.stringify(ckpt))
      }
    }
  } catch (err) {
    restore()
    console.error(`✗ koşu yarıda kaldı: ${err instanceof Error ? err.message : String(err)}`)
    console.error(
      `  ${ckpt.doneBatches.length}/${repeat * batches.length} grup kaydedildi. ` +
        "Aynı komutu tekrar koş, kaldığı yerden devam eder.",
    )
    process.exit(1)
  }
  restore()
  if (existsSync(CKPT_FILE)) await rm(CKPT_FILE)

  const aggregated = cases.map((c) => aggregateRuns(runs.get(c.id)!))
  const summary = summarizeBySplit(aggregated)
  const baseline: Baseline | null = existsSync(BASELINE_FILE)
    ? JSON.parse(await readFile(BASELINE_FILE, "utf8"))
    : null
  const diff = diffBaseline(aggregated, baseline)

  const report: EvalReport = {
    runAt: new Date().toISOString(),
    model: modelId,
    promptVersion: MATCH_PROMPT_VERSION,
    repeat,
    batchSize: BATCH_SIZE,
    cases: aggregated,
    summary,
    tokens: totals,
    baseline: diff,
  }

  // Her koşu diske yazılır: kalan vakaları teşhis etmek için LLM'i tekrar
  // çağırmak gerekmesin. Baseline değildir, son koşunun ham kaydıdır.
  await writeFile(
    join(EVAL_DIR, "last-run.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  )

  if (flag("json")) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    const s = summary.all
    console.log(
      `  ✓ ${s.passed} geçti   ✗ ${s.failed} kaldı   ~ ${s.unstable} kararsız\n`,
    )
    for (const c of aggregated) {
      if (!c.passed || c.unstable) console.log(line(c, byId).join("\n"))
    }
    console.log(
      `\n  Yanlış kabul: ${s.wrongAccept}    Kaçırma: ${s.missed}    ` +
        `Primary hatası: ${s.primaryErrors}    Boyut hatası: ${s.sizeErrors}`,
    )
    const split = (name: string, x: typeof summary.train) =>
      `  ${name.padEnd(8)} ${String(x.passed).padStart(2)}/${String(x.total).padEnd(3)} geçti · ` +
      `${String(x.leakedProducts).padStart(4)} ürün yanlış kabul · ` +
      `${String(x.missedProducts).padStart(4)} ürün kaçırıldı`
    console.log("")
    console.log(split("Öğretim", summary.train))
    console.log(split("Sınav", summary.holdout))
    if (baseline && diff) {
      const before = baseline.cases.filter((c) => c.passed).length
      console.log(
        `\n  Baseline (${baseline.createdAt.slice(0, 10)}): ${before}/${baseline.cases.length}`,
      )
      if (diff.regressed.length > 0) {
        console.log(`  GERİLEME: ${diff.regressed.join(", ")} önceden geçiyordu.`)
      }
      if (diff.improved.length > 0) console.log(`  DÜZELME: ${diff.improved.join(", ")}`)
      if (diff.regressed.length === 0 && diff.improved.length === 0) {
        console.log("  Fark yok.")
      }
    } else {
      console.log("\n  Baseline yok — --update-baseline ile dondurabilirsin.")
    }
    const price = PRICE_PER_M[modelId]
    const cost = price
      ? ` · ~$${((totals.input / 1e6) * price.input + (totals.output / 1e6) * price.output).toFixed(4)}`
      : " · tutar yok (bu modelin fiyatı tabloda değil)"
    console.log(
      `\n  Token: ${(totals.input / 1000).toFixed(1)}K girdi · ` +
        `${(totals.output / 1000).toFixed(1)}K çıktı${cost}`,
    )
  }

  if (flag("update-baseline")) {
    await writeFile(
      BASELINE_FILE,
      `${JSON.stringify(toBaseline(aggregated, { promptVersion: MATCH_PROMPT_VERSION, model: modelId }), null, 2)}\n`,
    )
    console.log(`\n→ baseline güncellendi: ${BASELINE_FILE}`)
  }

  // process.exit DEĞİL: token yakalayıcı console.log'u sarmaladığı için
  // Windows'ta libuv açık handle ile kapanıp assert atıyor.
  process.exitCode = summary.all.failed > 0 ? 1 : 0
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
