"use client"

// Abonelik SSS'i — tek kaynak. Ayarlar > Abonelik paneli ve ana sayfadaki
// fiyatlandırma bölümü aynı listeyi kullanır; iki yerde ayrışan cevap olmasın.

import * as React from "react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { LEGAL_SUPPORT_EMAIL } from "@/components/legal/legal-content"
import { planLimit, type UsageMetric } from "@/lib/usage/limits"
import { cn } from "@/lib/utils"

// Cevaplar koddaki davranışa bağlı: limitler lib/usage/limits.ts, sıfırlama
// lib/usage/period.ts, iptal/ödeme akışı app/api/webhooks/polar.
// Sayılar dinamik olduğu için yanlarına ek getirilmez (10'dan/60'a uyumu kırılır).
const free = (m: UsageMetric) => planLimit("free", m)

export const FAQ_ITEMS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Sepet ücretli mi?",
    a: `Hayır, Sepet'i ücretsiz kullanabilirsin. Ücretsiz planda ayda ${free("textMessages")} asistan mesajı ve ${free("imageAnalyses")} görsel analizi hakkın olur, ${free("savedBaskets")} sepet ve ${free("savedReceipts")} fiş kaydedebilirsin. Pro'ya geçerek bu hakları artırabilirsin.`,
  },
  {
    q: "Ödemede ya da abonelikte sorun yaşarsam ne yapmalıyım?",
    a: (
      <>
        Tahsilat, yenileme ya da plan durumuyla ilgili bir sorunda{" "}
        <a
          href={`mailto:${LEGAL_SUPPORT_EMAIL}`}
          className="font-medium text-foreground underline underline-offset-2"
        >
          {LEGAL_SUPPORT_EMAIL}
        </a>{" "}
        adresine yaz, en kısa sürede yardımcı olalım. Faturalarına ve ödeme
        geçmişine Polar müşteri portalından da ulaşabilirsin.
      </>
    ),
  },
  {
    q: "Ödeme bilgilerim güvende mi?",
    a: "Evet. Ödeme Polar'ın güvenli ödeme sayfasında tamamlanır, kart bilgilerin Sepet sunucularına hiç ulaşmaz. Sepet yalnızca plan durumunu ve yenileme tarihini saklar.",
  },
  {
    q: "Aboneliğimi nasıl yönetir ya da iptal ederim?",
    a: "Ayarlar'daki Abonelik bölümünde “Aboneliği yönet” düğmesi seni Polar müşteri portalına götürür. İptal, plan değişikliği ve fatura geçmişi orada. Portal yalnızca daha önce Pro'ya geçmiş hesaplarda açılır.",
  },
  {
    q: "İptal edersem Pro hemen kapanır mı?",
    a: "Hayır. İptal ettiğinde Pro, içinde bulunduğun fatura döneminin sonuna kadar açık kalır. O tarihte hesabın kendiliğinden Ücretsiz plana döner. Dönem bitmeden fikrini değiştirirsen iptali geri alabilirsin.",
  },
  {
    q: "Ödemem başarısız olursa ne olur?",
    a: "Tahsilat başarısız olunca aboneliğin “Gecikti” durumuna geçer ama Pro erişimin hemen kesilmez, Polar ödemeyi yeniden dener. Denemelerin hepsi başarısız olursa abonelik iptal edilir ve Ücretsiz plana dönersin.",
  },
  {
    q: "Kullanım haklarım ne zaman yenilenir?",
    a: "Pro'da asistan mesajı ve görsel analizi sayaçların her ay, abonelik yenileme gününde sıfırlanır. Yıllık planda da sayaç aylık işler. Ücretsiz planda sıfırlama her ayın ilk günü olur. Kayıtlı sepet ve fiş sayın anlık toplamdır, sıfırlanmaz.",
  },
]

export function SubscriptionFaqList({
  className,
  value,
  onValueChange,
}: {
  className?: string
  value?: string
  onValueChange?: (value: string) => void
}) {
  return (
    <Accordion
      type="single"
      collapsible
      className={className}
      value={value}
      onValueChange={onValueChange}
    >
      {FAQ_ITEMS.map((item) => (
        <AccordionItem key={item.q} value={item.q}>
          <AccordionTrigger className="font-normal">{item.q}</AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            {item.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

// Ayarlar panelindeki başlıklı sarmalayıcı.
export function SubscriptionFaq({ className }: { className?: string }) {
  return (
    <section
      data-search-target="sss"
      className={cn("flex flex-col gap-3", className)}
    >
      <h3 className="text-sm font-medium text-balance">Sıkça sorulan sorular</h3>
      <SubscriptionFaqList />
    </section>
  )
}
