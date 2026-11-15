import * as React from "react"
import Link from "next/link"

import {
  MONTHLY_PRICE,
  YEARLY_PRICE,
} from "@/components/subscription/plan-cards"
import { SiteFooter } from "@/components/site-footer"
import { limitText, planLimit } from "@/lib/usage/limits"

export const LEGAL_LAST_UPDATED = "15 Kasım 2026"
// Ödeme sözleşmeleri Gizlilik/Kullanım'dan ve birbirinden ayrı tarih taşır.
export const LEGAL_DISTANCE_SALES_LAST_UPDATED = "15 Kasım 2026"
export const LEGAL_REFUND_LAST_UPDATED = "25 Haziran 2026"
export const LEGAL_SUPPORT_EMAIL = "support@trysepet.com"
export const LEGAL_PRIVACY_EMAIL = "privacy@trysepet.com"

const fmt = (n: number) => n.toLocaleString("tr-TR")

export function LegalPageShell({
  title,
  // Son güncelleme tarihi belge başına farklı olabilir; verilmezse Gizlilik/
  // Kullanım metinlerinin ortak tarihine düşer.
  lastUpdated = LEGAL_LAST_UPDATED,
  children,
}: {
  title: string
  lastUpdated?: string
  children: React.ReactNode
}) {
  return (
    <>
      <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 md:py-16">
        <div className="mb-8">
          <h1 className="text-2xl font-medium tracking-tight text-balance text-foreground">
            {title}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Son güncelleme: {lastUpdated}
          </p>
        </div>
        {children}
      </div>
      <SiteFooter />
    </>
  )
}

export function TermsContent() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">1. Hizmet Hakkında</h2>
        <p>
          Sepet, market ürünlerinin fiyatlarını karşılaştırmana ve yapay zeka
          destekli alışveriş listeleri oluşturmana yardımcı olan bir
          platformdur. Hizmeti kullanarak bu şartları kabul etmiş olursun.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">2. Hesap</h2>
        <p>
          Sepet&apos;e Google hesabınla, Facebook hesabınla ya da e-posta ve
          şifrenle giriş yaparsın. Hesabının güvenliği senin sorumluluğundadır.
          Hesabını başkasıyla paylaşmamalısın.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">
          3. Kabul Edilebilir Kullanım
        </h2>
        <p>
          Hizmeti yasalara aykırı amaçlarla, sistemi kötüye kullanacak ya da
          diğer kullanıcıları rahatsız edecek şekilde kullanamazsın. Yapay zeka
          çıktılarının ticari kararlarda tek başına kullanılmasını
          önermiyoruz.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">
          4. Fiyat ve Ürün Bilgileri
        </h2>
        <p>
          Gösterilen fiyatlar üçüncü taraf kaynaklardan derlenir ve gerçek
          zamanlı olmayabilir. Sepet, fiyat doğruluğu için garanti vermez;
          nihai fiyat ilgili satıcının kasasında belirlenir.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">5. Sorumluluk Reddi</h2>
        <p>
          Hizmet &quot;olduğu gibi&quot; sunulur. Sepet, yazılımdaki hatalar,
          kesintiler veya veri kayıplarından doğabilecek doğrudan ya da dolaylı
          zararlardan sorumlu tutulamaz.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">6. Değişiklikler</h2>
        <p>
          Bu şartları zaman zaman güncelleyebiliriz. Önemli değişiklikleri
          uygulama içinde bildiririz; güncellemeden sonra hizmeti kullanmaya
          devam etmen yeni şartları kabul ettiğin anlamına gelir.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">7. İletişim</h2>
        <p>
          Sorularını{" "}
          <a
            href={`mailto:${LEGAL_SUPPORT_EMAIL}`}
            className="text-foreground underline underline-offset-2"
          >
            {LEGAL_SUPPORT_EMAIL}
          </a>{" "}
          adresine iletebilirsin.
        </p>
      </section>
    </div>
  )
}

