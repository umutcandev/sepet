import type * as React from "react"
import {
  ChartColumnIcon,
  CircleHelpIcon,
  CookieIcon,
  CreditCardIcon,
  DownloadIcon,
  FileTextIcon,
  LogOutIcon,
  MapPinIcon,
  MonitorIcon,
  Settings2Icon,
  ShieldIcon,
  Trash2Icon,
  UserIcon,
  UserRoundIcon,
} from "lucide-react"

export type TabKey = "genel" | "hesap" | "gizlilik" | "abonelik" | "kullanim"

type IconType = React.ComponentType<{ className?: string }>

export const NAV_ITEMS: Array<{
  key: TabKey
  label: string
  icon: IconType
}> = [
  { key: "genel", label: "Genel", icon: Settings2Icon },
  { key: "hesap", label: "Hesap", icon: UserIcon },
  { key: "gizlilik", label: "Gizlilik", icon: ShieldIcon },
  { key: "abonelik", label: "Abonelik", icon: CreditCardIcon },
  { key: "kullanim", label: "Kullanım", icon: ChartColumnIcon },
]

export const TAB_LABEL: Record<TabKey, string> = {
  genel: "Genel",
  hesap: "Hesap",
  gizlilik: "Gizlilik",
  abonelik: "Abonelik",
  kullanim: "Kullanım",
}

// Tekil ayar girdisi. `target`, ilgili paneldeki data-search-target ile birebir
// eşleşmelidir; arama sonucu seçildiğinde o öğeye kaydırılıp vurgulanır.
type SettingEntry = {
  target: string
  title: string
  keywords: string
  icon: IconType
}

const GENEL_SETTINGS: SettingEntry[] = [
  {
    target: "avatar",
    title: "Avatar",
    keywords: "profil fotoğraf resim avatar görsel pp",
    icon: UserRoundIcon,
  },
  {
    target: "tam-ad",
    title: "Tam ad",
    keywords: "isim ad kullanıcı adı profil",
    icon: UserIcon,
  },
  {
    target: "konum",
    title: "Konum",
    keywords: "konum adres sehir mahalle harita market sube bolge",
    icon: MapPinIcon,
  },
  {
    target: "tema",
    title: "Tema",
    keywords: "tema gorunum acik koyu sistem dark light renk",
    icon: MonitorIcon,
  },
]

const HESAP_SETTINGS: SettingEntry[] = [
  {
    target: "cikis",
    title: "Tüm cihazlardan çıkış yap",
    keywords: "cikis oturum kapat logout cihaz",
    icon: LogOutIcon,
  },
  {
    target: "hesap-sil",
    title: "Hesabımı sil",
    keywords: "hesap sil arsiv kapat kaldir delete",
    icon: Trash2Icon,
  },
  {
    target: "oturumlar",
    title: "Aktif oturumlar",
    keywords: "oturum cihaz session aktif giris",
    icon: MonitorIcon,
  },
]

const GIZLILIK_SETTINGS: SettingEntry[] = [
  {
    target: "veri-disa-aktar",
    title: "Verilerini dışa aktar",
    keywords: "veri disa aktar export indir zip yedek tasima gdpr kvkk",
    icon: DownloadIcon,
  },
  {
    target: "sohbet-sil",
    title: "Tüm sohbetleri sil",
    keywords: "sohbet asistan gecmis sil temizle toplu",
    icon: Trash2Icon,
  },
  {
    target: "sepet-sil",
    title: "Tüm sepetleri sil",
    keywords: "sepet liste sil temizle toplu",
    icon: Trash2Icon,
  },
  {
    target: "fis-sil",
    title: "Tüm fişleri sil",
    keywords: "fis fatura makbuz sil temizle toplu gorsel",
    icon: Trash2Icon,
  },
  {
    target: "analiz-cerezleri",
    title: "Analiz çerezleri",
    keywords: "cerez analiz analytics gizlilik izleme takip opt out",
    icon: CookieIcon,
  },
  {
    target: "gizlilik-politikasi",
    title: "Gizlilik Politikası",
    keywords: "gizlilik politika yasal kvkk gdpr veri haklar",
    icon: FileTextIcon,
  },
]

