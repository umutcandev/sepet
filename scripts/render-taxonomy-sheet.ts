/**
 * Faz 1 adım B+7 — dondurulmuş aday havuzlarını ürün türlerine kümeler ve
 * doldurulacak şablonu üretir. Üç çıktı:
 *
 *   lib/ai/eval/groups.json            harf → productId sözleşmesi (§6.2). Siz
 *                                      "A+B" yazdığınızda bakılan dosya budur;
 *                                      şablon bunun okunabilir bir render'ıdır.
 *   lib/ai/eval/taxonomy-sheet.md      84 gıda, kategori sıralı — doldurulacak.
 *   lib/ai/eval/taxonomy-appendix.md   her gıdanın tam aday listesi, referans.
 *
 * Şablon üretildikten sonra grouping.ts'i DEĞİŞTİRMEYİN: cevaplar donmuş
 * groups.json'a göre yorumlanır, aksi halde "A" sessizce başka bir kümeyi
 * ifade etmeye başlar.
 */
import { readFile, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { join } from "node:path"

import { GROUPING } from "@/lib/ai/eval/grouping"
import { groupCandidates, groupingWarnings } from "@/lib/ai/eval/taxonomy"
import { TERMS, termSlug } from "@/lib/ai/eval/terms"
import type { CaptureFile, CapturedCandidate, FrozenGrouping } from "@/lib/ai/eval/types"

const EVAL_DIR = join(process.cwd(), "lib/ai/eval")
const CAND_DIR = join(EVAL_DIR, "candidates")

const HEADER = `# Sepet — ürün eşdeğerlik taksonomisi · doldurma şablonu

Her gıda için tek soru: **kullanıcı bu terimi sade haliyle yazdığında aşağıdaki
ürün türlerinden hangileri sepete girmeli?**

72 ürün adı okumuyorsun; ~8 grup başlığı okuyup bir satır cevap yazıyorsun.
Kategori kategori bölünmüş, istediğin yerde bırakıp devam edebilirsin.
Doldurulmamış gıda taksonomiye girmez, tahminle dolmaz.

## Nasıl doldurulur

| KABUL alanına yazarsan | Anlamı |
|---|---|
| \`A+B\` | A ve B kabul, geri kalan gruplar red |
| \`sadece A\` | A kabul, gerisi red |
| \`A, B, C\` | Aynı şey, virgül de olur |
| \`hepsi\` | Tüm gruplar kabul |
| \`hiçbiri\` | Hiçbiri kabul değil, bu terimde boş dönülmeli |
| \`A+B, light olmasın\` | A ∪ B, sonra ad deseniyle süz — elenenler red listesine |
| \`A+B ama rende hariç\` | Aynı mantık |
| \`A + C'den sadece Ezine\` | A ∪ (C'nin adında "ezine" geçen üyeleri) |
| \`B?\` | B kararsız → hiçbir listeye girmez |
| \`ATLA\` | Bu gıda taksonomiye hiç girmez |

PRIMARY: UI kartında hangi tür gösterilsin. Bir grup harfi (\`A\`), bir kural
(\`en ucuz beyaz peynir\`, \`Torku olan\`) ya da \`farketmez\` yazabilirsin.
\`farketmez\` yazarsan o vaka primary'yi hiç ölçmez.

Emin değilsen grup harfinin yanına \`?\` koy. İşaretli grup hiçbir listeye
girmez — emin olmadığın şey ground truth olmaz.

Desenli bir cevap yazarsan (\`light olmasın\`) uygulanan desenin hangi ürünleri
elediğini sana liste halinde geri göstereceğim; onaylamadan koda girmez.

Bir grubun sayısı ya da örnekleri tuhaf geldiyse o gıdanın tam aday listesi
\`taxonomy-appendix.md\` dosyasında, aynı harflerle etiketli duruyor. Grup
başlığıyla sayı uyuşmuyorsa gruplama benim hatamdır, söyle, yeniden gruplarım.
`

/** Grubun kapsamını göstermek için eşit aralıklı 3 üye — ilk/orta/son. */
function samples(members: string[], byId: Map<string, CapturedCandidate>): string[] {
  const n = Math.min(3, members.length)
  const picks =
    n === members.length
      ? members
      : Array.from({ length: n }, (_, i) =>
          members[Math.round((i * (members.length - 1)) / (n - 1))],
        )
  return [...new Set(picks)].map((id) => byId.get(id)?.name ?? id)
}

function renderTerm(
  index: number,
  file: CaptureFile,
  g: FrozenGrouping,
  byId: Map<string, CapturedCandidate>,
): string {
  const head =
    `## ${index}/${TERMS.length} · ${file.term}` +
    `   ·   ${g.candidateCount} aday · ${file.location.depotCount} depo` +
    `${g.split === "holdout" ? " · sınav" : ""}`

  const lines = g.groups.map((grp) => {
    const label = `  ${grp.id}) ${grp.label}`.padEnd(46)
    return `${label}${String(grp.members.length).padStart(3)} aday\n       ${samples(grp.members, byId).join(" · ")}`
  })

  if (g.ungrouped.length > 0) {
    lines.push(
      `${"  _) GRUPLANAMAYAN".padEnd(46)}${String(g.ungrouped.length).padStart(3)} aday   → appendix'te tam liste`,
    )
  }

  const warn = groupingWarnings(g)
  const warnBlock = warn.length > 0 ? `\n> UYARI: ${warn.join(" · ")}\n` : ""

  return `${head}

Aday havuzundaki ürün türleri:

${lines.join("\n")}
${warnBlock}
KABUL   :
PRIMARY :
NOT     :

`
}

function renderAppendix(file: CaptureFile, g: FrozenGrouping): string {
  const letterOf = new Map<string, string>()
  for (const grp of g.groups) for (const id of grp.members) letterOf.set(id, grp.id)

  const rows = file.candidates.map((c) => {
    const letter = letterOf.get(c.productId) ?? "_"
    const markets = c.marketCount > 1 ? ` · ${c.marketCount} market` : ""
    return `  ${letter}  ${c.productId}  ${c.name}${markets}`
  })
  return `### ${file.term} (${file.candidates.length})\n\n\`\`\`\n${rows.join("\n")}\n\`\`\`\n\n`
}

/** --only=<terim>: dosya yazmadan tek terimin bloğunu + tam listesini basar. */
async function preview(term: string) {
  const entry = TERMS.find((t) => t.term === term)
  if (!entry) return console.error(`✗ "${term}" 84 terim arasında yok`)
  const rules = GROUPING[term]
  if (!rules) return console.error(`✗ "${term}" için grup kuralı yok`)

  const file: CaptureFile = JSON.parse(
    await readFile(join(CAND_DIR, `${termSlug(term)}.json`), "utf8"),
  )
  const byId = new Map(file.candidates.map((c) => [c.productId, c]))
  const g = groupCandidates(file, rules)
  console.log(renderTerm(TERMS.indexOf(entry) + 1, file, g, byId))
  console.log(renderAppendix(file, g))
}

/** Doldurulmuş sheet'i boş şablonla ezmek cevapları yok eder — §7 kararları
 *  yeniden üretilemez. Dolu satır varsa --force olmadan yazmayız. */
async function filledAnswers(): Promise<number> {
  const path = join(EVAL_DIR, "taxonomy-sheet.md")
  if (!existsSync(path)) return 0
  const sheet = await readFile(path, "utf8")
  return sheet.split("\n").filter((l) => /^KABUL\s*:\s*\S/.test(l)).length
}

async function main() {
  const argv = process.argv.slice(2)
  const only = argv.find((a) => a.startsWith("--only="))
  if (only) return preview(only.slice("--only=".length))

  const filled = await filledAnswers()
  if (filled > 0 && !argv.includes("--force")) {
    console.error(`✗ taxonomy-sheet.md'de ${filled} dolu KABUL satırı var; üzerine yazmak cevapları siler.`)
    console.error("  Gerçekten şablonu yeniden üretmek istiyorsan: pnpm eval:sheet --force")
    console.error("  (önce yedekle: cp lib/ai/eval/taxonomy-sheet.md /tmp/)")
    process.exit(1)
  }

  const missing = TERMS.filter(
    (t) => !existsSync(join(CAND_DIR, `${termSlug(t.term)}.json`)),
  )
  if (missing.length > 0) {
    console.error(
      `✗ ${missing.length} terimin adayları çekilmemiş: ${missing.map((m) => m.term).join(", ")}`,
    )
    console.error("  Önce: pnpm eval:capture")
    process.exit(1)
  }

  const ungrouped = TERMS.filter((t) => !GROUPING[t.term])
  if (ungrouped.length > 0) {
    console.error(
      `✗ ${ungrouped.length} terim için grup kuralı yok: ${ungrouped.map((m) => m.term).join(", ")}`,
    )
    console.error("  lib/ai/eval/grouping.ts içine ekle.")
    process.exit(1)
  }

  const frozen: FrozenGrouping[] = []
  const blocks: string[] = []
  const appendix: string[] = []
  let currentCategory = ""

  for (const [i, entry] of TERMS.entries()) {
    const file: CaptureFile = JSON.parse(
      await readFile(join(CAND_DIR, `${termSlug(entry.term)}.json`), "utf8"),
    )
    const byId = new Map(file.candidates.map((c) => [c.productId, c]))
    const g = groupCandidates(file, GROUPING[entry.term])
    frozen.push(g)

    if (entry.category !== currentCategory) {
      currentCategory = entry.category
      blocks.push(`---\n\n# ${currentCategory}\n\n`)
      appendix.push(`## ${currentCategory}\n\n`)
    }
    blocks.push(renderTerm(i + 1, file, g, byId))
    appendix.push(renderAppendix(file, g))
  }

  await writeFile(
    join(EVAL_DIR, "groups.json"),
    `${JSON.stringify(frozen, null, 2)}\n`,
  )
  await writeFile(join(EVAL_DIR, "taxonomy-sheet.md"), `${HEADER}\n${blocks.join("")}`)
  await writeFile(
    join(EVAL_DIR, "taxonomy-appendix.md"),
    "# EK — tam aday listeleri\n\nŞablonu doldururken normalde buraya bakmıyorsun. Bir grubun sayısı ya da\nörnekleri tuhaf geldiğinde o terimi burada açıyorsun.\n\nHer satır: grup harfi · productId · ürün adı (· kaç markette satılıyor).\n`_` = gruplanamayan; bu adaylar hiçbir assertion üretmez.\n\n" +
      appendix.join(""),
  )

  const warned = frozen.filter((g) => groupingWarnings(g).length > 0)
  const totalUngrouped = frozen.reduce((s, g) => s + g.ungrouped.length, 0)
  const totalCands = frozen.reduce((s, g) => s + g.candidateCount, 0)
  console.log(
    `✓ ${frozen.length} terim · ${totalCands} aday · ` +
      `gruplanamayan ${totalUngrouped} (%${Math.round((totalUngrouped / totalCands) * 100)})`,
  )
  if (warned.length > 0) {
    console.log(`\n${warned.length} terimde uyarı:`)
    for (const g of warned) console.log(`  ${g.term.padEnd(20)} ${groupingWarnings(g).join(" · ")}`)
  }
  console.log("\n→ lib/ai/eval/taxonomy-sheet.md   (doldurulacak)")
  console.log("→ lib/ai/eval/taxonomy-appendix.md (tam listeler, referans)")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
