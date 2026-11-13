// Otomatik ad "Sepet · 13 Kas 14:32" kayıt saatini taşır; sayfada yalnız tarih.
const AUTO_NAME_TIME = /^(.* · \d{2} \p{L}+) \d{2}:\d{2}$/u

export function publicRecordTitle(title: string): string {
  return title.replace(AUTO_NAME_TIME, "$1")
}