const ABONELIK_SETTINGS: SettingEntry[] = [
  {
    target: "pro-yukselt",
    title: "Pro'ya yükselt",
    keywords: "pro yukselt abonelik satin al odeme aylik yillik plan upgrade",
    icon: CreditCardIcon,
  },
  {
    target: "abonelik-durumu",
    title: "Abonelik durumu",
    keywords: "abonelik durum plan pro yenilenme iptal fatura",
    icon: CreditCardIcon,
  },
  {
    target: "abonelik-yonet",
    title: "Aboneliği yönet",
    keywords: "abonelik yonet iptal portal fatura odeme degistir",
    icon: CreditCardIcon,
  },
  {
    target: "sss",
    title: "Sıkça sorulan sorular",
    keywords:
      "sss sik sorulan soru faq yardim iptal iade odeme guvenlik limit fiyat yenilenme",
    icon: CircleHelpIcon,
  },
  {
    target: "sozlesmeler",
    title: "Yasal sözleşmeler",
    keywords:
      "mesafeli satis sozlesme iptal iade gizlilik yasal odeme fatura polar kayitli satici",
    icon: FileTextIcon,
  },
]

const KULLANIM_SETTINGS: SettingEntry[] = [
  {
    target: "limits",
    title: "Kullanım Limitleri",
    keywords: "limit kota plan abonelik free pro yenilenir",
    icon: ChartColumnIcon,
  },
  { target: "chat", title: "Sohbet", keywords: "mesaj asistan konuşma", icon: ChartColumnIcon },
  {
    target: "text-messages",
    title: "Asistan mesajları",
    keywords: "metin sohbet mesaj yazı",
    icon: ChartColumnIcon,
  },
  {
    target: "image-analyses",
    title: "Görsel analizleri",
    keywords: "resim fotoğraf analiz görüntü kamera",
    icon: ChartColumnIcon,
  },
  { target: "storage", title: "Depolama", keywords: "kayıt saklama alan", icon: ChartColumnIcon },
  {
    target: "saved-baskets",
    title: "Sepet kaydetme",
    keywords: "sepet kayıt liste",
    icon: ChartColumnIcon,
  },
  {
    target: "saved-receipts",
    title: "Fiş kaydetme",
    keywords: "fiş fatura kayıt makbuz",
    icon: ChartColumnIcon,
  },
]

export type SearchEntry = {
  key: string
  tab: TabKey
  title: string
  subtitle: string
  keywords: string
  target?: string
  icon: IconType
}

function entriesFor(tab: TabKey, settings: SettingEntry[]): SearchEntry[] {
  return settings.map((s) => ({
    key: `${tab}:${s.target}`,
    tab,
    title: s.title,
    subtitle: TAB_LABEL[tab],
    keywords: s.keywords,
    target: s.target,
    icon: s.icon,
  }))
}

export const SEARCH_ENTRIES: SearchEntry[] = [
  ...NAV_ITEMS.map(
    (n): SearchEntry => ({
      key: `tab:${n.key}`,
      tab: n.key,
      title: n.label,
      subtitle: "Bölüm",
      keywords: "",
      icon: n.icon,
    }),
  ),
  ...entriesFor("genel", GENEL_SETTINGS),
  ...entriesFor("hesap", HESAP_SETTINGS),
  ...entriesFor("gizlilik", GIZLILIK_SETTINGS),
  ...entriesFor("abonelik", ABONELIK_SETTINGS),
  ...entriesFor("kullanim", KULLANIM_SETTINGS),
]

// Türkçe-duyarlı, aksandan bağımsız normalleştirme. Karakter eşlemeleri 1:1
// olduğu için sonuç dizgesi orijinalle aynı uzunlukta ve indeks hizalı kalır;
// bu da eşleşen aralığın orijinal metin üzerinde vurgulanmasını mümkün kılar.
export function normalize(value: string): string {
  return value
    .toLocaleLowerCase("tr")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/û/g, "u")
}
