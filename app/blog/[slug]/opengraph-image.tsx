import { ImageResponse } from "next/og"
import { notFound } from "next/navigation"

import { getAuthor, formatAuthorNames } from "@/lib/blog/authors"
import { getCategory } from "@/lib/blog/categories"
import { getPostBySlug } from "@/lib/blog"

// Yazı başına otomatik kapak + sosyal (OG/Twitter) görseli. Aynı çıktı hem index
// kartında/yazı başında kapak hem de paylaşım önizlemesi olarak kullanılır.
// frontmatter.cover doluysa metadata onu tercih eder; burası boş kapaklar içindir.

export const alt = "Sepet Blog"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

type FontData = { name: "Geist"; data: ArrayBuffer; weight: 400 | 600; style: "normal" }

// Geist'i Google Fonts'tan TTF olarak çek (yedek yol). Özel UA YOK: varsayılan
// fetch UA'sına Google css2 truetype döndürür (Next.js resmi örneği). Satori
// woff2 okuyamaz; ttf/otf/woff kabul eder.
async function loadGeistFromGoogle(
  text: string,
  weight: 400 | 600,
): Promise<FontData | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=Geist:wght@${weight}&text=${encodeURIComponent(
      text,
    )}`
    const css = await fetch(url).then((res) => res.text())
    const src = css.match(
      /src:\s*url\((.+?)\)\s*format\('(?:opentype|truetype|woff)'\)/,
    )?.[1]
    if (!src) return null
    const data = await fetch(src).then((res) => res.arrayBuffer())
    return { name: "Geist", data, weight, style: "normal" }
  } catch {
    return null
  }
}

// Önce repo-içi yerel font (app/blog/_fonts/, import.meta.url ile bundle'lanır;
// ağ gerektirmez), yoksa Google'a düş.
async function loadGeist(
  weight: 400 | 600,
  localFile: string,
  text: string,
): Promise<FontData | null> {
  try {
    const data = await fetch(
      new URL(`../_fonts/${localFile}`, import.meta.url),
    ).then((res) => res.arrayBuffer())
    if (data.byteLength > 0) return { name: "Geist", data, weight, style: "normal" }
  } catch {
    // yerel font yoksa Google'a düş
  }
  return loadGeistFromGoogle(text, weight)
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

  const text = `${title}${categoryLabel}${authorNames}${primaryRole}Sepet${readingTime} dk okuma·trysepet.com`
  const [regular, semibold] = await Promise.all([
    loadGeist(400, "Geist-Regular.ttf", text),
    loadGeist(600, "Geist-SemiBold.ttf", text),
  ])
  const fonts = [regular, semibold].filter(
    (f): f is NonNullable<typeof f> => f != null,
  )

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

        {/* Üst: logo */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <svg width="280" height="69" viewBox="0 0 720 178" fill="none">
            <path
              d="M1.24144 3.51245C13.9954 3.11645 27.6497 3.3902 40.4641 3.3912L110.494 3.39295L325.265 3.39345C325.202 13.7957 325.626 24.5855 325.437 35.0447C325.35 39.8575 325.576 44.7825 325.281 49.6015L303.753 49.7317C300.673 49.7792 296.432 49.7487 293.428 50.0965C290.906 57.3715 289.461 63.9995 287.4 71.3887L281.63 92.182C280.802 95.0912 279.789 97.995 279.009 100.887C277.435 106.724 276.161 112.596 274.292 118.334C272.644 124.65 270.748 131.124 268.916 137.475C266.62 145.42 265.329 153.902 261.095 160.805C256.997 167.487 250.065 173.08 243.041 174.671C240.615 175.22 235.085 175.096 232.431 175.079L219.944 175.039L161.719 175.079L110.686 175.042C105.525 175.002 100.365 175.003 95.204 175.043C85.3312 175.116 79.5711 175.826 71.1497 168.654C62.4321 161.229 60.6542 151.882 57.5711 140.689C54.9338 131.116 52.117 121.627 49.4491 112.07C47.5996 105.2 46.2277 98.25 43.9111 91.5197C40.9749 81.618 38.3007 71.4425 35.6578 61.4382C34.6863 57.7612 33.179 53.648 32.7032 49.937C22.488 48.8747 10.2877 50.4455 0.178019 49.418C0.0836759 45.2552 -0.278698 5.0072 0.420181 3.6602L1.24144 3.51245Z"
              fill="#6D4530"
            />
            <path
              d="M204.936 50.6465C220.15 50.7101 237.46 51.1012 252.486 50.6886C252.374 65.4102 250.133 75.2596 244.235 88.6674C240.835 96.641 232.327 108.28 225.908 114.303C208.491 130.642 187.223 139.491 163.31 139.628C139.487 139.99 116.508 130.927 99.5055 114.461C84.7235 100.262 75.3295 81.4887 72.8936 61.2783C72.4893 57.6444 72.5035 54.2821 72.486 50.6382C88.1581 51.3925 104.787 50.3735 120.475 50.9024C120.429 61.6961 123.06 69.1092 129.736 77.4448C147.82 100.023 184.561 96.826 199.022 72.0727C203.205 64.9151 204.181 58.7374 204.936 50.6465Z"
              fill="#FFF8F0"
            />
            <path
              d="M380.187 4.25956e-05C386.037 4.25956e-05 391.19 1.25356 395.647 3.76058C400.144 6.22781 403.904 9.98835 406.928 15.0422C409.953 20.096 412.221 26.4432 413.733 34.0837C415.285 41.7241 416.061 50.6977 416.061 61.0044H397.378C397.378 53.4037 397.04 46.8974 396.363 41.4854C395.687 36.0734 394.652 31.6562 393.259 28.2339C391.866 24.7719 390.135 22.2449 388.066 20.6532C385.997 19.0216 383.549 18.2058 380.724 18.2058C378.535 18.2058 376.506 18.6834 374.636 19.6384C372.805 20.5935 371.213 22.0261 369.86 23.9362C368.547 25.8065 367.512 28.1344 366.756 30.92C366.04 33.6658 365.682 36.8295 365.682 40.4109C365.682 45.027 366.259 49.1855 367.413 52.8864C368.607 56.5474 370.119 59.8503 371.949 62.7951C373.78 65.7001 375.81 68.3066 378.038 70.6146C380.306 72.8829 382.515 74.9522 384.664 76.8225L389.141 80.7621C391.369 82.712 393.637 84.7614 395.945 86.9103C398.253 89.0592 400.482 91.3672 402.631 93.8345C404.819 96.3017 406.869 98.9679 408.779 101.833C410.689 104.698 412.34 107.842 413.733 111.264C415.166 114.687 416.28 118.407 417.076 122.427C417.912 126.406 418.329 130.783 418.329 135.559C418.329 142.324 417.474 148.332 415.763 153.585C414.052 158.838 411.604 163.275 408.421 166.896C405.237 170.478 401.377 173.204 396.841 175.074C392.344 176.944 387.31 177.88 381.739 177.88C375.372 177.88 369.781 176.626 364.966 174.119C360.151 171.572 356.111 167.712 352.848 162.539C349.625 157.366 347.198 150.859 345.566 143.02C343.934 135.181 343.119 125.948 343.119 115.323H361.742C361.742 122.924 362.16 129.51 362.996 135.081C363.871 140.652 365.125 145.268 366.756 148.929C368.388 152.551 370.417 155.257 372.845 157.047C375.272 158.798 378.058 159.674 381.202 159.674C383.709 159.674 386.017 159.137 388.126 158.062C390.275 156.948 392.125 155.356 393.677 153.287C395.269 151.178 396.502 148.611 397.378 145.587C398.253 142.523 398.691 139.041 398.691 135.141C398.691 130.485 398.074 126.267 396.841 122.486C395.607 118.706 393.976 115.244 391.946 112.1C389.956 108.916 387.668 106.011 385.082 103.385C382.535 100.759 379.948 98.2715 377.322 95.9237L372.785 91.805C370.915 90.1336 368.945 88.323 366.876 86.3731C364.806 84.3834 362.777 82.2146 360.787 79.8668C358.837 77.5189 356.967 74.9721 355.176 72.2263C353.425 69.4805 351.873 66.476 350.52 63.2129C349.167 59.9498 348.093 56.4081 347.297 52.5879C346.501 48.7677 346.103 44.6291 346.103 40.1722C346.103 33.8449 346.919 28.1941 348.551 23.2199C350.182 18.2456 352.49 14.0473 355.475 10.6251C358.459 7.16297 362.041 4.53656 366.219 2.74583C370.398 0.915306 375.053 4.25956e-05 380.187 4.25956e-05ZM481.901 3.58151V22.2051H445.25V78.7326H478.319V96.9384H445.19L445.25 155.615H483.094V174.298H425.194V3.58151H481.901ZM512.347 22.2051V92.76H522.972C532.005 92.76 538.75 89.8352 543.207 83.9854C547.664 78.1357 549.892 69.2417 549.892 57.3035C549.892 33.9046 541.058 22.2051 523.39 22.2051H512.347ZM492.291 3.58151H522.852C530.095 3.58151 536.581 4.83502 542.312 7.34204C548.082 9.80928 552.976 13.3709 556.996 18.0268C561.015 22.6827 564.079 28.3533 566.188 35.0387C568.337 41.7241 569.411 49.285 569.411 57.7213C569.411 66.0383 568.377 73.5196 566.307 80.1652C564.238 86.771 561.274 92.4019 557.414 97.0578C553.593 101.674 548.917 105.216 543.386 107.683C537.895 110.15 531.687 111.384 524.762 111.384H512.347V174.298H492.291V3.58151ZM634.98 3.58151V22.2051H598.33V78.7326H631.399V96.9384H598.27L598.33 155.615H636.174V174.298H578.274V3.58151H634.98ZM715.448 22.2051H689.243V174.298H669.187V22.2648L642.983 22.2051V3.58151H715.448V22.2051Z"
              fill="#6D4530"
            />
          </svg>
        </div>

        {/* Orta: kategori + başlık */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex" }}>
            <div
              style={{
                display: "flex",
                padding: "10px 22px",
                borderRadius: 9999,
                background: "#6D4530",
                color: "#FFF8F0",
                fontSize: 26,
                fontWeight: 600,
              }}
            >
              {categoryLabel}
            </div>
          </div>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 600 }}>
              {authorNames}
            </div>
            <div style={{ display: "flex", fontSize: 24, color: "#8C5A3C" }}>
              {primaryRole || `${readingTime} dk okuma`}
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
