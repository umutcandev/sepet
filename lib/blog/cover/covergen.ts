/**
 * covergen: kategori paletli, deterministik op-art kapak üreticisi.
 *
 *   design(seed, category, opts) → CoverSpec   (bütün rastgele kararlar burada)
 *   render(spec)                 → SVG string  (saf geometri)
 *
 * Aynı seed + kategori + varyant her zaman aynı görseli verir. Spec düz
 * JSON'dur: saklanabilir, elle düzenlenebilir, tekrar render edilebilir.
 *
 * Kategori renk ailesini seçer; on bir motifin her biri her kategoride eşit
 * olasılıkla çıkar. Motifler motifs/ altında, her biri kendi design ve render
 * fonksiyonuyla: çizgi alanı, halkalar, dalga çizgileri, nokta ızgarası,
 * moiré, kutupsal, Truchet, yama, dokuma, topoğrafya, piksel tarama.
 *
 * Bağımlılığı yok. Motordaki her değişiklik aynı slug için farklı bir görsel
 * doğurabilir; yayındaki kapaklar covers.snapshot.test.ts ile korunur.
 */

export { contrast } from "./color"
export { POLARITIES, type Palette, type Polarity } from "./color"
export { COVER_SIZE, design, OG_SIZE, type DesignOptions } from "./design"
export { frameOf, type Frame } from "./geometry"
export { render } from "./render"
export { hash32 } from "./rng"
export {
  MOTIF_TYPES,
  type CoverSpec,
  type MotifSpec,
  type MotifType,
} from "./spec"
