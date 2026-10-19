import { hash32, Rng } from "./rng"
import { fmt, frameOf, type Frame, type Layer } from "./geometry"
import type { CoverSpec, MotifSpec } from "./spec"
import { renderContour } from "./motifs/contour"
import { renderDither } from "./motifs/dither"
import { renderDots } from "./motifs/dots"
import { renderMoire } from "./motifs/moire"
import { renderPolar } from "./motifs/polar"
import { renderQuilt } from "./motifs/quilt"
import { renderRings } from "./motifs/rings"
import { renderStripes } from "./motifs/stripes"
import { renderTruchet } from "./motifs/truchet"
import { renderWaves } from "./motifs/waves"
import { renderWeave } from "./motifs/weave"

export function renderMotif(motif: MotifSpec, fr: Frame, rng: Rng): Layer[] {
  switch (motif.type) {
    case "stripes":
      return renderStripes(motif, fr, rng)
    case "rings":
      return renderRings(motif, fr)
    case "waves":
      return renderWaves(motif, fr)
    case "dots":
      return renderDots(motif, fr)
    case "moire":
      return renderMoire(motif, fr)
    case "polar":
      return renderPolar(motif, fr)
    case "truchet":
      return renderTruchet(motif, fr)
    case "quilt":
      return renderQuilt(motif, fr)
    case "weave":
      return renderWeave(motif, fr)
    case "contour":
      return renderContour(motif, fr)
    case "dither":
      return renderDither(motif, fr)
  }
}

export function render(spec: CoverSpec): string {
  const { width: W, height: H, palette, motif } = spec
  const fr = frameOf(W, H)
  const layers = renderMotif(motif, fr, new Rng(spec.seed).fork("render"))
  const id = "cg" + hash32(spec.seed + motif.type + W + "x" + H).toString(36)
  const rectAttr = (f: Frame) =>
    `x="${fmt(f.x)}" y="${fmt(f.y)}" width="${fmt(f.w)}" height="${fmt(f.h)}"`
  let defs = `<clipPath id="${id}"><rect ${rectAttr(fr)}/></clipPath>`
  let body = ""
  layers.forEach((layer, i) => {
    if (!layer.d) return
    let attrs = `d="${layer.d}"`
    if (layer.stroke)
      attrs += ` fill="none" stroke="${palette.fg}" stroke-width="${fmt(layer.stroke)}" stroke-linecap="round" stroke-linejoin="round"`
    if (layer.fillRule) attrs += ` fill-rule="${layer.fillRule}"`
    if (layer.clip) {
      defs += `<clipPath id="${id}-${i}"><rect ${rectAttr(layer.clip)}/></clipPath>`
      attrs += ` clip-path="url(#${id}-${i})"`
    }
    body += `<path ${attrs}/>`
  })
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    `<defs>${defs}</defs><rect width="${W}" height="${H}" fill="${palette.bg}"/>` +
    `<g clip-path="url(#${id})" fill="${palette.fg}" fill-rule="evenodd">${body}</g></svg>`
  )
}
