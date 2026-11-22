/**
 * covergen: deterministik kapak üreticisi.
 *
 *   design(seed, category, opts) → CoverSpec   (bütün rastgele kararlar)
 *   render(spec)                 → SVG string  (mesafe alanı → pürüzlü yol)
 *
 * Yayındaki kapaklar covers.snapshot.test.ts ile korunur.
 */

export {
  CATEGORY_PALETTES,
  contrast,
  inkOn,
  PALETTES,
  type Palette,
  type PaletteId,
} from "./color"
export { COVER_SIZE, design, OG_SIZE, type DesignOptions } from "./design"
export { render } from "./render"
export { hash32 } from "./rng"
export {
  MOTIF_TYPES,
  type CoverSpec,
  type FieldParams,
  type MotifSpec,
  type MotifType,
} from "./spec"