export function PrivacyContent() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">1. Topladığımız Veriler</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Google ya da Facebook ile girdiğinde adını, e-posta adresini ve
            profil fotoğrafını alırız. E-postayla kayıt olduğunda e-posta
            adresini ve şifrenin geri çevrilemeyen özetini saklarız. İki adımlı
            doğrulama anahtarın şifrelenerek saklanır, geçiş anahtarlarından da
            yalnızca açık anahtar tutulur.
          </li>
          <li>
            Her girişte IP adresini, tarayıcı ve cihaz bilgini, IP adresinden
            çıkan yaklaşık şehri kaydederiz. Bu kayıtlar sayesinde açık
            oturumlarını görüp uzaktan kapatabilir, tanımadığın girişleri fark
            edebilirsin.
          </li>
          <li>
            Fiyat karşılaştırması için seçtiğin noktayı, arama yarıçapını,
            market şubelerini ve konumun okunabilir adını (örneğin “Kadıköy,
            İstanbul”) saklarız. Konumunu yalnızca sen seçince ya da cihaz
            konumunu paylaşmayı onaylayınca alırız.
          </li>
          <li>
            Sohbet geçmişlerin, kaydettiğin sepet ve fişler, yüklediğin
            fotoğraflar ve aylık kullanım sayaçların hesabında durur.
            Fotoğraflardaki konum, cihaz ve saat bilgisi (EXIF) yüklenirken
            silinir.
          </li>
          <li>
            Sesli girişte kaydın yalnızca yazıya çevrilir. Ses dosyasını
            saklamayız, geriye gönderdiğin mesajın metni kalır.
          </li>
          <li>
            Pro aboneliğin varsa planını, abonelik durumunu, dönem tarihlerini
            ve Polar müşteri numaranı tutarız. Kart bilgilerin Sepet&apos;e hiç
            ulaşmaz.
          </li>
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">
          2. Verileri Nasıl Kullanırız
        </h2>
        <p>
          Verilerini hesabını tanımlayıp korumak, yakınındaki market fiyatlarını
          getirmek, yapay zeka asistanını çalıştırmak ve hizmeti geliştirmek
          için kullanırız. Verilerini satmayız, reklam ya da analiz amacıyla
          takip yapmayız.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">3. Yapay Zeka İşleme</h2>
        <p>
          Asistana yazdığın mesajları, yüklediğin fotoğrafları ve sesli
          kayıtlarını yanıt üretmek için yapay zeka sağlayıcılarına iletiriz.
          Ürün eşleştirmeyi ve görsel analizini Anthropic&apos;in Claude modeli
          yapar. Sesli girişi Vercel AI Gateway üzerinden Google&apos;ın Gemini
          modeli yazıya çevirir. Claude&apos;a ulaşılamadığında yedek olarak yine
          Gemini kullanılır. Bu sağlayıcılar API üzerinden gelen verileri kendi
          modellerini eğitmek için kullanmaz. Yapay zeka hata yapabilir, bu
          yüzden ürün eşleşmelerini ve fiyatları kontrol etmeni öneririz.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">4. Konum ve Harita</h2>
        <p>
          Fiyatları getirmek için seçtiğin noktayı ve yarıçapı, Ticaret
          Bakanlığı ile TÜBİTAK&apos;ın Market Fiyatı servisine sunucularımız
          üzerinden iletiriz. Konumunun okunabilir adını bulmak için noktayı
          yine sunucularımızdan OpenStreetMap Nominatim servisine göndeririz. IP
          adresin bu iki servise ulaşmaz. Konum seçerken gördüğün harita ise
          doğrudan OpenStreetMap sunucularından yüklenir ve tarayıcın bu sırada
          OpenStreetMap&apos;e bağlanır.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">
          5. Hizmet Sağlayıcılar
        </h2>
        <p>
          Hizmeti çalıştırırken verilerin altyapı sağlayıcılarımızda işlenir.
          Barındırmayı Vercel, veritabanını Neon, önbellek ve hız sınırını
          Upstash, görsel depolamayı Cloudflare R2, ödeme ve faturalandırmayı
          Polar üstlenir. Doğrulama ve güvenlik e-postaları bir e-posta gönderim
          hizmetiyle gider. Bu sağlayıcıların bir kısmının sunucuları yurt
          dışındadır. Onlara yalnızca hizmeti sunmak için gereken veriyi
          aktarırız.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">
          6. Görseller ve Paylaşılan Bağlantılar
        </h2>
        <p>
          Yüklediğin görseller tahmin edilemeyen rastgele adreslerde durur. Bir
          görselin adresini başkasıyla paylaşırsan o adresi bilen herkes görseli
          açabilir. Paylaştığın sohbet, sepet ve fişler de bağlantıyı bilen
          herkese açıktır. Adının görünüp görünmeyeceğini paylaşırken seçersin
          ve paylaşılan görsellerin meta verisi silinir. Paylaşımı istediğin an
          Ayarlar › Gizlilik bölümünden kapatabilirsin.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">7. Çerezler</h2>
        <p>
          Oturumunu açık tutmak, hesabını korumak ve tema gibi tercihlerini
          hatırlamak için yalnızca zorunlu çerezleri ve tarayıcı depolamasını
          kullanırız. Analiz ya da reklam çerezi kullanmayız. Bazı blog
          yazılarında sosyal medya gönderisi ya da video gibi üçüncü taraf
          içerikler bulunabilir. Bu içerikler ilgili platformun sunucularından
          yüklenir ve o platformun gizlilik politikasına tabidir.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">8. Haklarınız</h2>
        <p>
          KVKK ve GDPR kapsamında verilerine erişme, onları düzeltme, sildirme
          ve taşıma hakkın var. Verilerinin bir kopyasını Ayarlar › Gizlilik ›
          Verilerini dışa aktar adımından indirebilirsin. Diğer talepler için
          bize yazman yeterli.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">9. Saklama Süreleri</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Hesabını sildiğinde 14 günlük bekleme süresi başlar. Süre dolunca
            hesabın ve ona bağlı tüm veriler kalıcı olarak silinir (10. madde).
          </li>
          <li>
            Oturum kayıtları, oturum kapandıktan ya da son kullanılmasından 90
            gün sonra silinir.
          </li>
          <li>
            Yüklenip hiçbir sohbette ya da fişte kullanılmayan görseller 7 gün
            sonra silinir.
          </li>
          <li>
            Tek kullanımlık doğrulama kodları ve bağlantıları süresi dolunca
            silinir.
          </li>
          <li>
            Ödeme ve fatura kayıtlarını vergi mevzuatı gereği Polar saklar.
            Hesabın silindiğinde bu kayıtlardaki kişisel bilgilerin
            anonimleştirilir.
          </li>
        </ul>
      </section>
      <section id="veri-silme" className="scroll-mt-24 space-y-2">
        <h2 className="font-medium text-foreground">10. Veri Silme Talebi</h2>
        <p>
          Hesabını uygulama içinden kendin kapatabilirsin. Bunun için Ayarlar ›
          Hesap › Hesabımı sil adımını izleyip onaylaman yeterli.
        </p>
        <p>
          Hesabını kapattığın anda tüm cihazlardaki oturumların sonlanır ve
          hesabına erişim kapanır. Etkin bir Pro aboneliğin varsa yenilenmeyecek
          şekilde iptal edilir. Fikrini değiştirirsen 14 gün içinde yeniden
          giriş yaparak hesabını geri açabilirsin. Süre dolunca hesabın, sohbet
          geçmişlerin, sepet ve fişlerin, görsellerin ve oturum kayıtların
          kendiliğinden ve kalıcı olarak silinir. Polar&apos;daki müşteri kaydın
          da silinir, kalan abonelik sona erer.
        </p>
        <p>
          Facebook ile giriş yaptıysan Sepet&apos;in Facebook hesabına
          erişimini Facebook &gt; Ayarlar ve Gizlilik &gt; Ayarlar &gt;
          Uygulamalar ve Web Siteleri bölümünden de kaldırabilirsin. Bu işlem
          bağlantıyı koparır. Sepet hesabındaki verilerin silinmesi için
          yukarıdaki hesap silme adımını da uygulaman gerekir.
        </p>
        <p>
          Hesabına erişemiyorsan ya da silme talebini bize iletmek istersen{" "}
          <a
            href={`mailto:${LEGAL_PRIVACY_EMAIL}`}
            className="text-foreground underline underline-offset-2"
          >
            {LEGAL_PRIVACY_EMAIL}
          </a>{" "}
          adresine yazabilirsin. Talebini 30 gün içinde sonuçlandırırız.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">11. İletişim</h2>
        <p>
          Gizlilikle ilgili sorularını{" "}
          <a
            href={`mailto:${LEGAL_PRIVACY_EMAIL}`}
            className="text-foreground underline underline-offset-2"
          >
            {LEGAL_PRIVACY_EMAIL}
          </a>{" "}
          adresine iletebilirsin.
        </p>
      </section>
    </div>
  )
}

