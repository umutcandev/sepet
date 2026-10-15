// Kayıtlı seçim ŞUBE (depot) bazlıdır: konum modalı tek tek şube işaretler,
// arama tarafı da `depotIds` ile çalışır. Prompt menüsü ise kullanıcıya MARKET
// (zincir) düzeyinde seçim sunar. Bu dosya iki düzey arasındaki köprüdür; saf
// fonksiyonlar, böylece test edilebilir ve modalla aynı kuralları paylaşır.

export type DepotLike = { id: string; market: string }

export type ChainCount = { total: number; selected: number }

/**
 * Kayıtlı `depotIds`'i bu yarıçaptaki şubelere indirger. Boş liste (ya da hiçbiri
 * menzilde değilse) "tüm yakın şubeler" demektir: arama tarafı `[]`'i böyle
 * yorumluyor, konum modalı da açılışta aynı varsayımı yapıyor.
 */
export function effectiveSelection(
  depots: ReadonlyArray<DepotLike>,
  depotIds: ReadonlyArray<string>
): Set<string> {
  const inRange = new Set(depots.map((d) => d.id))
  const kept = depotIds.filter((id) => inRange.has(id))
  return new Set(kept.length > 0 ? kept : inRange)
}

/** Market başına menzildeki ve seçili şube sayısı. */
export function chainCounts(
  depots: ReadonlyArray<DepotLike>,
  selected: ReadonlySet<string>
): Map<string, ChainCount> {
  const out = new Map<string, ChainCount>()
  for (const d of depots) {
    const c = out.get(d.market) ?? { total: 0, selected: 0 }
    c.total += 1
    if (selected.has(d.id)) c.selected += 1
    out.set(d.market, c)
  }
  return out
}

export function isEverySelected(
  depots: ReadonlyArray<DepotLike>,
  selected: ReadonlySet<string>
): boolean {
  return depots.length > 0 && depots.every((d) => selected.has(d.id))
}

/**
 * Bir marketi aç/kapat. Seçiliyse (kısmen bile) tüm şubeleri çıkar, değilse
 * hepsini ekle. Son marketi kapatmak seçimi boşaltacağından null döner: boş
 * liste sessizce "hepsi"ne dönerdi (bkz. effectiveSelection).
 */
export function toggleChain(
  depots: ReadonlyArray<DepotLike>,
  selected: ReadonlySet<string>,
  market: string
): Set<string> | null {
  const own = depots.filter((d) => d.market === market)
  const next = new Set(selected)
  if (own.some((d) => selected.has(d.id))) {
    for (const d of own) next.delete(d.id)
  } else {
    for (const d of own) next.add(d.id)
  }
  return next.size > 0 ? next : null
}

/**
 * Yarıçap ya da konum değişince market tercihini yeni şube listesine taşır.
 *
 * - Önceden her şey seçiliyse yeni listede de her şey seçilir.
 * - Tam seçili marketler yeni listedeki tüm şubeleriyle gelir.
 * - Kısmen seçili bir marketin şubeleri yalnız `keepBranches` iken (aynı merkez,
 *   farklı yarıçap) tek tek korunur; yeni bölgede şube kimlikleri değiştiği
 *   için konum değişiminde market tümüyle dahil edilir.
 * - Sonuç boşsa (seçili marketlerin yeni menzilde şubesi yok) hepsine düşer ve
 *   `fellBack` ile bildirir.
 */
export function carrySelection(
  prev: { depots: ReadonlyArray<DepotLike>; selected: ReadonlySet<string> },
  next: ReadonlyArray<DepotLike>,
  keepBranches: boolean
): { ids: string[]; fellBack: boolean } {
  const all = next.map((d) => d.id)
  if (prev.depots.length === 0 || isEverySelected(prev.depots, prev.selected)) {
    return { ids: all, fellBack: false }
  }

  const counts = chainCounts(prev.depots, prev.selected)
  const ids = next
    .filter((d) => {
      const c = counts.get(d.market)
      if (!c || c.selected === 0) return false
      if (c.selected === c.total || !keepBranches) return true
      return prev.selected.has(d.id)
    })
    .map((d) => d.id)

  return ids.length > 0
    ? { ids, fellBack: false }
    : { ids: all, fellBack: true }
}
