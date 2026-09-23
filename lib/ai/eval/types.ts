import type { Unit } from "../schemas"

/**
 * Öğretim / sınav ayrımı (§13.9). "holdout" terimlerinin politikası üretim
 * prompt'una ASLA enjekte edilmez — genel kural iyileştirmelerinin gerçekten
 * genelleşip genelleşmediğini yalnızca bu grup ölçer.
 */
export type Split = "train" | "holdout"

/** MATCH_PROMPT'a giden aday alanları (prompts.ts → MatchPromptItem). */
export type CandidateRef = {
  productId: string
  name: string
  brand: string | null
  category: string | null
}

/**
 * Çekimde dondurulan aday. Fiyat/market alanları prompt'a GİRMEZ; yalnızca
 * "en ucuz X" gibi primary kurallarını build zamanında çözmek ve bir vakanın
 * optimizasyona malzeme verip vermediğini denetlemek için saklanır.
 */
export type CapturedCandidate = CandidateRef & {
  marketCount: number
  minPrice: number | null
  maxPrice: number | null
  markets: Array<{ market: string; price: number }>
}

export type CaptureFile = {
  term: string
  category: string
  split: Split
  capturedAt: string
  location: { lat: number; lng: number; distance: number; depotCount: number }
  candidates: CapturedCandidate[]
}

/** Bir terimin dondurulmuş gruplaması — cevap → ürün eşleşmesinin sözleşmesi. */
export type FrozenGroup = {
  id: string
  label: string
  members: string[]
}

export type FrozenGrouping = {
  term: string
  category: string
  split: Split
  candidateCount: number
  groups: FrozenGroup[]
  /** Hiçbir gruba girmeyen adaylar. Assertion üretmez (§6.1). */
  ungrouped: string[]
}

export type GroupVerdict = "accept" | "reject" | "unknown"

/**
 * food-taxonomy.json girdisi. §13.7 gereği `productId` TAŞIMAZ: politika
 * yıllarca geçerli, envanter aylarca.
 */
export type TaxonomyEntry = {
  term: string
  category: string
  split: Split
  /** Şablona yazdığınız ham cevap — izlenebilirlik için olduğu gibi saklanır. */
  answer: { accept: string; primary: string; note: string }
  groups: Array<{ id: string; label: string; verdict: GroupVerdict }>
  /** "light olmasın" gibi grup sınırını aşan kuralın regex kaynağı. */
  excludePattern: string | null
  primaryLabel: string | null
  /** §13.1'de kalemin üstüne yazılacak tek paragraflık politika satırı. */
  policyLine: string
}

export type GoldenCase = {
  id: string
  /** MATCH_PROMPT kural no (1-9) — hangi kuralı sınadığı. */
  rule: number
  split: Split
  source: string
  note: string
  /**
   * Adayların çekildiği an (§17 fixture çürümesi). Ürünler raftan kalkar; bu
   * damga vakanın ne kadar eskidiğini vakanın kendi içinden okunur kılar.
   * Tuzak SINIFI kalıcı olduğu için acele gerekmez, yılda bir yenilenir.
   */
  capturedAt: string
  /** Fixture'ın dondurulduğu konum — farklı konum farklı depo seti demektir. */
  location: { lat: number; lng: number; distance: number; depotCount: number }
  input: { rawName: string; quantity: number; unit: Unit }
  candidates: CandidateRef[]
  expect: {
    mustAccept?: string[]
    mustReject?: string[]
    /** Tek ürüne çözülmüş primary ("en ucuz X" gibi kurallar). */
    primary?: string
    /**
     * Primary'nin İÇİNDE olması gereken aday kümesi — PRIMARY'ye grup harfi
     * yazıldığında bu kullanılır. "A grubunun ilk adayı" demek olmaz: o sıra
     * arama motorundan gelir, yani rastgeledir; aynı gruptan başka bir ürün
     * seçmek kartı yanlış yapmaz.
     */
    primaryIn?: string[]
    sizeMismatch?: boolean
    nonEmpty?: boolean
  }
}

/** selectMatches'in tek kalem için ürettiği, skorlanacak çıktı. */
export type SelectionOutput = {
  primaryProductId: string | null
  acceptedProductIds: string[]
  sizeMismatch: boolean
  /** LLM'in kendi gerekçesi. Skora girmez; kalan vakayı teşhis etmek için. */
  reason?: string
}

export type CaseChecks = {
  recall: boolean
  precision: boolean
  primary: boolean
  size: boolean
  nonEmpty: boolean
}

export type CaseResult = {
  id: string
  split: Split
  passed: boolean
  checks: CaseChecks
  /** mustAccept'te olup kabul edilmeyenler — kalem kaybı. */
  missed: string[]
  /** mustReject'te olup kabul edilenler — kullanıcı yanlış ürünü görür. */
  wronglyAccepted: string[]
  primaryActual: string | null
  sizeMismatchActual: boolean
  /** LLM'in kendi gerekçesi — neden böyle seçtiğini kendi ağzından okumak için. */
  reason?: string
}

/** --repeat ile aynı vakanın birden çok koşusunun katlanmış hali. */
export type AggregatedCase = {
  id: string
  split: Split
  passed: boolean
  unstable: boolean
  passCount: number
  runCount: number
  /** Raporda gösterilecek koşu: varsa ilk BAŞARISIZ olan, yoksa ilki. */
  sample: CaseResult
}

export type SplitSummary = {
  total: number
  passed: number
  failed: number
  unstable: number
  /** Hatalı VAKA sayısı. */
  wrongAccept: number
  missed: number
  primaryErrors: number
  sizeErrors: number
  /**
   * Hatalı ÜRÜN sayısı. Vaka geç/kal ikilisi, hepsinin kaldığı bir grupta
   * (ör. sınav 0/22) hiç bilgi vermiyor; iyileşmeyi ancak bu sayaçlar gösterir.
   */
  leakedProducts: number
  missedProducts: number
}

export type BaselineEntry = { id: string; split: Split; passed: boolean }

export type Baseline = {
  createdAt: string
  promptVersion: string
  model: string
  cases: BaselineEntry[]
}

export type BaselineDiff = {
  regressed: string[]
  improved: string[]
  added: string[]
  removed: string[]
}

export type EvalReport = {
  runAt: string
  model: string
  promptVersion: string
  repeat: number
  batchSize: number
  cases: AggregatedCase[]
  summary: { all: SplitSummary; train: SplitSummary; holdout: SplitSummary }
  tokens: { input: number; output: number } | null
  baseline: BaselineDiff | null
}