// Mesafeli Satış Sözleşmesi. Metin, koddaki gerçek davranışla doğrulanabilir:
// fiyatlar plan-cards'tan (MONTHLY_PRICE/YEARLY_PRICE), Pro avantajları
// lib/usage/limits.ts PLAN_LIMITS'ten, ödeme/aktivasyon app/api/checkout +
// webhooks/polar'dan, faturalandırma/vergi ise Polar'ın Kayıtlı Satıcı
// (Merchant of Record) rolünden gelir. Kart bilgileri Sepet'e hiç ulaşmaz;
// tahsilat tamamen Polar'ın barındırdığı ödeme sayfasında yapılır.
export function DistanceSalesContent() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">1. Taraflar</h2>
        <p>
          Bu sözleşme, bir tarafta hizmeti sunan{" "}
          <span className="text-foreground">Sepet</span> (trysepet.com,
          “Hizmet Sağlayıcı”) ile diğer tarafta Pro aboneliği satın alan
          kullanıcı (“Abone”) arasındadır. Ödemenin tahsilatı ve faturalandırma,
          aşağıda 5. maddede açıklandığı üzere{" "}
          <span className="text-foreground">Polar Software Inc.</span> tarafından
          Kayıtlı Satıcı (Merchant of Record) sıfatıyla gerçekleştirilir.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">2. Sözleşmenin Konusu</h2>
        <p>
          Sözleşmenin konusu, Sepet Pro aboneliğinin elektronik ortamda satışı
          ve ifasıdır. Pro planı; aylık{" "}
          {limitText(planLimit("pro", "textMessages"))} asistan mesajı, aylık{" "}
          {limitText(planLimit("pro", "imageAnalyses"))} görsel analizi ile{" "}
          {limitText(planLimit("pro", "savedBaskets"))} sepet ve fiş kaydı
          sunar. Pro planında aylık sayaçlar, aboneliğin her ay yenilendiği gün
          (UTC) otomatik olarak sıfırlanır; yıllık abonelikte de bu sıfırlama,
          aboneliğin başladığı gün baz alınarak her ay tekrarlanır. Ücretsiz
          plan ise aylık {limitText(planLimit("free", "textMessages"))} asistan
          mesajı, {limitText(planLimit("free", "imageAnalyses"))} görsel analizi
          ve {limitText(planLimit("free", "savedBaskets"))}’şer sepet/fiş kaydı
          ile sınırlıdır ve sayaçları her ayın ilk günü (UTC) sıfırlanır.
        </p>
      </section>
      {/* FAIR_USE_HREF bu kimliğe bağlanır (fair-use-mark.tsx). */}
      <section id="adil-kullanim" className="scroll-mt-24 space-y-2">
        <h2 className="font-medium text-foreground">3. Adil Kullanım</h2>
        <p>
          Pro planında “sınırsız” olarak belirtilen sepet ve fiş kaydı, kişisel
          alışveriş kullanımında sayısal bir üst sınır uygulanmadığı anlamına
          gelir. Kayıtların bot veya betik gibi otomatik araçlarla toplu olarak
          oluşturulması, hesabın birden fazla kişi tarafından kullanılması ya da
          hizmetin altyapıya olağan dışı yük bindirecek şekilde kullanılması
          adil kullanım sayılmaz.
        </p>
        <p>
          Sepet, hizmetin güvenliğini ve diğer kullanıcıların erişimini korumak
          için otomatik hız sınırları uygular. Bu sınıra takılan bir isteği kısa
          bir süre sonra yeniden deneyebilirsin. Açık bir kötüye kullanımda
          hesabı geçici olarak askıya alma hakkımız saklıdır. Böyle bir durumla
          karşılaşırsan{" "}
          <a
            href={`mailto:${LEGAL_SUPPORT_EMAIL}`}
            className="text-foreground underline underline-offset-2"
          >
            {LEGAL_SUPPORT_EMAIL}
          </a>{" "}
          adresine yazarak inceleme isteyebilirsin. Kısıtlama mevcut
          kayıtlarını silmez.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">4. Ücret ve Süre</h2>
        <p>
          Pro aboneliği aylık ₺{fmt(MONTHLY_PRICE)} veya yıllık ₺
          {fmt(YEARLY_PRICE)} (Türk Lirası) olarak sunulur. Fiyatlara KDV
          dahildir ve Türkiye&apos;den ödemede tutarın üstüne vergi eklenmez.
          Türkiye dışından ödersen Polar bulunduğun ülkenin vergi kurallarını
          uygular, ödeyeceğin nihai tutarı da onaydan önce ödeme sayfasında
          gösterir. Yeni Pro aboneliği alımı şu an kapalıdır. Mevcut
          abonelikler bu sözleşmeye göre sürer. Abonelik,
          seçilen faturalandırma döneminin (ay veya yıl) sonunda aynı ücretle
          otomatik olarak yenilenir ve sen iptal edene kadar bu şekilde devam
          eder. Fiyat değişikliklerini yürürlüğe girmeden önce sana bildiririz.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">
          5. Ödeme ve Faturalandırma
        </h2>
        <p>
          Ödeme adımı tamamen Polar’ın barındırdığı güvenli ödeme sayfasında
          tamamlanır. Kart bilgilerin Sepet sunucularında saklanmaz ya da
          işlenmez; Sepet yalnızca plan durumunu ve yenilenme tarihini tutar.
          Polar bu işlemde Kayıtlı Satıcı (Merchant of Record) olarak hareket
          eder; tahsilatı yapar, faturayı düzenler ve KDV dâhil vergilerin
          tahsil ve beyanından sorumludur. Aboneliğine ilişkin fatura Polar
          tarafından düzenlenir ve e-posta ile iletilir.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">6. Hizmetin İfası</h2>
        <p>
          Ödemen Polar tarafından onaylandığı anda hesabın otomatik olarak Pro’ya
          yükseltilir ve tüm Pro avantajların derhal açılır. Hizmet dijital
          olduğundan ayrıca bir teslimat süresi yoktur; aktivasyon anlıktır.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">7. Cayma Hakkı</h2>
        <p>
          Pro aboneliği, anında ifa edilen dijital hizmet niteliğindedir ve
          ödeme sonrası erişimin derhal açılır. Bu nedenle Mesafeli Sözleşmeler
          Yönetmeliği’nin 15. maddesi uyarınca cayma hakkı kullanılamaz. Bununla
          birlikte aboneliğini dilediğin an iptal ederek bir sonraki yenilenmeyi
          durdurabilirsin; ayrıntılar için{" "}
          <Link
            href="/iptal-iade"
            className="text-foreground underline underline-offset-2"
          >
            İptal ve İade Politikası
          </Link>
          ’na bakabilirsin.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">8. İptal ve Yenileme</h2>
        <p>
          Aboneliğini, Abonelik ekranındaki “Aboneliği yönet” düğmesiyle açılan
          Polar müşteri portalından dilediğin an iptal edebilirsin. İptalde
          aboneliğin, içinde bulunduğun faturalandırma döneminin sonuna kadar
          açık kalır; o tarihe kadar Pro avantajların sürer, ardından otomatik
          olarak Ücretsiz plana dönersin. Bir tahsilat başarısız olursa erişimin
          hemen kesilmez; Polar ödemeyi yeniden dener, tüm denemeler başarısız
          olursa abonelik iptal edilir.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">9. Sorumluluk</h2>
        <p>
          Sepet, fiyat karşılaştırma ve yapay zeka destekli alışveriş özellikleri
          sunar; market fiyatları üçüncü taraf kaynaklardan derlenir ve nihai
          fiyat ilgili satıcının kasasında belirlenir. Hizmet “olduğu gibi”
          sunulur. Bu sözleşmenin Kullanım Şartları ve Gizlilik Politikası ile
          birlikte değerlendirilmesi gerekir.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">10. İletişim</h2>
        <p>
          Aboneliğin ve bu sözleşmeyle ilgili sorularını{" "}
          <a
            href={`mailto:${LEGAL_SUPPORT_EMAIL}`}
            className="text-foreground underline underline-offset-2"
          >
            {LEGAL_SUPPORT_EMAIL}
          </a>{" "}
          adresine iletebilirsin. Fatura ve ödeme kayıtlarına ise Polar müşteri
          portalından ulaşabilirsin.
        </p>
      </section>
    </div>
  )
}

