import type { Split } from "./types"

export type TermEntry = { term: string; category: string; split: Split }

/**
 * Plan §7 — belirsizlik taşıyan 84 temel gıda. Kriter popülerlik değil:
 * "kullanıcı bunu yazınca ne kastettiği tartışmalı mı?"
 *
 * split (§13.9): holdout terimlerinin politikası üretim prompt'una asla
 * enjekte edilmez. Seçim kategori dengeli (her kategoriden 2-3) ve bilerek
 * yüksek trafikli terimlerin (süt, peynir, ekmek, tavuk) DIŞINDA — sınav grubu
 * o terimleri §13.1'in faydasından kalıcı olarak mahrum bırakırdı.
 */
const CATEGORIES: Array<{ category: string; terms: string[]; holdout: string[] }> = [
  {
    category: "Süt ürünleri",
    terms: ["süt", "yoğurt", "peynir", "ayran", "tereyağı", "krema", "kaymak", "labne", "kefir", "lor"],
    holdout: ["kaymak", "labne", "lor"],
  },
  {
    category: "Ekmek & unlu",
    terms: ["ekmek", "un", "makarna", "pirinç", "bulgur", "irmik", "galeta unu", "yufka", "şehriye"],
    holdout: ["irmik", "galeta unu", "şehriye"],
  },
  {
    category: "Et & protein",
    terms: ["et", "kıyma", "tavuk", "balık", "yumurta", "sucuk", "salam", "hindi", "kuzu", "pastırma"],
    holdout: ["salam", "hindi", "pastırma"],
  },
  {
    category: "Taze sebze",
    terms: ["domates", "salatalık", "biber", "soğan", "patates", "marul", "havuç", "patlıcan", "kabak", "sarımsak"],
    holdout: ["marul", "patlıcan", "kabak"],
  },
  {
    category: "Bakliyat & kuruyemiş",
    terms: ["mercimek", "nohut", "fasulye", "barbunya", "ceviz", "fındık", "badem", "leblebi"],
    holdout: ["barbunya", "leblebi"],
  },
  {
    category: "Yağ & sos",
    terms: ["yağ", "zeytinyağı", "zeytin", "salça", "sirke", "mayonez", "ketçap", "tahin"],
    holdout: ["sirke", "mayonez"],
  },
  {
    category: "Tatlandırıcı & baharat",
    terms: ["şeker", "tuz", "bal", "pekmez", "karabiber", "pul biber", "kimyon"],
    holdout: ["pekmez", "kimyon"],
  },
  {
    category: "İçecek",
    terms: ["su", "çay", "kahve", "kola", "meyve suyu", "maden suyu", "soda"],
    holdout: ["maden suyu", "soda"],
  },
  {
    category: "Dünya mutfağı",
    terms: ["soya sosu", "köri", "mozzarella", "parmesan", "noodle", "tortilla", "hummus", "pesto"],
    holdout: ["noodle", "pesto"],
  },
  {
    category: "Temizlik & kağıt",
    terms: ["deterjan", "bulaşık deterjanı", "çamaşır suyu", "peçete", "tuvalet kağıdı", "şampuan", "sabun"],
    holdout: ["çamaşır suyu", "sabun"],
  },
]

export const TERMS: TermEntry[] = CATEGORIES.flatMap(({ category, terms, holdout }) =>
  terms.map((term) => ({
    term,
    category,
    split: holdout.includes(term) ? ("holdout" as const) : ("train" as const),
  })),
)

/** Dosya adı olarak kullanılabilir terim anahtarı ("galeta unu" → "galeta-unu"). */
export const termSlug = (term: string) =>
  term
    .toLocaleLowerCase("tr-TR")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
