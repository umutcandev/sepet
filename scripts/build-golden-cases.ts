/**
 * Faz 1 adım 10 — doldurulmuş şablon + donmuş gruplama → taksonomi ve golden
 * vakalar. İki çıktı:
 *
 *   lib/ai/eval/food-taxonomy.json    politika (§13.7 gereği productId YOK)
 *   lib/ai/eval/cases/match-golden.json  assertion'lı vakalar
 *
 * Çeviri tamamen mekanik (§6.1): "A+B" → A ve B gruplarının üyeleri kabul,
 * kalan gruplar red, kararsız (`?`) ve GRUPLANAMAYAN hiçbir listeye girmez.
 * `--explain` küresel organik kuralının hangi ürünleri taşıdığını basar.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { deriveAssertions, parseAnswer, parseSheet } from "@/lib/ai/eval/answers"
import { GROUPING } from "@/lib/ai/eval/grouping"
import { groupCandidates } from "@/lib/ai/eval/taxonomy"
import { termSlug } from "@/lib/ai/eval/terms"
import type {
  CaptureFile,
  FrozenGrouping,
  GoldenCase,
  TaxonomyEntry,
} from "@/lib/ai/eval/types"

const EVAL_DIR = join(process.cwd(), "lib/ai/eval")
const explain = process.argv.includes("--explain")

/** Reddedilen grup etiketlerinden vakanın hangi MATCH_PROMPT kuralını sınadığı. */
function ruleOf(rejectedLabels: string[]): number {
  const t = rejectedLabels.join(" ").toLocaleLowerCase("tr-TR")
  if (/turşu|salamura|konserve|kurutulmuş|közlenm|haşlanmış/.test(t)) return 7
  if (/füme|şarküteri|salam|sucuk|jambon|döner|hazır yemek|tantuni/.test(t)) return 8
  if (/aromalı|meyveli|tatlandırıl|çeşnil|kokulu|naneli/.test(t)) return 6
  if (/diyet|glutensiz|laktozsuz|l[iı]ght|tıbb[iı]/.test(t)) return 9
  if (/koli|çoklu paket/.test(t)) return 4
  return 1
}

function noteOf(term: string, acceptLabels: string[], rejectLabels: string[]): string {
  const biggest = rejectLabels[0] ?? "—"
  return `"${term}" sorgusunda ${acceptLabels[0] ?? "hiçbir aday"} kabul edilmeli, ${biggest} edilmemeli.`
}

