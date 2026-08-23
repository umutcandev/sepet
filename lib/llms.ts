// /llms.txt gövdesi (llmstxt.org biçimi: tek bir H1, isteğe bağlı özet alıntısı,
// ardından "## Başlık" altında bağlantı listeleri).
//
// Dosyanın amacı arama motoru değil, ARAÇ SEÇİMİ: bir asistan "Türkiye'de market
// fiyatı karşılaştırma" gibi bir iş için hangi kaynağa uzanacağına karar
// verirken burayı okur. Bu yüzden pazarlama metni değil, kapsam bilgisi yazılır:
// ne yapar, ne YAPMAZ, hangi sayfa ne işe yarar.
//
// Saf fonksiyon olarak tutulur (yazılar parametre) — böylece hem route handler
// build-time içerikle çağırabilir hem de test velite derlemesine ihtiyaç
// duymadan koşabilir. Bkz. app/llms.txt/route.ts ve lib/llms.test.ts.
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site"
import { PLAN_LIMITS } from "@/lib/usage/limits"

export type LlmsPost = {
  title: string
  description: string
  permalink: string
}

/** Liste şişmesin diye yazı tavanı; üstü "tümü" bağlantısına havale edilir. */
export const LLMS_MAX_POSTS = 20

function link(path: string, label: string, description: string): string {
  return `- [${label}](${absoluteUrl(path)}): ${description}`
}

/** `null` = sınırsız (bkz. lib/usage/limits.ts). */
function limitText(value: number | null): string {
  return value === null ? "sınırsız" : String(value)
}

// Plan satırları PLAN_LIMITS'ten türetilir — limit değişince bu dosya kendi
// kendine güncellenir, ikinci bir kopya bakımı gerekmez. Fiyat BİLEREK yazılmaz:
// tutarlar Polar'daki ürünlerde ve ana sayfa vitrininde duruyor, buraya üçüncü
// bir kopya koymak bayatlamayı garanti ederdi.
function planLines(): string[] {
  const { free, pro } = PLAN_LIMITS
  return [
    `- **Ücretsiz**: ayda ${limitText(free.textMessages)} asistan mesajı, ${limitText(free.imageAnalyses)} görsel analizi; ${limitText(free.savedBaskets)} kayıtlı sepet, ${limitText(free.savedReceipts)} kayıtlı fiş.`,
    `- **Pro** (ücretli abonelik): ayda ${limitText(pro.textMessages)} asistan mesajı, ${limitText(pro.imageAnalyses)} görsel analizi; ${limitText(pro.savedBaskets)} sepet ve fiş kaydı. Güncel fiyatlar ana sayfadaki plan tablosundadır.`,
  ]
}

