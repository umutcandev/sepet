import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

import { ImageResponse } from "next/og"
import { notFound } from "next/navigation"

import type { AuthorId } from "@/lib/blog/authors"
import { getAuthor, formatAuthorNames } from "@/lib/blog/authors"
import { getCategory } from "@/lib/blog/categories"
import { getPostBySlug } from "@/lib/blog"
import { absoluteUrl } from "@/lib/site"

// Yazı başına otomatik kapak + sosyal (OG/Twitter) görseli. Aynı çıktı hem index
// kartında/yazı başında kapak hem de paylaşım önizlemesi olarak kullanılır.
// frontmatter.cover doluysa metadata onu tercih eder; burası boş kapaklar içindir.

export const alt = "Sepet Blog"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

type FontData = { name: "Geist"; data: ArrayBuffer; weight: 400 | 600; style: "normal" }

// Satori woff2 çözemez (yalnız ttf/otf/woff), o yüzden burada `fonts/`
// altındaki statik TTF'ler kullanılır — tarayıcıya giden variable woff2'ler
// değil. Bkz. fonts/README.md.
//
// `new URL(..., import.meta.url)` ÇAĞRI BAŞINA BİR SABİT LİTERAL ile kurulmak
// zorunda: bundler bu ifadeyi statik olarak tarayıp varlığı çıktıya kopyalar.
// Yol değişkenle (`../_fonts/${file}`) kurulduğunda Turbopack tek bir varlığa
// bağlıyor ve 400 ile 600 aynı dosyaya çözülüyordu; SemiBold girdisi ölüydü.
// Bu yüzden iki URL de ayrı ayrı, modül düzeyinde yazılı.
const GEIST_REGULAR = new URL("../../../fonts/Geist-Regular.ttf", import.meta.url)
const GEIST_SEMIBOLD = new URL("../../../fonts/Geist-SemiBold.ttf", import.meta.url)

// Çözülen değer `file:///…/.next/server/assets/…` biçimindedir ve Node'un
// fetch'i `file:` şemasını desteklemez — eski kod tam da bu yüzden her istekte
// patlayıp sessizce Google Fonts'a düşüyordu (dinamik rota olduğu için istek
// başına iki ağ turu). Dosyayı diskten okuyoruz; ağ yok.
async function readFontFile(url: URL): Promise<ArrayBuffer | null> {
  try {
    if (url.protocol === "file:") {
      const buf = await readFile(fileURLToPath(url))
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
    }
    // Edge benzeri bir runtime'da varlık http(s) üzerinden sunulur.
    const res = await fetch(url)
    return res.ok ? await res.arrayBuffer() : null
  } catch {
    return null
  }
}

// Aynı lambda içindeki sonraki render'lar diski tekrar okumasın diye modül
// düzeyinde tutulur. Font dosyaları build çıktısıyla birlikte geldiği için
// içerik istekler arasında değişmez.
let fontsPromise: Promise<FontData[]> | null = null

function loadGeist(): Promise<FontData[]> {
  fontsPromise ??= Promise.all([
    readFontFile(GEIST_REGULAR),
    readFontFile(GEIST_SEMIBOLD),
  ]).then(([regular, semibold]) => {
    const loaded: FontData[] = []
    if (regular) loaded.push({ name: "Geist", data: regular, weight: 400, style: "normal" })
    if (semibold) loaded.push({ name: "Geist", data: semibold, weight: 600, style: "normal" })
    if (loaded.length < 2) {
      // Yedeğe sessizce düşmek eski kusurun ta kendisiydi. Font olmadan
      // ImageResponse sistem yüzüyle çizer; en azından log'a düşsün.
      console.warn(
        `[opengraph-image] Geist TTF okunamadı (${loaded.length}/2); OG görseli sistem fontuna düşecek.`,
      )
    }
    return loaded
  })
  return fontsPromise
}

// Satori `/blog/authors/x.jpg` gibi göreli yolları çözemez; avatarı okuyup data
// URI'ye çeviriyoruz. Önce disk (public/ çalışma dizininde varsa, ağ yok),
// olmazsa kendi origin'imizden HTTP ile.
async function loadAvatar(id: AuthorId): Promise<string | null> {
  const path = getAuthor(id).avatar
  if (!path) return null

  // Uzantıya değil sihirli baytlara bakıyoruz: repodaki .jpg dosyaları aslında
  // PNG ve Satori yanlış MIME'da "Invalid JPEG" atıyor.
  const toDataUri = (data: ArrayBuffer | Buffer) => {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(new Uint8Array(data))
    const mime =
      buf[0] === 0x89 && buf[1] === 0x50
        ? "image/png"
        : buf[8] === 0x57 && buf[9] === 0x45
          ? "image/webp"
          : "image/jpeg"
    return `data:${mime};base64,${buf.toString("base64")}`
  }

  try {
    const { readFile } = await import("node:fs/promises")
    const { join } = await import("node:path")
    return toDataUri(await readFile(join(process.cwd(), "public", path)))
  } catch {
    // dosya sistemi yoksa (edge/serverless bundle) HTTP'ye düş
  }

  try {
    const res = await fetch(absoluteUrl(path))
    if (!res.ok) return null
    return toDataUri(await res.arrayBuffer())
  } catch {
    // avatar okunamazsa baş harf fallback'i çizilir
    return null
  }
}

