// Yazar kayıt defteri (registry) — kod içi sabit. Ayrı yazar sayfası YOK;
// SEO entity doğrulaması author.url + sameAs = X profili ile sağlanır (bkz.
// jsonld.ts). Yazar eklemek = buraya kayıt + (isteğe bağlı) avatar görseli.
//
// NOT: `avatar` doluysa AvatarImage gösterilir (Radix img; uzak URL serbest,
// next/image değil); boşsa AvatarFallback baş harfleri gösterir.

export type Author = {
  name: string
  role: string
  /** Avatar URL (yerel /public yolu ya da uzak https). Yoksa null. */
  avatar: string | null
  /** X (Twitter) profili — başlık altı link ve sameAs. */
  x: string
}

export const AUTHORS = {
  umutcan: {
    name: "Umutcan Kaya",
    role: "Yazılım Geliştiricisi",
    // Yerel kopya (public/): uzak pbs.twimg.com CSP img-src'de değil ve hotlink
    // güvenilmez; bu yüzden 'self' altında servis ediyoruz.
    avatar: "/blog/authors/umutcan.jpg",
    x: "https://x.com/umutcandev",
  },
  nur: {
    name: "Nur Salan",
    role: "Fizyoterapi Uzmanı",
    avatar: "/blog/authors/nur.jpg",
    x: "https://x.com/nursalannn",
  },
} as const satisfies Record<string, Author>

export type AuthorId = keyof typeof AUTHORS

// Velite şeması `s.enum(AUTHOR_IDS)` için tuple.
export const AUTHOR_IDS = Object.keys(AUTHORS) as [AuthorId, ...AuthorId[]]

export function getAuthor(id: AuthorId): Author {
  return AUTHORS[id]
}

export function getAuthors(ids: readonly AuthorId[]): Author[] {
  return ids.map(getAuthor)
}

/** İnsan okunur yazar adı listesi: "X", "X ve Y", "X, Y ve Z". */
export function formatAuthorNames(ids: readonly AuthorId[]): string {
  const names = ids.map((id) => AUTHORS[id].name)
  if (names.length <= 1) return names[0] ?? ""
  if (names.length === 2) return `${names[0]} ve ${names[1]}`
  return `${names.slice(0, -1).join(", ")} ve ${names[names.length - 1]}`
}
