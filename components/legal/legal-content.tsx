// Gizlilik Politikası ve Kullanım Şartları metinlerinin tek kaynağı.
// Hem giriş ekranındaki modal (login-form.tsx) hem de public sayfalar
// (/gizlilik, /kullanim-sartlari) bu bileşenleri kullanır. Google OAuth
// onayı için bu metinlerin gerçek, herkese açık URL'lerde yayınlanması şart.

import * as React from "react"
import Link from "next/link"

export const LEGAL_LAST_UPDATED = "18 Mayıs 2026"
// Ödeme sözleşmeleri (Mesafeli Satış + İptal & İade) Polar entegrasyonuyla
// birlikte yayınlandı; Gizlilik/Kullanım metinlerinden ayrı bir tarih taşırlar.
export const LEGAL_PAYMENTS_LAST_UPDATED = "25 Haziran 2026"
export const LEGAL_SUPPORT_EMAIL = "support@trysepet.com"
export const LEGAL_PRIVACY_EMAIL = "privacy@trysepet.com"

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
    <div className="mx-auto w-full max-w-2xl px-6 py-12 md:py-16">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Son güncelleme: {lastUpdated}
        </p>
      </div>
      {children}
      <div className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
        <Link
          href="/"
          className="underline underline-offset-2 transition-colors hover:text-foreground"
        >
          Ana sayfaya dön
        </Link>
      </div>
    </div>
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
          Sepet&apos;e Google hesabınla giriş yaparsın. Hesabının güvenliği
          senin sorumluluğundadır. Hesabını başkasıyla paylaşmamalısın.
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
        <p>
          Google ile giriş yaptığında adın, e-posta adresin ve profil fotoğrafın
          bize aktarılır. Bunun dışında oluşturduğun alışveriş listeleri, sohbet
          geçmişlerin ve yüklediğin fiş fotoğrafları hizmet sağlamak için
          saklanır.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">
          2. Verileri Nasıl Kullanırız
        </h2>
        <p>
          Verilerini hesabını tanımlamak, kişisel öneriler sunmak, yapay zeka
          asistanını çalıştırmak ve hizmet kalitesini geliştirmek için
          kullanırız. Verilerini reklam amacıyla üçüncü taraflara satmıyoruz.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">3. Yapay Zeka İşleme</h2>
        <p>
          Asistan mesajların ve fiş görüntülerin, yanıt üretmek için yapay zeka
          sağlayıcılarımıza iletilir. Bu sağlayıcılar verileri model eğitimi için
          kullanmaz.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">4. Çerezler</h2>
        <p>
          Oturumunu açık tutmak ve tercihlerini hatırlamak için zorunlu çerezler
          kullanırız. İsteğe bağlı analiz çerezlerini ayarlardan kapatabilirsin.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">5. Haklarınız</h2>
        <p>
          KVKK ve GDPR kapsamında verilerine erişme, düzeltme, silme ve
          taşınabilirlik haklarına sahipsin. Talebini iletmek için bizimle
          iletişime geçebilirsin.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">6. Saklama Süresi</h2>
        <p>
          Hesabını sildiğinde tüm kişisel verilerin 30 gün içinde kalıcı olarak
          silinir; yasal yükümlülükler nedeniyle bazı kayıtlar anonimleştirilerek
          saklanabilir.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">7. İletişim</h2>
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
// fiyatlar subscription-panel'den (₺99/ay, ₺990/yıl, TRY), Pro avantajları
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
          aşağıda 4. maddede açıklandığı üzere{" "}
          <span className="text-foreground">Polar Software Inc.</span> tarafından
          Kayıtlı Satıcı (Merchant of Record) sıfatıyla gerçekleştirilir.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">2. Sözleşmenin Konusu</h2>
        <p>
          Sözleşmenin konusu, Sepet Pro aboneliğinin elektronik ortamda
          satışı ve ifasıdır. Pro planı; aylık 500 asistan mesajı, aylık 250
          görsel analizi ile sınırsız sepet ve fiş kaydı sunar. Aylık sayaçlar
          her ayın ilk günü (UTC) otomatik olarak sıfırlanır. Ücretsiz plan ise
          aylık 50 asistan mesajı, 10 görsel analizi ve 20’şer sepet/fiş kaydı
          ile sınırlıdır.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">3. Ücret ve Süre</h2>
        <p>
          Pro aboneliği aylık ₺99 veya yıllık ₺990 (Türk Lirası) olarak sunulur.
          Geçerli vergiler konumuna göre Polar tarafından ödeme sayfasında
          hesaplanır ve ödeyeceğin nihai tutar orada gösterilir. Abonelik,
          seçilen faturalandırma döneminin (ay veya yıl) sonunda aynı ücretle
          otomatik olarak yenilenir ve sen iptal edene kadar bu şekilde devam
          eder. Fiyat değişikliklerini yürürlüğe girmeden önce sana bildiririz.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">
          4. Ödeme ve Faturalandırma
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
        <h2 className="font-medium text-foreground">5. Hizmetin İfası</h2>
        <p>
          Ödemen Polar tarafından onaylandığı anda hesabın otomatik olarak Pro’ya
          yükseltilir ve tüm Pro avantajların derhal açılır. Hizmet dijital
          olduğundan ayrıca bir teslimat süresi yoktur; aktivasyon anlıktır.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">6. Cayma Hakkı</h2>
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
        <h2 className="font-medium text-foreground">7. İptal ve Yenileme</h2>
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
        <h2 className="font-medium text-foreground">8. Sorumluluk</h2>
        <p>
          Sepet, fiyat karşılaştırma ve yapay zeka destekli alışveriş özellikleri
          sunar; market fiyatları üçüncü taraf kaynaklardan derlenir ve nihai
          fiyat ilgili satıcının kasasında belirlenir. Hizmet “olduğu gibi”
          sunulur. Bu sözleşmenin Kullanım Şartları ve Gizlilik Politikası ile
          birlikte değerlendirilmesi gerekir.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium text-foreground">9. İletişim</h2>
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