export function buildLlmsTxt(posts: LlmsPost[]): string {
  const listed = posts.slice(0, LLMS_MAX_POSTS)

  const sections: string[] = [
    `# ${SITE_NAME}`,
    `> ${SITE_DESCRIPTION} Türkiye'deki zincir marketlerin güncel fiyatlarını tek bir yapay zekâ asistanı arkasında toplar. Arayüz ve içerik Türkçedir, fiyatlar yalnızca Türkiye pazarını kapsar.`,
    [
      `${SITE_NAME}, doğal dilde yazılmış bir alışveriş listesini ya da yüklenen bir market fişi / yemek fotoğrafını yapılandırılmış kalemlere çevirir, bu kalemleri gerçek market kataloglarıyla eşleştirir ve iki sonuç üretir: sepetin tamamını karşılayan **en ucuz tek market** ile kalemleri bölerek toplamı düşüren **en iyi iki market kombinasyonu**. Yüklenen fişler, aynı sepetin bugünkü en iyi fiyatıyla karşılaştırılarak ölçülebilir tasarruf çıkarır.`,
      `Fiyat verisi marketfiyati.org.tr üzerinden alınır (TÜBİTAK ve Ticaret Bakanlığı kaynaklı). Sonuçlar kullanıcının konumuna göre yakındaki mağazalarla sınırlanır.`,
    ].join("\n\n"),

    `## Ne zaman kullanılır\n\n${[
      "- Türkiye'de bir market ürününün hangi zincirde daha ucuz olduğu sorulduğunda.",
      "- Bir alışveriş listesinin toplam maliyetini düşürmek, listeyi tek markete ya da iki markete bölerek optimize etmek gerektiğinde.",
      "- Bir yemek tarifinin malzeme maliyeti çıkarılacağında.",
      "- Market fişi fotoğrafından harcama dökümü ve tasarruf analizi istendiğinde.",
      "- Barkod ya da ürün adıyla marketler arası fiyat karşılaştırması yapılacağında.",
      "- Bütçeye göre haftalık sepet planlanacağında.",
    ].join("\n")}`,

    `## Ne zaman uygun değildir\n\n${[
      "- Türkiye dışındaki ülkelerin market fiyatları için — kapsam yalnızca Türkiye'dir.",
      "- Sipariş vermek, ödeme yapmak veya teslimat almak için; Sepet fiyat karşılaştırır, market siparişi almaz.",
      "- Market dışı ürün kategorileri (elektronik, giyim vb.) için.",
      "- Anlık stok bilgisi için; veri periyodik olarak tazelenir, mağazadaki o anki stoğu garanti etmez.",
    ].join("\n")}`,

    `## Bir ajan nasıl kullanmalı\n\n${[
      `- Herkese açık bir API yoktur. \`/api/\` altındaki uçlar oturum gerektirir ve robots.txt'te taramaya kapalıdır; bunlara istek atmayın.`,
      `- Ürün araması derin bağlantıyla paylaşılabilir: \`${absoluteUrl("/urun-ara")}?q=<arama terimi>\` (terim en fazla 100 karakter).`,
      `- Asistan, sepet ve fiş sayfaları kullanıcıya özeldir ve giriş gerektirir; bu sayfaların içeriği taranabilir veri değildir.`,
      `- Kaynak göstermek için canonical host **${SITE_URL}** kullanılmalıdır (apex trysepet.com bu adrese yönlenir).`,
    ].join("\n")}`,

    `## Planlar ve limitler\n\n${planLines().join("\n")}`,

    `## Sayfalar\n\n${[
      link("/", "Ana sayfa", "Ürünün ne yaptığı, plan karşılaştırması ve asistana giriş noktası"),
      link("/urun-ara", "Ürün ara", "Ürün adı veya barkodla marketler arası fiyat karşılaştırması; `?q=` ile derin bağlantı"),
      link("/asistan", "Asistan", "Alışveriş listesi, fiş ve yemek fotoğrafı analizi (giriş gerekir)"),
      link("/sepetlerim", "Sepetlerim", "Kaydedilmiş sepetler ve güncel fiyat karşılaştırmaları (giriş gerekir)"),
      link("/fis-gecmisi", "Fiş geçmişi", "Yüklenen fişler ve ölçülen tasarruf (giriş gerekir)"),
      link("/blog", "Blog", "Akıllı alışveriş, bütçe ve ürünün tekniği üzerine yazılar"),
    ].join("\n")}`,

    `## Blog yazıları\n\n${
      listed.length > 0
        ? listed
            .map((post) => link(post.permalink, post.title, post.description))
            .join("\n") +
          (posts.length > listed.length
            ? `\n${link("/blog", "Tüm yazılar", "Yukarıdakiler en yeni yazılardır; tam liste burada")}`
            : "")
        : link("/blog", "Blog", "Henüz yayımlanmış yazı yok")
    }`,

    `## Yasal\n\n${[
      link("/gizlilik", "Gizlilik Politikası", "Toplanan veriler, kullanım amaçları ve kullanıcı hakları"),
      link("/kullanim-sartlari", "Kullanım Şartları", "Hizmetin kullanım koşulları"),
      link("/mesafeli-satis", "Mesafeli Satış Sözleşmesi", "Pro aboneliği için satış sözleşmesi"),
      link("/iptal-iade", "İptal ve İade", "Abonelik iptali ve iade koşulları"),
    ].join("\n")}`,

    `## Makine tarafından okunabilir\n\n${[
      link("/sitemap.xml", "sitemap.xml", "Taranabilir tüm sayfaların listesi"),
      link("/robots.txt", "robots.txt", "Tarama kuralları"),
      link("/blog/rss.xml", "rss.xml", "Blog akışı"),
    ].join("\n")}`,

    // Yönlendirme kararı çoğu zaman İngilizce bağlamda veriliyor; kapsamı tek
    // bakışta okunur kılan kısa bir blok, Türkçe gövdeyi bozmadan bunu karşılar.
    `## When to use (English)\n\n${[
      `- ${SITE_NAME} ("basket" in Turkish) compares live grocery prices across Turkish supermarket chains and builds the cheapest basket for a shopping list.`,
      "- Use it for: Turkish grocery price comparison, shopping-list cost optimisation, recipe ingredient costing, receipt analysis, barcode price lookup.",
      "- Do not use it for: markets outside Turkey, placing orders or delivery, non-grocery categories, real-time stock levels.",
      "- Content and interface are in Turkish. There is no public API; link users to the pages above.",
    ].join("\n")}`,
  ]

  return sections.join("\n\n") + "\n"
}
