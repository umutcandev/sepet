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
import { cn } from "@/lib/utils"

// Her madde koddaki davranış ve Polar yapılandırmasıyla doğrulanabilir:
// fiyatlar Polar ürünlerinden (₺99 aylık / ₺990 yıllık, TRY), limitler
// lib/usage/limits.ts'ten, iptal/ödeme akışı app/api/webhooks/polar'dan
// (past_due → erişim sürer, revoked → free), portal app/api/portal'dan, aylık
// sıfırlama ise lib/usage/period.ts'ten gelir. Destek e-postası tek kaynak
// olarak legal-content'teki LEGAL_SUPPORT_EMAIL'den alınır. `a` zengin içerik
// (mailto bağlantısı) taşıyabilsin diye ReactNode'dur.
export const FAQ_ITEMS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Pro'ya geçince neler değişir?",
    a: "Aylık asistan mesajların 50'den 500'e, görsel analizlerin 10'dan 250'ye çıkar. Sepet ve fiş kaydetme ise sınırsız olur.",
  },
  {
    q: "Ödeme veya abonelikte sorun yaşarsam ne yapmalıyım?",
    a: (
      <>
        Tahsilat, yenilenme veya plan durumuyla ilgili bir sorun yaşarsan{" "}
        <a
          href={`mailto:${LEGAL_SUPPORT_EMAIL}`}
          className="font-medium text-foreground underline underline-offset-2"
        >
          {LEGAL_SUPPORT_EMAIL}
        </a>{" "}
        adresine yazabilirsin; en kısa sürede yardımcı oluruz. Fatura ve ödeme
        geçmişine ayrıca Polar müşteri portalından ulaşabilirsin.
      </>
    ),
  },
  {
    q: "Ödeme bilgilerim güvende mi?",
    a: "Evet. Ödeme adımı tamamen Polar'ın güvenli ödeme sayfasında tamamlanır; kart bilgilerin Sepet sunucularında saklanmaz ya da işlenmez. Sepet yalnızca plan durumunu ve yenilenme tarihini saklar.",
  },
  {
    q: "Aboneliğimi nasıl yönetir veya iptal ederim?",
    a: "Abonelik sekmesindeki “Aboneliği yönet” düğmesi seni Polar müşteri portalına götürür; iptal, plan değişikliği ve fatura geçmişi oradan yönetilir. Portal yalnızca ödemeden geçmiş hesaplar için açılır.",
  },
  {
    q: "İptal edersem Pro hemen kapanır mı?",
    a: "Hayır. İptalde aboneliğin, içinde bulunduğun faturalandırma döneminin sonuna kadar açık kalır; o tarihe kadar tüm Pro avantajların sürer, ardından otomatik olarak Ücretsiz plana dönersin. Dönem bitmeden fikrini değiştirirsen iptali geri alabilirsin.",
  },
  {
    q: "Mevcut planımın ödemesi başarısız olursa ne olur?",
    a: "Bir tahsilat başarısız olursa aboneliğin “Gecikti” durumuna geçer ama Pro erişimin hemen kesilmez; Polar ödemeyi yeniden dener. Tüm denemeler başarısız olursa abonelik iptal edilir ve Ücretsiz plana geri dönersin.",
  },
  {
    q: "Kullanım limitlerim ne zaman yenilenir?",
    a: "Aylık sayaçların (asistan mesajları ve görsel analizleri) her ayın ilk günü otomatik olarak sıfırlanır; ayrı bir işlem gerekmez. Kayıtlı sepet ve fiş sayıların ise anlık toplamdır, ay başında sıfırlanmaz.",
  },
]

export function SubscriptionFaqList({ className }: { className?: string }) {
  return (
    <Accordion type="single" collapsible className={className}>
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
      <h3 className="text-sm font-semibold">Sıkça sorulan sorular</h3>
      <SubscriptionFaqList />
    </section>
  )
}
