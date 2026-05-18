"use client"

import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { signInWithGoogleAction } from "@/lib/actions/auth"

const FEATURES = [
  "162.929 ürünün canlı fiyatı",
  "Yapay zeka destekli alışveriş listesi",
  "Fiş fotoğrafından en hızlı fiyat karşılaştırması",
]

type Props = {
  callbackUrl?: string
}

export function LoginForm({ callbackUrl }: Props) {
  return (
    <div className="flex w-full max-w-[402px] flex-col px-5 pt-8 pb-5 md:pt-10 md:pb-6">
      <div className="flex flex-col">
        <h1 className="text-[36px] font-semibold leading-[36px] tracking-[-0.04em] text-foreground">
          Sepet
        </h1>
        <p className="mt-4 max-w-[260px] text-[15px] leading-[1.35] tracking-[-0.01em] text-muted-foreground">
          Yapay zeka ile akıllı alışverişin tadını çıkarın.
        </p>
      </div>

      <ul className="mt-8 mb-6 flex flex-col gap-3 text-[13px] text-muted-foreground md:mt-10">
        {FEATURES.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <Check className="h-3 w-3 shrink-0" strokeWidth={2.5} />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <form
        action={async () => {
          await signInWithGoogleAction(callbackUrl)
        }}
      >
        <Button
          type="submit"
          size="lg"
          className="h-[44px] w-full gap-2 rounded-xl px-[6px] text-[14px] font-medium tracking-[-0.01em]"
        >
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white">
            <GoogleIcon />
          </span>
          Google ile devam et
        </Button>
      </form>

      <p className="mt-3.5 text-center text-[11px] leading-[1.5] tracking-[-0.005em] text-muted-foreground/60">
        Devam ederek <TermsDialog /> ve <PrivacyDialog />&apos;i kabul ediyorsun.
      </p>
    </div>
  )
}

function TermsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="underline underline-offset-2 transition-colors hover:text-foreground"
        >
          Şartlar
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Kullanım Şartları</DialogTitle>
          <DialogDescription>Son güncelleme: 18 Mayıs 2026</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <section className="space-y-2">
              <h3 className="font-medium text-foreground">1. Hizmet Hakkında</h3>
              <p>
                Sepet, market ürünlerinin fiyatlarını karşılaştırmana ve yapay
                zeka destekli alışveriş listeleri oluşturmana yardımcı olan bir
                platformdur. Hizmeti kullanarak bu şartları kabul etmiş
                olursun.
              </p>
            </section>
            <section className="space-y-2">
              <h3 className="font-medium text-foreground">2. Hesap</h3>
              <p>
                Sepet&apos;e Google hesabınla giriş yaparsın. Hesabının
                güvenliği senin sorumluluğundadır. Hesabını başkasıyla
                paylaşmamalısın.
              </p>
            </section>
            <section className="space-y-2">
              <h3 className="font-medium text-foreground">
                3. Kabul Edilebilir Kullanım
              </h3>
              <p>
                Hizmeti yasalara aykırı amaçlarla, sistemi kötüye kullanacak ya
                da diğer kullanıcıları rahatsız edecek şekilde kullanamazsın.
                Yapay zeka çıktılarının ticari kararlarda tek başına
                kullanılmasını önermiyoruz.
              </p>
            </section>
            <section className="space-y-2">
              <h3 className="font-medium text-foreground">
                4. Fiyat ve Ürün Bilgileri
              </h3>
              <p>
                Gösterilen fiyatlar üçüncü taraf kaynaklardan derlenir ve
                gerçek zamanlı olmayabilir. Sepet, fiyat doğruluğu için
                garanti vermez; nihai fiyat ilgili satıcının kasasında
                belirlenir.
              </p>
            </section>
            <section className="space-y-2">
              <h3 className="font-medium text-foreground">
                5. Sorumluluk Reddi
              </h3>
              <p>
                Hizmet &quot;olduğu gibi&quot; sunulur. Sepet, yazılımdaki
                hatalar, kesintiler veya veri kayıplarından doğabilecek
                doğrudan ya da dolaylı zararlardan sorumlu tutulamaz.
              </p>
            </section>
            <section className="space-y-2">
              <h3 className="font-medium text-foreground">
                6. Değişiklikler
              </h3>
              <p>
                Bu şartları zaman zaman güncelleyebiliriz. Önemli
                değişiklikleri uygulama içinde bildiririz; güncellemeden sonra
                hizmeti kullanmaya devam etmen yeni şartları kabul ettiğin
                anlamına gelir.
              </p>
            </section>
            <section className="space-y-2">
              <h3 className="font-medium text-foreground">7. İletişim</h3>
              <p>
                Sorularını <span className="text-foreground">support@trysepet.com</span>{" "}
                adresine iletebilirsin.
              </p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function PrivacyDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="underline underline-offset-2 transition-colors hover:text-foreground"
        >
          Gizlilik
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Gizlilik Politikası</DialogTitle>
          <DialogDescription>Son güncelleme: 18 Mayıs 2026</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <section className="space-y-2">
              <h3 className="font-medium text-foreground">
                1. Topladığımız Veriler
              </h3>
              <p>
                Google ile giriş yaptığında adın, e-posta adresin ve profil
                fotoğrafın bize aktarılır. Bunun dışında oluşturduğun
                alışveriş listeleri, sohbet geçmişlerin ve yüklediğin fiş
                fotoğrafları hizmet sağlamak için saklanır.
              </p>
            </section>
            <section className="space-y-2">
              <h3 className="font-medium text-foreground">
                2. Verileri Nasıl Kullanırız
              </h3>
              <p>
                Verilerini hesabını tanımlamak, kişisel öneriler sunmak,
                yapay zeka asistanını çalıştırmak ve hizmet kalitesini
                geliştirmek için kullanırız. Verilerini reklam amacıyla
                üçüncü taraflara satmıyoruz.
              </p>
            </section>
            <section className="space-y-2">
              <h3 className="font-medium text-foreground">
                3. Yapay Zeka İşleme
              </h3>
              <p>
                Asistan mesajların ve fiş görüntülerin, yanıt üretmek için
                yapay zeka sağlayıcılarımıza iletilir. Bu sağlayıcılar
                verileri model eğitimi için kullanmaz.
              </p>
            </section>
            <section className="space-y-2">
              <h3 className="font-medium text-foreground">4. Çerezler</h3>
              <p>
                Oturumunu açık tutmak ve tercihlerini hatırlamak için zorunlu
                çerezler kullanırız. İsteğe bağlı analiz çerezlerini
                ayarlardan kapatabilirsin.
              </p>
            </section>
            <section className="space-y-2">
              <h3 className="font-medium text-foreground">5. Haklarınız</h3>
              <p>
                KVKK ve GDPR kapsamında verilerine erişme, düzeltme, silme ve
                taşınabilirlik haklarına sahipsin. Talebini iletmek için
                bizimle iletişime geçebilirsin.
              </p>
            </section>
            <section className="space-y-2">
              <h3 className="font-medium text-foreground">6. Saklama Süresi</h3>
              <p>
                Hesabını sildiğinde tüm kişisel verilerin 30 gün içinde kalıcı
                olarak silinir; yasal yükümlülükler nedeniyle bazı kayıtlar
                anonimleştirilerek saklanabilir.
              </p>
            </section>
            <section className="space-y-2">
              <h3 className="font-medium text-foreground">7. İletişim</h3>
              <p>
                Gizlilikle ilgili sorularını{" "}
                <span className="text-foreground">privacy@trysepet.com</span>{" "}
                adresine iletebilirsin.
              </p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" className="h-[18px] w-[18px]" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}
