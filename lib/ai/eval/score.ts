import type {
  AggregatedCase,
  Baseline,
  BaselineDiff,
  CaseResult,
  GoldenCase,
  SelectionOutput,
  SplitSummary,
} from "./types"

/**
 * `primary` tek ürüne, `primaryIn` bir kümeye bakar; ikisi de yoksa ölçülmez.
 * İkisi birden verilirse ikisi de sağlanmalıdır.
 */
function primaryOk(c: GoldenCase, actual: string | null): boolean {
  const { primary, primaryIn } = c.expect
  if (primary !== undefined && actual !== primary) return false
  if (primaryIn !== undefined && (actual === null || !primaryIn.includes(actual))) {
    return false
  }
  return true
}

/**
 * Tek vakanın skoru. K2 gereği TAM KÜME EŞİTLİĞİ aranmaz: yalnızca belirtilmiş
 * assertion'lar değerlendirilir, geri kalan adayların kabul edilip edilmemesi
 * serbesttir. Belirtilmemiş bir assertion her zaman geçer.
 */
export function scoreCase(c: GoldenCase, out: SelectionOutput): CaseResult {
  const accepted = new Set(out.acceptedProductIds)
  const missed = (c.expect.mustAccept ?? []).filter((id) => !accepted.has(id))
  const wronglyAccepted = (c.expect.mustReject ?? []).filter((id) => accepted.has(id))

  const checks = {
    recall: missed.length === 0,
    precision: wronglyAccepted.length === 0,
    primary: primaryOk(c, out.primaryProductId),
    size:
      c.expect.sizeMismatch === undefined ||
      out.sizeMismatch === c.expect.sizeMismatch,
    nonEmpty: c.expect.nonEmpty !== true || out.acceptedProductIds.length > 0,
  }

  return {
    id: c.id,
    split: c.split,
    passed: Object.values(checks).every(Boolean),
    checks,
    missed,
    wronglyAccepted,
    primaryActual: out.primaryProductId,
    sizeMismatchActual: out.sizeMismatch,
    reason: out.reason,
  }
}

/**
 * Aynı vakanın --repeat koşularını katlar. temperature 0.1 deterministik
 * DEĞİL: hepsi geçmiyorsa vaka geçmiş sayılmaz, bir kısmı geçtiyse "kararsız"
 * etiketlenir — kararsızlık bir gerileme kadar önemli bir sinyaldir.
 */
export function aggregateRuns(runs: CaseResult[]): AggregatedCase {
  if (runs.length === 0) throw new Error("aggregateRuns: boş koşu listesi")
  const passCount = runs.filter((r) => r.passed).length
  return {
    id: runs[0].id,
    split: runs[0].split,
    passed: passCount === runs.length,
    unstable: passCount > 0 && passCount < runs.length,
    passCount,
    runCount: runs.length,
    sample: runs.find((r) => !r.passed) ?? runs[0],
  }
}

/**
 * İki hata tipi AYRI sayılır — kullanıcıya maliyetleri farklı: yanlış kabul
 * sepete yanlış ürün koyar, kaçırma kalemi tamamen düşürür.
 */
export function summarize(cases: AggregatedCase[]): SplitSummary {
  const s: SplitSummary = {
    total: cases.length,
    passed: 0,
    failed: 0,
    unstable: 0,
    wrongAccept: 0,
    missed: 0,
    primaryErrors: 0,
    sizeErrors: 0,
    leakedProducts: 0,
    missedProducts: 0,
  }
  for (const c of cases) {
    if (c.passed) s.passed++
    else s.failed++
    if (c.unstable) s.unstable++
    if (c.sample.wronglyAccepted.length > 0) s.wrongAccept++
    if (c.sample.missed.length > 0) s.missed++
    if (!c.sample.checks.primary) s.primaryErrors++
    if (!c.sample.checks.size) s.sizeErrors++
    s.leakedProducts += c.sample.wronglyAccepted.length
    s.missedProducts += c.sample.missed.length
  }
  return s
}

export function summarizeBySplit(cases: AggregatedCase[]) {
  return {
    all: summarize(cases),
    train: summarize(cases.filter((c) => c.split === "train")),
    holdout: summarize(cases.filter((c) => c.split === "holdout")),
  }
}

/** K5 — mutlak skor değil, baseline'a göre FARK raporlanır. */
export function diffBaseline(
  cases: AggregatedCase[],
  baseline: Baseline | null,
): BaselineDiff | null {
  if (!baseline) return null
  const before = new Map(baseline.cases.map((e) => [e.id, e.passed]))
  const now = new Map(cases.map((c) => [c.id, c.passed]))

  return {
    regressed: cases.filter((c) => before.get(c.id) === true && !c.passed).map((c) => c.id),
    improved: cases.filter((c) => before.get(c.id) === false && c.passed).map((c) => c.id),
    added: cases.filter((c) => !before.has(c.id)).map((c) => c.id),
    removed: baseline.cases.filter((e) => !now.has(e.id)).map((e) => e.id),
  }
}

export function toBaseline(
  cases: AggregatedCase[],
  meta: { promptVersion: string; model: string; createdAt?: string },
): Baseline {
  return {
    createdAt: meta.createdAt ?? new Date().toISOString(),
    promptVersion: meta.promptVersion,
    model: meta.model,
    cases: cases
      .map((c) => ({ id: c.id, split: c.split, passed: c.passed }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  }
}