/** "Umutcan Kaya" → "UK" (AvatarFallback ile aynı mantık). */
function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function titleFontSize(title: string): number {
  if (title.length <= 30) return 66
  if (title.length <= 55) return 56
  if (title.length <= 80) return 46
  return 40
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  // Bilinmeyen slug'da sayfa (page.tsx) 404 veriyor; OG görseli de tutarlı
  // olsun diye 200 + generic görsel yerine 404 döndürüyoruz.
  if (!post) notFound()

  const title = post.title
  const categoryLabel = getCategory(post.category).label
  const authorNames = formatAuthorNames(post.authors)
  const readingTime = post.metadata.readingTime
  // İlk yazarın rolü (tek yazarda alt satır olarak gösterilir).
  const primaryRole =
    post.authors.length === 1 ? getAuthor(post.authors[0]).role : ""

  const [fonts, avatars] = await Promise.all([
    loadGeist(),
    Promise.all(
      post.authors.map(async (id) => ({
        name: getAuthor(id).name,
        src: await loadAvatar(id),
      })),
    ),
  ])

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "linear-gradient(135deg, #FFFBF5 0%, #F7ECDC 52%, #F0E0CB 100%)",
          color: "#3D2418",
          fontFamily: fonts.length ? "Geist" : undefined,
          position: "relative",
        }}
      >
        {/* Sıcak köşe parıltısı */}
        <div
          style={{
            position: "absolute",
            top: -160,
            right: -120,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(192,133,82,0.22) 0%, rgba(192,133,82,0) 70%)",
            display: "flex",
          }}
        />

        {/* Üst: logo (sol) + kategori rozeti (sağ) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <svg width="238" height="69" viewBox="0 0 1085 314" fill="none">
            <path
              d="M619.309 4.67785C648.939 4.67458 688.902 1.49726 713.486 21.0362C731.727 35.5326 739.522 65.5919 741.125 88.2472C743.709 124.768 745.101 180.878 720.816 211.031C706.931 228.272 685.168 233.419 664.401 235.366C650.474 236.187 639.273 235.701 625.427 234.933C626.099 243.703 625.98 255.556 626.193 264.477C626.632 279.385 627.221 294.289 627.961 309.185L557.754 309.196C558.886 207.695 558.893 106.184 557.774 4.68175L619.309 4.67785ZM667.755 71.1534C660.557 61.4174 642.031 61.8685 631.089 62.3243L624.714 62.5362C624.717 100.724 624.214 140.05 624.75 178.137C638.477 178.191 653.39 179.665 665.14 172.153C673.677 164.892 676.662 151.509 677.184 140.152C678.117 119.913 680.469 88.3476 667.755 71.1534Z"
              fill="#6D4530"
            />
            <path
              d="M274.875 0.234392C279.567 -0.218904 291.068 0.0820314 295.801 0.328944C317.123 1.44134 341.049 5.675 355.928 22.4803C375.004 44.0251 373.149 79.8171 371.713 106.813C370.694 106.665 369.69 106.584 368.661 106.561C350.624 106.143 332.02 105.16 314.027 106.404C314.336 93.6842 316.934 70.3633 307.229 61.173C298.49 52.896 275.871 52.0196 267.414 61.4117C262.097 67.3166 261.094 74.9953 261.452 82.6183C260.554 114.41 288.333 123.486 312.297 133.812C351.576 150.738 373.798 179.913 374.342 223.272C374.644 247.337 372.203 271.885 354.889 290.634C337.431 309.538 311.897 312.535 287.737 313.381C281.796 313.429 275.855 313.253 269.927 312.854C197.529 307.9 190.484 265.479 194.666 204.309C216.392 205.763 233.204 206.457 255.056 205.007C254.664 216.927 253.146 243.329 262.312 251.999C270.943 260.163 295.18 260.965 303.362 251.185C308.712 244.79 309.568 235.897 308.983 227.85C308.003 194.023 281.016 185.206 254.427 174.756C243.987 170.372 231.932 163.294 223.236 155.863C202.889 138.476 196.478 117.688 194.722 91.8855C193.136 68.5635 195.896 42.7971 212.105 24.5594C228.437 6.18411 251.689 1.80167 274.875 0.234392Z"
              fill="#6D4530"
            />
            <path
              d="M754.889 5.492L913.788 5.48462C913.192 25.9167 913.388 48.7933 913.73 69.2762L822.505 68.59C822.273 87.7722 822.484 107.415 822.479 126.635L880.523 125.875C890.522 125.733 901.491 125.856 911.405 125.346C910.941 144.565 910.798 163.79 910.978 183.013C881.931 182.994 851.709 182.145 822.484 181.85L822.479 220.159L822.5 242.285L913.746 242.008C913.419 264.679 913.424 287.354 913.773 310.025C861.434 309.276 807.328 309.991 754.842 309.991C754.515 295.087 755.227 279.429 755.279 264.473L755.485 157.601L755.321 54.9912C755.242 38.6196 754.52 21.8417 754.889 5.492Z"
              fill="#6D4530"
            />
            <path
              d="M386.996 5.48462L545.857 5.50117C545.229 25.6123 545.462 49.0513 545.825 69.247L454.613 68.5418L454.571 126.563C479.948 126.665 505.47 125.729 530.861 125.634C534.965 125.619 539.202 125.577 543.29 125.239C542.633 143.566 543.067 164.471 543.069 182.997L454.599 181.814L454.594 219.611L454.649 242.21C484.271 242.828 515.971 241.964 545.853 241.991C545.231 263.795 545.536 288.068 545.801 309.966L386.879 309.979L387.586 115.266C387.568 79.3269 386.216 41.1248 386.996 5.48462Z"
              fill="#6D4530"
            />
            <path
              d="M925.883 4.48947L1084.02 4.48462L1084 76.045C1069.67 75.9464 1054.69 75.4826 1040.29 75.2381L1040.54 270.344C1041.25 282.87 1040.83 296.629 1041.39 309.655C1031.94 308.345 1017.82 308.648 1008.06 308.636C995.492 308.621 980.99 308.361 968.624 309.58C970.322 286.768 969.505 257.577 969.721 234.692L969.948 75.2924C956.057 75.0073 939.794 75.7161 925.756 76.0323C926.326 52.3393 925.724 28.2162 925.883 4.48947Z"
              fill="#6D4530"
            />
            <path
              d="M99.4396 94.1284C101.011 94.0397 103.373 95.6949 104.839 96.5044L116.049 102.703L149.026 121.078C154.953 124.382 160.889 127.667 166.81 130.985C167.433 131.355 167.86 131.533 168.221 132.255C169.551 134.919 170.538 137.979 171.609 140.791C173.586 145.863 175.509 150.962 177.378 156.085C178.252 156.542 179.126 157 180 157.459V206.384C177.355 207.074 174.728 207.759 172.15 208.415L128.27 219.606C119.696 221.801 110.983 224.113 102.401 226.188L107.578 275.73C107.745 277.325 107.997 279.315 108.093 280.886L162.302 264.352L176.963 259.874C177.365 259.751 178.575 259.419 180 258.997V291.612H139.829L111.388 296.1L104.158 298.269C102.678 298.717 101.168 299.201 99.6749 299.577C98.9967 299.748 98.6729 299.704 98.0743 299.31C95.9262 297.892 93.7604 296.306 91.6544 294.819L78.4239 285.428L58.9894 271.488C55.6472 269.09 52.2671 266.711 48.9503 264.275C48.0458 263.679 47.2306 262.652 46.9523 261.492C46.2349 258.501 45.6602 255.385 45.0558 252.36L41.4308 234.274L36.0997 207.644C35.1367 202.848 33.9989 197.589 33.2003 192.781C30.9762 191.526 27.8182 189.832 25.7784 188.228C25.5703 188.064 25.1738 187.341 25.0255 187.068C24.9161 184.997 24.987 182.198 24.9864 180.084C24.9654 176.458 24.9785 172.833 25.0245 169.209L25.1095 169.061C26.4173 166.835 28.7405 166.826 30.9591 166.322L38.2501 164.662L65.3849 158.513L80.5118 118.444C82.7353 112.556 84.7668 106.473 87.2052 100.7C87.4513 100.117 87.7646 99.3035 88.2208 98.8989C89.5102 97.756 97.3074 94.9705 99.4396 94.1284ZM50.6612 201.867C51.0099 204.535 51.7134 207.91 52.2179 210.61L55.1222 225.954L58.6124 244.109C59.1312 246.762 59.687 250.057 60.2921 252.646L83.8116 270.122L90.7618 275.245C91.5932 275.857 93.5633 277.376 94.4044 277.829L88.9161 226.103C80.0713 220.581 71.2582 214.988 62.4777 209.329C58.8829 207.037 54.2925 203.879 50.6612 201.867ZM138.593 158.077C138.267 157.802 137.836 157.886 137.455 157.961L47.3693 178.982L65.2052 190.249C68.1854 192.145 94.0443 208.806 95.2306 208.913C96.7748 209.052 102.193 207.382 104.107 206.902L122.625 202.297L133.539 172.658L137.081 163.013C137.445 162.02 138.825 158.881 138.593 158.077ZM157.697 148.952C155.999 152.877 154.109 158.429 152.583 162.541L144.281 184.876C142.701 189.133 141.002 193.935 139.323 198.104L151.475 195.06L172.484 189.803C170.955 185.341 158.391 149.747 157.697 148.952ZM88.6173 142.215C87.1251 146.252 85.6026 150.632 84.0568 154.595C87.3057 154.048 91.5677 153.024 94.8302 152.259C99.8863 151.144 105.935 149.998 110.867 148.691C109.728 145.621 98.9566 116.988 98.2706 116.261L88.6173 142.215ZM115.806 121.2C116.31 122.714 116.908 124.146 117.459 125.631C119.911 132.242 122.686 138.788 125.069 145.423C128.87 144.574 134.498 143.033 138.282 143.041C138.903 143.042 142.526 144.289 143.609 144.531C144.29 142.6 145.067 140.511 145.674 138.563L125.666 126.873C122.959 125.292 118.464 122.459 115.806 121.2Z"
              fill="#6D4530"
            />
            <path
              d="M102.338 244.463L105.425 262.431L163.181 247.409L157.706 230.545L102.338 244.463Z"
              fill="#6D4530"
            />
            <path
              d="M175.767 164.878L145.813 145.77V162.813L175.767 181.921V164.878Z"
              fill="#6D4530"
            />
            <path
              d="M52.9538 220.122L56.457 234.89L93.6221 261.648L91.0978 243.147L52.3661 217.484L52.9538 220.122Z"
              fill="#6D4530"
            />
            <path
              d="M181.707 1.16449L180 58.5V114.5L180 220.5C180.025 270.434 181.707 260.97 181.707 310H156.658V269.201L156.658 186.053L156.658 109.102L156.658 55.9079V25.2046C115.501 24.3464 66.0864 25.2412 24.5677 25.2046C25.4323 -5.0906 19.3678 32.4255 19 2H64H103L140.5 2L181.707 1.16449Z"
              fill="#6D4530"
            />
            <path
              d="M1.62463e-05 310.836L1.70684 218.5L1.70684 155.5L1.70683 123C1.70683 97.5 1.70683 57 1.62463e-05 2L25.0485 2L25.0485 42.7993L25.0485 125.947L25.0485 202.898L25.0485 256.092L25.0485 286.795C66.2059 287.654 115.621 286.759 157.139 286.795C156.275 317.091 160.839 280.074 161.207 310.5L117.707 310H78.7069L41.2069 310L1.62463e-05 310.836Z"
              fill="#6D4530"
            />
          </svg>

          <div
            style={{
              display: "flex",
              padding: "12px 24px",
              borderRadius: 12,
              background: "#6D4530",
              color: "#FFF8F0",
              fontSize: 26,
              fontWeight: 600,
            }}
          >
            {categoryLabel}
          </div>
        </div>

        {/* Orta: başlık */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: titleFontSize(title),
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              maxWidth: 980,
            }}
          >
            {title}
          </div>
        </div>

        {/* Alt: yazar + site */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {/* Avatar grubu: birden fazla yazarda üst üste biner */}
            <div style={{ display: "flex" }}>
              {avatars.map((author, index) => (
                // Satori img üzerinde border'ı çizmiyor; halkayı dış katmanın
                // padding + arka planıyla yapıyoruz.
                <div
                  key={author.name}
                  style={{
                    display: "flex",
                    padding: 4,
                    borderRadius: 9999,
                    background: "#FFF8F0",
                    marginLeft: index === 0 ? 0 : -26,
                  }}
                >
                  {author.src ? (
                    // Satori sadece <img> render eder; next/image burada geçersiz.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={author.src}
                      alt=""
                      width={72}
                      height={72}
                      style={{ borderRadius: 9999, objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 9999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#E5D3BC",
                        color: "#6D4530",
                        fontSize: 26,
                        fontWeight: 600,
                      }}
                    >
                      {initials(author.name)}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", fontSize: 30, fontWeight: 600 }}>
                {authorNames}
              </div>
              <div style={{ display: "flex", fontSize: 24, color: "#8C5A3C" }}>
                {primaryRole || `${readingTime} dk okuma`}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#8C5A3C" }}>
            trysepet.com
          </div>
        </div>
      </div>
    ),
    { ...size, ...(fonts.length ? { fonts } : {}) },
  )
}
