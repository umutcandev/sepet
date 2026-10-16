/**
 * Modelin "Düşündüm" notunun kullanıcıya gösterilmeden önceki son kontrolü.
 * Prompt iç işleyişten bahsetmeyi yasaklıyor; yine de mod adı, kural, alan adı
 * ya da İngilizce bir özet sızarsa not hiç gösterilmez. Yarım bir notu
 * düzeltmeye çalışmaktansa göstermemek daha iyi: kart ve cevap zaten geliyor.
 */

// \b yalnızca ASCII harfleri tanır ("şema" başında sınır bulamaz); Türkçe
// harfler için sınır elle yazılır.
const word = (body: string) =>
  new RegExp(`(?<![\\p{L}\\p{N}])(?:${body})(?![\\p{L}\\p{N}])`, "iu")

const LEAKS: RegExp[] = [
  // "A modu", "sohbet moduna", "chat mode"; "model", "moda" değil.
  word("mod(?:e|es|u|un|una|unda|undan|unu|unun|lar[\\p{L}]*)?"),
  word("plan\\s*[abc]"),
  /prompt|talimat|kural|şema|json|protokol|protocol|parse/iu,
  /chatResponse|searchQuery|dishName|unknownReason|rawName/u,
  // Gemini'nin kendi İngilizce özeti ("I'm currently processing the input").
  word("the|user|i'm|i am|i will|i need"),
]

/** 1-3 cümle isteniyor; bunun çok üstü bir şeylerin ters gittiğini gösterir. */
const MAX_LENGTH = 600

export function userThought(raw: string | null | undefined): string | null {
  const text = raw?.trim().replace(/\s+/g, " ") ?? ""
  if (!text || text.length > MAX_LENGTH) return null
  if (LEAKS.some((re) => re.test(text))) return null
  return text
}
