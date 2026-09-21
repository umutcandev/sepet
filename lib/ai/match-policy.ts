import { createHash } from "node:crypto"
import policyFile from "./match-policy.json"

/**
 * Terim bazlı eşleştirme politikası (plan §13.1). "Kullanıcı X yazınca ne
 * kasteder" kararı `lib/ai/eval/taxonomy-sheet.md`'de verilmiş, buraya
 * `pnpm eval:build` ile türetilmiştir.
 *
 * Yalnız ÖĞRETİM (train) terimleri burada. Sınav terimleri bilerek yok (§13.9):
 * genel kural iyileştirmelerinin gerçekten genelleşip genelleşmediğini ölçen
 * tek şey, politikasını hiç görmemiş terimlerdeki skor.
 */
const POLICIES: Record<string, string> = policyFile.policies

/** Cache anahtarı için; politika metni değişince match cache geçersizleşmeli. */
export const POLICY_VERSION = createHash("sha1")
  .update(JSON.stringify(POLICIES))
  .digest("hex")
  .slice(0, 8)

/**
 * TAM eşleşme aranır, kısmi değil. "beyaz peynir" için "peynir" politikasını
 * uygulamak tehlikeli: "laktozsuz süt" isteyen kullanıcıya "süt" politikasının
 * "laktozsuz RED" satırı gider ve kullanıcının açık isteğini çürütür. Kullanıcı
 * terimi daraltmışsa prompt'un kendi kuralları geçerli kalır (§13.6).
 */
export function policyFor(searchQuery: string | undefined): string | null {
  if (!searchQuery) return null
  const key = searchQuery.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ")
  return POLICIES[key] ?? null
}

export const POLICY_TERM_COUNT = Object.keys(POLICIES).length