// İptal ve İade Politikası. Tüm maddeler koddaki davranışla birebir uyumludur:
// iptal app/api/portal (Polar müşteri portalı) üzerinden yapılır; cancelAtPeriodEnd
// → dönem sonuna kadar erişim, revoked → free (app/api/webhooks/polar). past_due
// erişimi kesmez (ACTIVE_STATUSES). İade akışı koda gömülü değildir; tahsilat ve
// iade Polar (Merchant of Record) tarafından yürütülür.
export function RefundPolicyContent() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">1. Aboneliği İptal Etme</h2>
        <p>
          Aboneliğini dilediğin an iptal edebilirsin. Abonelik ekranındaki
          “Aboneliği yönet” düğmesi seni Polar müşteri portalına götürür; iptal,
          plan değişikliği ve fatura geçmişi buradan yönetilir. Portal yalnızca
          ödemeden geçmiş hesaplar için açılır.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">
          2. İptal Sonrası Erişim
        </h2>
        <p>
          İptalde Pro erişimin hemen kapanmaz. Aboneliğin, içinde bulunduğun
          faturalandırma döneminin sonuna kadar açık kalır; o güne kadar tüm Pro
          avantajların sürer, ardından otomatik olarak Ücretsiz plana dönersin.
          Dönem bitmeden fikrini değiştirirsen iptali geri alabilirsin.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">3. İade Politikası</h2>
        <p>
          Pro, anında ifa edilen ve sürekli erişim sağlanan dijital bir
          hizmettir. İptal ettiğinde bir sonraki yenilenme durur ve dönem sonuna
          kadar hizmetten yararlanmaya devam edersin; bu nedenle kullanılmış
          dönemler için kural olarak iade yapılmaz. Hatalı veya mükerrer tahsilat
          gibi istisnai durumlarda iade talebini bizimle paylaşabilirsin.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">4. Başarısız Ödeme</h2>
        <p>
          Bir yenileme tahsilatı başarısız olursa aboneliğin “Gecikti” durumuna
          geçer ama Pro erişimin hemen kesilmez; Polar ödemeyi belirli aralıklarla
          yeniden dener. Tüm denemeler başarısız olursa abonelik iptal edilir ve
          Ücretsiz plana inersin.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">
          5. Polar’ın Rolü ve İade Süreci
        </h2>
        <p>
          Tahsilat ve faturalandırma, Kayıtlı Satıcı (Merchant of Record) olan
          Polar Software Inc. tarafından yürütülür; onaylanan iadeler de Polar
          üzerinden ilgili ödeme yöntemine yapılır. Polar, ters ibrazı (chargeback)
          önlemek amacıyla satın almadan sonraki 60 gün içinde kendi inisiyatifiyle
          iade başlatabilir. Bir siparişin iade edilmesi aboneliği kendiliğinden
          sonlandırmaz; erişimin sona ermesi için aboneliğin ayrıca iptal edilmesi
          gerekir.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">6. İletişim</h2>
        <p>
          İptal ve iade taleplerini{" "}
          <a
            href={`mailto:${LEGAL_SUPPORT_EMAIL}`}
            className="text-foreground underline underline-offset-2"
          >
            {LEGAL_SUPPORT_EMAIL}
          </a>{" "}
          adresine iletebilirsin. Bu politika{" "}
          <Link
            href="/mesafeli-satis"
            className="text-foreground underline underline-offset-2"
          >
            Mesafeli Satış Sözleşmesi
          </Link>{" "}
          ile birlikte geçerlidir.
        </p>
      </section>
    </div>
  )
}
