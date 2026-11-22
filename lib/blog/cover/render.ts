import { makeField } from "./sdf"
import type { CoverSpec } from "./spec"
import { traceField } from "./trace"

/** Kapak → SVG: zemin ve tek yol. Pürüz koordinatlarda, filtre yok. */
export function render(spec: CoverSpec): string {
  const { width: W, height: H, palette, motif } = spec
  const S = Math.min(W, H)
  const field = makeField(motif.field, W, H)
  const d = traceField(field, W, H, {
    step: Math.max(0.9, (S / 864) * 1.4),
    coarse: 6,
    tolerance: 0.45,
    margin: motif.field.rough * 3 + motif.field.warp * 0.2 + 0.01,
  })
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    `<rect width="${W}" height="${H}" fill="${palette.bg}"/>` +
    (d ? `<path fill="${palette.fg}" fill-rule="evenodd" d="${d}"/>` : "") +
    `</svg>`
  )
}
