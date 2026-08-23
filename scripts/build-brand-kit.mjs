// İndirilebilir marka varlıklarını üretir:
//   public/brand/sepet-logo-light.svg   (koyu zeminde kullanılacak açık işaret)
//   public/brand/sepet-logo-dark.svg    (açık zeminde kullanılacak koyu işaret)
//   public/brand/sepet-medya-kiti.zip   (yukarıdakiler + wordmark'lar + kare + OG)
//
// İşaretin yolları `lib/brand/mark.ts`ten okunur — ekrandaki bileşen de aynı
// kaynaktan beslendiği için indirilen dosya ekrandakinden sapmaz.
//
// Çalıştırma: node scripts/build-brand-kit.mjs
// Çıktılar repoya commit'lenir; her build'de üretilmez.

import { execFileSync } from "node:child_process"
import {
  mkdtempSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const brandDir = join(root, "public", "brand")

// TS modülünü ayrıştırıcı kurmadan okumak için kaynaktan çekiyoruz: dosya
// yalnızca sabit dizgeler içeriyor, bu yüzden düz regex yeterli ve kırılgan
// bir derleme adımı eklemek gerekmiyor.
const markSource = readFileSync(join(root, "lib", "brand", "mark.ts"), "utf8")

const viewBox = markSource.match(/MARK_VIEWBOX = "([^"]+)"/)[1]
const ink = {
  light: markSource.match(/light: "(#[0-9A-Fa-f]{6})"/)[1],
  dark: markSource.match(/dark: "(#[0-9A-Fa-f]{6})"/)[1],
}
const paths = [...markSource.matchAll(/^ {2}"(M[^"]+)"/gm)].map((m) => m[1])

if (paths.length === 0) {
  throw new Error("lib/brand/mark.ts içinden yol okunamadı")
}

function markSvg(fill) {
  const body = paths
    .map((d) => `  <path d="${d}" fill="${fill}" />`)
    .join("\n")
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none">\n${body}\n</svg>\n`
}

// Adlandırma wordmark'la aynı mantıkta: "-light" AÇIK MÜREKKEPLİ dosyadır,
// yani koyu zeminde kullanılır (bkz. sepet-light.svg).
const generated = {
  "sepet-logo-light.svg": markSvg(ink.dark),
  "sepet-logo-dark.svg": markSvg(ink.light),
}

for (const [name, contents] of Object.entries(generated)) {
  writeFileSync(join(brandDir, name), contents, "utf8")
  console.log("yazıldı:", name)
}

// ── Medya kiti
const kitFiles = [
  "sepet-dark.svg",
  "sepet-light.svg",
  "sepet-logo-dark.svg",
  "sepet-logo-light.svg",
  "sepet-square-dark.webp",
  "sepet-square-light.webp",
  "opengraph-image.png",
]

const staging = mkdtempSync(join(tmpdir(), "sepet-kit-"))
try {
  for (const file of kitFiles) {
    copyFileSync(join(brandDir, file), join(staging, file))
  }
  writeFileSync(
    join(staging, "OKUBENI.txt"),
    [
      "Sepet — Marka Varlıkları",
      "",
      "sepet-dark.svg / sepet-logo-dark.svg   → koyu mürekkep, AÇIK zeminde kullanın",
      "sepet-light.svg / sepet-logo-light.svg → açık mürekkep, KOYU zeminde kullanın",
      "sepet-square-*.webp                    → kare kullanımlar (avatar, uygulama simgesi)",
      "opengraph-image.png                    → paylaşım görseli",
      "",
      "Logoyu germeyin, döndürmeyin, renklerini değiştirmeyin.",
      "https://www.trysepet.com",
      "",
    ].join("\n"),
    "utf8",
  )

  const out = join(brandDir, "sepet-medya-kiti.zip")
  rmSync(out, { force: true })
  // -j: dizin yapısını düzleştir, -X: platforma özgü ekstra alanları yazma
  // (böylece aynı girdilerden aynı zip çıkar).
  execFileSync("zip", ["-jqX", out, ...kitFiles.map((f) => join(staging, f)), join(staging, "OKUBENI.txt")])
  console.log("yazıldı: sepet-medya-kiti.zip")
} finally {
  rmSync(staging, { recursive: true, force: true })
}
