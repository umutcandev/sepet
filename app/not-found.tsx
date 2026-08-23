import type { Metadata } from "next"
import Link from "next/link"
import { SearchXIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

// Kök 404 — eşleşmeyen HER yol buraya düşer. Rota içi not-found.tsx'ler
// (app/sepetlerim/[id], app/fis-gecmisi/[id]) kayda özel durumlarını göstermeye
// devam eder; burası yalnızca "böyle bir sayfa yok" hâlidir.
//
// Gövde kasıtlı olarak metin ağırlıklı ve tamamen sunucuda render edilir:
// bozuk bir bağlantıyı takip eden kullanıcı da, siteyi tarayan bir ajan da
// nereye gideceğini JS çalıştırmadan görebilmeli. Next'in varsayılan 404'ü
// doğru statü kodunu döndürüyordu ama gövdesi bu yolların hiçbirini vermiyor.
export const metadata: Metadata = {
  title: "Sayfa bulunamadı",
  description:
    "Aradığın sayfa Sepet'te yok. Buradan ana sayfaya, ürün aramaya, asistana veya bloga geçebilirsin.",
  // `robots` BİLEREK verilmiyor: Next 404 yanıtına zaten
  // `<meta name="robots" content="noindex">` basıyor, burada tekrarlamak aynı
  // sayfaya iki robots etiketi koyardı. (noindex tek başına follow demektir,
  // yani buradaki bağlantılar izlenmeye devam eder.)
  //
  // Kök layout'taki `canonical: "./"` mirası burada bilinçli olarak kaldırılır:
  // var olmayan bir yol kendini otoriter ilan etmemeli.
  alternates: null,
}

// 404 gövdesinin asıl işi bu liste: nereye bakılacağını söylemek. Açıklamalar
// süs değil — sayfayı okuyan (insan ya da ajan) hangi bağlantının ne işe
// yaradığını başka bir sayfa açmadan anlamalı.
const DESTINATIONS: { href: string; label: string; description: string }[] = [
  {
    href: "/",
    label: "Ana sayfa",
    description:
      "Sepet'in ne yaptığı, planlar ve asistana ilk soruyu sorabileceğin giriş noktası.",
  },
  {
    href: "/urun-ara",
    label: "Ürün ara",
    description:
      "Market ürünlerini adıyla veya barkoduyla ara, marketler arası fiyatları karşılaştır.",
  },
  {
    href: "/asistan",
    label: "Asistan",
    description:
      "Alışveriş listeni yaz ya da fiş/yemek fotoğrafı yükle; en uygun sepeti çıkarsın.",
  },
  {
    href: "/sepetlerim",
    label: "Sepetlerim",
    description: "Kaydettiğin sepetler ve güncel fiyatlarıyla karşılaştırmaları.",
  },
  {
    href: "/fis-gecmisi",
    label: "Fiş geçmişi",
    description:
      "Yüklediğin fişler ve aynı sepetin bugünkü en iyi fiyatına göre tasarrufun.",
  },
  {
    href: "/blog",
    label: "Blog",
    description: "Sepet'in tekniği, sağlık ve akıllı alışveriş üzerine yazılar.",
  },
]

// Makine tarafından okunan haritalar. Uygulama rotası olmadıkları için
// next/link değil düz <a> ile verilir (Link istemci navigasyonu denerdi).
const MACHINE_READABLE: { href: string; label: string }[] = [
  { href: "/sitemap.xml", label: "sitemap.xml" },
  { href: "/llms.txt", label: "llms.txt" },
  { href: "/blog/rss.xml", label: "blog/rss.xml" },
]

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <SearchXIcon className="size-5" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-balance text-foreground">
        Sayfa bulunamadı
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Aradığın sayfa taşınmış, silinmiş ya da adresi yanlış yazılmış olabilir.
        Sepet, Türkiye&apos;deki zincir marketlerin fiyatlarını karşılaştıran
        yapay zekâ destekli bir alışveriş asistanıdır; aşağıdaki bağlantılardan
        devam edebilirsin.
      </p>

      <div className="mt-6">
        <Button asChild>
          <Link href="/">Ana sayfaya dön</Link>
        </Button>
      </div>

      <h2 className="mt-10 text-sm font-medium text-foreground">
        Nereye bakabilirsin
      </h2>
      <ul className="mt-3 space-y-3">
        {DESTINATIONS.map((item) => (
          <li key={item.href} className="text-sm leading-relaxed">
            <Link
              href={item.href}
              className="font-medium text-foreground underline underline-offset-2 transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
            <span className="text-muted-foreground"> — {item.description}</span>
          </li>
        ))}
      </ul>

      <div className="mt-10 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
        Sitenin tamamının makine tarafından okunabilir haritaları:{" "}
        {MACHINE_READABLE.map((item, index) => (
          <span key={item.href}>
            {index > 0 && ", "}
            <a
              href={item.href}
              className="underline underline-offset-2 transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          </span>
        ))}
        .
      </div>
    </div>
  )
}
