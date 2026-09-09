import type * as React from "react"
import {
  RiBankCardLine,
  RiBarChartLine,
  RiComputerLine,
  RiCookieLine,
  RiDeleteBinLine,
  RiDownloadLine,
  RiEqualizerLine,
  RiFileTextLine,
  RiKey2Line,
  RiLogoutBoxLine,
  RiMapPinLine,
  RiQuestionLine,
  RiShieldCheckLine,
  RiShieldLine,
  RiUser3Line,
  RiUserLine,
} from "@remixicon/react"

export type TabKey = "genel" | "hesap" | "gizlilik" | "abonelik" | "kullanim"

type IconType = React.ComponentType<{ className?: string }>

export const NAV_ITEMS: Array<{
  key: TabKey
  label: string
  icon: IconType
}> = [
  { key: "genel", label: "Genel", icon: RiEqualizerLine },
  { key: "hesap", label: "Hesap", icon: RiUserLine },
  { key: "gizlilik", label: "Gizlilik", icon: RiShieldLine },
  { key: "abonelik", label: "Abonelik", icon: RiBankCardLine },
  { key: "kullanim", label: "Kullanım", icon: RiBarChartLine },
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
    icon: RiUser3Line,
  },
  {
    target: "tam-ad",
    title: "Tam ad",
    keywords: "isim ad kullanıcı adı profil",
    icon: RiUserLine,
  },
  {
    target: "konum",
    title: "Konum",
    keywords: "konum adres sehir mahalle harita market sube bolge",
    icon: RiMapPinLine,
  },
  {
    target: "tema",
    title: "Tema",
    keywords: "tema gorunum acik koyu sistem dark light renk",
    icon: RiComputerLine,
  },
]

const HESAP_SETTINGS: SettingEntry[] = [
  {
    target: "cikis",
    title: "Tüm cihazlardan çıkış yap",
    keywords: "cikis oturum kapat logout cihaz",
    icon: RiLogoutBoxLine,
  },
  {
    target: "hesap-sil",
    title: "Hesabımı sil",
    keywords: "hesap sil arsiv kapat kaldir delete",
    icon: RiDeleteBinLine,
  },
  {
    target: "sifre",
    title: "Şifre",
    keywords: "sifre parola password degistir belirle guvenlik hesap",
    icon: RiKey2Line,
  },
  {
    target: "iki-adimli-dogrulama",
    title: "İki adımlı doğrulama",
    keywords:
      "iki adimli dogrulama 2fa two factor totp authenticator kod guvenlik kurtarma",
    icon: RiShieldCheckLine,
  },
  {
    target: "oturumlar",
    title: "Aktif oturumlar",
    keywords: "oturum cihaz session aktif giris",
    icon: RiComputerLine,
  },
]

const GIZLILIK_SETTINGS: SettingEntry[] = [
  {
    target: "veri-disa-aktar",
    title: "Verilerini dışa aktar",
    keywords: "veri disa aktar export indir zip yedek tasima gdpr kvkk",
    icon: RiDownloadLine,
  },
  {
    target: "sohbet-sil",
    title: "Tüm sohbetleri sil",
    keywords: "sohbet asistan gecmis sil temizle toplu",
    icon: RiDeleteBinLine,
  },
  {
    target: "sepet-sil",
    title: "Tüm sepetleri sil",
    keywords: "sepet liste sil temizle toplu",
    icon: RiDeleteBinLine,
  },
  {
    target: "fis-sil",
    title: "Tüm fişleri sil",
    keywords: "fis fatura makbuz sil temizle toplu gorsel",
    icon: RiDeleteBinLine,
  },
  {
    target: "analiz-cerezleri",
    title: "Analiz çerezleri",
    keywords: "cerez analiz analytics gizlilik izleme takip opt out",
    icon: RiCookieLine,
  },
  {
    target: "gizlilik-politikasi",
    title: "Gizlilik Politikası",
    keywords: "gizlilik politika yasal kvkk gdpr veri haklar",
    icon: RiFileTextLine,
  },
]

const ABONELIK_SETTINGS: SettingEntry[] = [
  {
    target: "pro-yukselt",
    title: "Pro'ya yükselt",
    keywords: "pro yukselt abonelik satin al odeme aylik yillik plan upgrade",
    icon: RiBankCardLine,
  },
  {
    target: "abonelik-durumu",
    title: "Abonelik durumu",
    keywords: "abonelik durum plan pro yenilenme iptal fatura",
    icon: RiBankCardLine,
  },
  {
    target: "abonelik-yonet",
    title: "Aboneliği yönet",
    keywords: "abonelik yonet iptal portal fatura odeme degistir",
    icon: RiBankCardLine,
  },
  {
    target: "sss",
    title: "Sıkça sorulan sorular",
    keywords:
      "sss sik sorulan soru faq yardim iptal iade odeme guvenlik limit fiyat yenilenme",
    icon: RiQuestionLine,
  },
  {
    target: "sozlesmeler",
    title: "Yasal sözleşmeler",
    keywords:
      "mesafeli satis sozlesme iptal iade gizlilik yasal odeme fatura polar kayitli satici",
    icon: RiFileTextLine,
  },
]

const KULLANIM_SETTINGS: SettingEntry[] = [
  {
    target: "limits",
    title: "Kullanım Limitleri",
    keywords: "limit kota plan abonelik free pro yenilenir",
    icon: RiBarChartLine,
  },
  { target: "chat", title: "Sohbet", keywords: "mesaj asistan konuşma", icon: RiBarChartLine },
  {
    target: "text-messages",
    title: "Asistan mesajları",
    keywords: "metin sohbet mesaj yazı",
    icon: RiBarChartLine,
  },
  {
    target: "image-analyses",
    title: "Görsel analizleri",
    keywords: "resim fotoğraf analiz görüntü kamera",
    icon: RiBarChartLine,
  },
  { target: "storage", title: "Depolama", keywords: "kayıt saklama alan", icon: RiBarChartLine },
  {
    target: "saved-baskets",
    title: "Sepet kaydetme",
    keywords: "sepet kayıt liste",
    icon: RiBarChartLine,
  },
  {
    target: "saved-receipts",
    title: "Fiş kaydetme",
    keywords: "fiş fatura kayıt makbuz",
    icon: RiBarChartLine,
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