async function main() {
  const groups: FrozenGrouping[] = JSON.parse(
    await readFile(join(EVAL_DIR, "groups.json"), "utf8"),
  )
  const byTerm = new Map(groups.map((g) => [g.term, g]))
  const sheet = parseSheet(await readFile(join(EVAL_DIR, "taxonomy-sheet.md"), "utf8"))

  const taxonomy: TaxonomyEntry[] = []
  const cases: GoldenCase[] = []
  const skipped: string[] = []
  const unresolved: string[] = []
  const organicReport: string[] = []

  for (const row of sheet) {
    const g = byTerm.get(row.term)
    if (!g) continue
    const ans = parseAnswer(g, row)

    if (ans.skip) {
      skipped.push(row.term)
      continue
    }
    if (ans.issues.length > 0) {
      unresolved.push(`${row.term}: ${ans.issues.join(" | ")}`)
      continue
    }

    const file: CaptureFile = JSON.parse(
      await readFile(join(EVAL_DIR, "candidates", `${termSlug(row.term)}.json`), "utf8"),
    )
    const byId = new Map(file.candidates.map((c) => [c.productId, c]))
    const nameOf = (id: string) => byId.get(id)?.name ?? ""

    // Diyet kuralları çıkarılmış ikinci bir gruplama: organik adayın "asıl
    // evi" hangi tür? Harfler donmuş groups.json ile AYNI sırada üretilir
    // çünkü kural listesi yalnızca diyet satırı kadar kısalıyor; yine de
    // eşleştirme etiketle yapılır, harfle değil.
    const dietFree = groupCandidates(
      file,
      GROUPING[row.term].filter((r) => !/diyet|organik/i.test(r.label)),
    )
    const labelToId = new Map(g.groups.map((x) => [x.label, x.id]))
    const homeOf = new Map<string, string>()
    for (const grp of dietFree.groups) {
      const id = labelToId.get(grp.label)
      if (id) for (const m of grp.members) homeOf.set(m, id)
    }

    const a = deriveAssertions(g, ans, nameOf, (id) => homeOf.get(id) ?? null)
    const label = (id: string) => g.groups.find((x) => x.id === id)?.label ?? id
    const acceptLabels = ans.accept.map(label)
    const rejectLabels = ans.reject.map(label)

    if (a.organicMoved.length > 0) {
      organicReport.push(
        `  ${row.term.padEnd(14)} ${a.organicMoved.length} ürün red→kabul: ` +
          a.organicMoved.slice(0, 3).map(nameOf).join(" · "),
      )
    }

    // §13.7 — taksonomi POLİTİKA tutar, ENVANTER tutmaz: productId girmez.
    taxonomy.push({
      term: row.term,
      category: g.category,
      split: g.split,
      answer: { accept: row.accept, primary: row.primary, note: row.note },
      groups: g.groups.map((x) => ({
        id: x.id,
        label: x.label,
        verdict: ans.accept.includes(x.id)
          ? "accept"
          : ans.unsure.includes(x.id)
            ? "unknown"
            : "reject",
      })),
      excludePattern: null,
      primaryLabel: ans.primaryGroups[0] ? label(ans.primaryGroups[0]) : null,
      policyLine: buildPolicyLine(
        row.term,
        acceptLabels,
        rejectLabels,
        ans.primaryGroups[0] ? label(ans.primaryGroups[0]) : null,
        a.organicMoved.length > 0,
      ),
    })

    cases.push({
      id: `${termSlug(row.term)}-01`,
      rule: ruleOf(rejectLabels),
      split: g.split,
      source: `taxonomy:${row.term} · KABUL='${row.accept}' · PRIMARY='${row.primary}'`,
      note: noteOf(row.term, acceptLabels, rejectLabels),
      capturedAt: file.capturedAt,
      location: file.location,
      // Üretimdeki nötr varsayılan (PARSE_PROMPT): sade terim, miktar yok.
      input: { rawName: row.term, quantity: 1, unit: "adet" },
      candidates: file.candidates.map((c) => ({
        productId: c.productId,
        name: c.name,
        brand: c.brand,
        category: c.category,
      })),
      expect: {
        ...(a.mustAccept.length > 0 ? { mustAccept: a.mustAccept } : {}),
        ...(a.mustReject.length > 0 ? { mustReject: a.mustReject } : {}),
        ...(a.primaryIn.length > 0 ? { primaryIn: a.primaryIn } : {}),
        nonEmpty: a.nonEmpty,
      },
    })
  }

  // §13.1 + §13.9 — üretim yalnızca ÖĞRETİM terimlerinin politika satırını
  // görür. Sınav terimleri bu dosyada HİÇ BULUNMAZ; dondurma bir çalışma
  // zamanı kontrolü değil, yapısal garantidir. food-taxonomy.json (111 KB)
  // üretim paketine girmesin diye ayrı ve dar tutulur.
  const trained = taxonomy.filter((t) => t.split === "train")
  await writeFile(
    join(process.cwd(), "lib/ai/match-policy.json"),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: "lib/ai/eval/taxonomy-sheet.md → scripts/build-golden-cases.ts",
        note: "Elle düzenlemeyin. Sınav (holdout) terimleri bilerek yoktur.",
        policies: Object.fromEntries(trained.map((t) => [t.term, t.policyLine])),
      },
      null,
      2,
    )}\n`,
  )

  await mkdir(join(EVAL_DIR, "cases"), { recursive: true })
  await writeFile(
    join(EVAL_DIR, "food-taxonomy.json"),
    `${JSON.stringify(taxonomy, null, 2)}\n`,
  )
  await writeFile(
    join(EVAL_DIR, "cases/match-golden.json"),
    `${JSON.stringify(cases, null, 2)}\n`,
  )

  const acc = cases.reduce((s, c) => s + (c.expect.mustAccept?.length ?? 0), 0)
  const rej = cases.reduce((s, c) => s + (c.expect.mustReject?.length ?? 0), 0)
  console.log(
    `✓ ${cases.length} vaka · ${acc} mustAccept · ${rej} mustReject assertion`,
  )
  console.log(
    `  öğretim ${cases.filter((c) => c.split === "train").length} · ` +
      `sınav ${cases.filter((c) => c.split === "holdout").length}`,
  )
  if (skipped.length > 0) console.log(`  ATLA: ${skipped.join(", ")}`)
  if (unresolved.length > 0) {
    console.log(`\n✗ ${unresolved.length} terim netleşmediği için vaka üretilmedi:`)
    unresolved.forEach((u) => console.log("  " + u))
  }
  if (explain && organicReport.length > 0) {
    console.log(`\nKüresel organik kuralı — ${organicReport.length} terimde etkili:`)
    organicReport.forEach((o) => console.log(o))
  }
  console.log("\n→ lib/ai/eval/food-taxonomy.json")
  console.log("→ lib/ai/eval/cases/match-golden.json")
}

/**
 * §13.1 — kalemin üstüne yazılacak tek paragraflık politika satırı.
 *
 * İstisna satırı iki durumda yazılır: küresel organik kuralı bu terimde ürün
 * taşıdığında, VE red listesindeki grup etiketi "organik" kelimesini içerdiğinde
 * (ör. "Özel diyet varyant (light / laktozsuz / organik / vegan)"). İkincisi
 * şart, çünkü havuzda bugün organik aday olmasa bile metin "organik RED" demiş
 * olur ve duran karara ters düşer.
 */
function buildPolicyLine(
  term: string,
  accept: string[],
  reject: string[],
  primary: string | null,
  organicMoved: boolean,
): string {
  if (accept.length === 0) {
    return `"${term}" için bu listede gerçek aday yok; boş dön.`
  }
  const parts = [`${accept.join(", ")} KABUL.`]
  if (reject.length > 0) parts.push(`${reject.join(", ")} RED.`)
  const rejectMentionsOrganic = /organ[iı]k/i.test(reject.join(" "))
  if (organicMoved || rejectMentionsOrganic) {
    parts.push("İSTİSNA: adında organik/bio geçen varyantlar KABUL.")
  }
  if (primary) parts.push(`Kart için: ${primary}.`)
  return parts.join(" ")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
