// Gizlilik Politikası ve Kullanım Şartları metinlerinin tek kaynağı.
// Hem giriş ekranındaki modal (login-form.tsx) hem de public sayfalar
// (/gizlilik, /kullanim-sartlari) bu bileşenleri kullanır. Google OAuth
// onayı için bu metinlerin gerçek, herkese açık URL'lerde yayınlanması şart.

import * as React from "react"
import Link from "next/link"

export const LEGAL_LAST_UPDATED = "18 Mayıs 2026"
export const LEGAL_SUPPORT_EMAIL = "support@trysepet.com"
export const LEGAL_PRIVACY_EMAIL = "privacy@trysepet.com"

export function LegalPageShell({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12 md:py-16">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Son güncelleme: {LEGAL_LAST_UPDATED}
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
