import Link from "next/link"
import { RiArrowRightLine } from "@remixicon/react"

import { SepetMark } from "@/components/brand/sepet-mark"
import { Squircle } from "@/components/ui/squircle"
import { AnimateEnter } from "@/components/motion/animate-enter"
import { MarketLogoTrack } from "@/components/home/market-logo-track"

// Hero'nun hemen altındaki market mozaiği: solda cümle + CTA, sağda logo
// kutuları. Eskiden sonsuz kayan bir şeritti (`logo-marquee`); artık masaüstünde
// sabit bir grid, mobilde kendi kendine ilerleyen bir ray (market-logo-track).
export function HomeMarketsSection() {
  return (
    // Kap ölçüsü özellik, blog ve footer ile birebir aynı (max-w-5xl px-4).
    //
    // Üst boşluk kasıtlı olarak dar. Bölüm hero'nun üstüne -mt ile binen
    // sarmalayıcının içinde (bkz. home-blog-section) ve hero fade'i bu noktadan
    // önce zaten tam opak --home-base'e ulaşıyor; yani mozaiğin üstünde ölçülen
    // boşluğa, gözün aynı bandın parçası saydığı fade payı da ekleniyor.
    // KIRILIMLAR VIEWPORT DEĞİL KAP GENİŞLİĞİNE BAĞLI (`@container/markets`).
    // Sebep: solda kenar çubuğu var ve ~265px'i o yiyor. Viewport `md`si
    // (768px) açık kenar çubuğuyla ~500px'lik bir alan demek; orada iki kolona
    // bölününce metin paneli 140px'e düşüp her satırda iki kelime sarıyordu.
    // Kap sorgusu gerçekte kalan yeri ölçtüğü için kenar çubuğu açılıp
    // kapandığında düzen kendiliğinden doğru olanı seçiyor.
    <div className="mx-auto w-full max-w-5xl px-4 pt-3 text-foreground @container/markets md:pt-5">
      {/* Blok fold'un TAM sınırında başlıyor: üst kenarı hangi ekran
          yüksekliğinde olursa olsun ilk ekranın dibine denk geliyor, yani
          scroll reveal'a hiç girmiyor ve animasyonsuz beliriyordu. Bu yüzden
          açılış modunda; gecikme hero'daki diziyi sürdürür (rozet 0.1 →
          başlık 0.22 → prompt 0.34 → chip 0.46 → mozaik 0.58).

          `isWhileInView={false}` sınıfı sunucu HTML'ine doğrudan yazar;
          hidrasyondan sonra eklenseydi eleman önce görünür boyanıp sonra sıfır
          opaklığa düşerdi. */}
      <AnimateEnter isWhileInView={false} delay={0.58}>
        {/* İki kolona ancak kap 896px'i geçince bölünüyor. Altında metin
            paneli tam genişlikte üstte, kutular altında kalıyor: dar alanda
            2fr'lik bir kolon cümleyi satır başına iki kelimeye düşürüyordu. */}
        <section className="grid gap-[3px] @4xl/markets:grid-cols-[2fr_5fr]">
          <h2 className="sr-only">Fiyatları karşılaştırılan marketler</h2>

          {/* `grid` ŞART, `h-full` de. `effects` açıkken Lisse bir sarmalayıcı
              div doğuruyor: grid hücresine oturan o sarmalayıcı, panelin
              kendisi değil. Tek satırlık grid sarmalayıcıyı hücre boyuna
              esnetiyor, `h-full` de paneli sarmalayıcıya. İkisi olmadan panel
              içeriği kadar kısa kalıp logo kolonunun yanında yarım asılıyordu
              (aynı kalıp blog kartlarında da var). */}
          <div className="grid">
            {/* Kart dili blog kartlarıyla ve logo kutularıyla BİREBİR:
                `radius="xl"` + `effects` + düz `border border-border`, gölge
                yok (gölgenin halkası elemanın DIŞINA boyuyor ve yatay rayda
                kırpma kutusuna denk gelip kesiliyordu).

                `bg-clip-padding` ŞART. Lisse kenarı SVG'ye taşıyor ve o çizgi
                squircle yolunun üstünde duruyor, zemin ise varsayılan olarak
                `border-box`a kadar boyanıyor: köşelerde eğrilik en yüksekken
                zemin çizginin dışına yarım piksel taşıp kutunun köşesini
                kenardan ayrık gösteriyordu. Zemini `padding-box`a çekince dış
                sınırı tek çizen SVG kalıyor.

                ZEMİN TEMA BAŞINA AYRI. Metin paneli logo kutularından KOYU
                olmalı, ama token'ların sırası temalarda ters: gündüz
                --muted (#F5E8DA) --card'dan (#FFFBF5) koyu, gecede ise
                --muted (#2D2218) --card'dan (#221A14) AÇIK. Tek token ikisini
                birden veremiyor. */}
            <Squircle
              radius="xl"
              effects
              // `gap-10`: kolonlar ayrılmadan önce panel içerik boyunda, yani
              // `justify-between` iş yapmıyor ve cümle ile CTA arasındaki tek
              // ölçü bu boşluk. İki kolona geçince panel kutuların boyuna
              // esniyor, aralığı `justify-between` veriyor.
              className="flex h-full flex-col justify-between gap-10 border border-border bg-muted bg-clip-padding p-6 @4xl/markets:gap-8 @4xl/markets:p-7 dark:bg-card"
            >
              <p className="text-[21px] leading-7 tracking-[-0.02em] text-balance text-foreground">
                A101&apos;den Tarım Kredi&apos;ye altı zincir market, tek
                alışveriş listesinde{" "}
                {/* İşaret marka adından kopmasın: ikisi tek satırda kalır.
                    Ölçüler `em` — punto değişirse hizalama da onunla gelir.
                    `align` optik: mark'ın kendi merkezi, satırın optik
                    merkezine (tabandan ~0.35em yukarısı) oturuyor, taban
                    hizasına değil; dikey oranlı (167×284) bir işaret taban
                    hizalandığında büyük harflerin üstüne taşıyor. */}
                <span className="whitespace-nowrap">
                  <SepetMark className="me-[0.28em] inline-block h-[1.05em] align-[-0.175em]" />
                  Sepet&apos;te
                </span>{" "}
                buluşuyor.
              </p>

              <Link
                href="/asistan"
                className="group inline-flex w-max items-center gap-2 rounded-md text-[17px] text-foreground/70 transition-colors hover:text-foreground"
              >
                Sepetini oluştur
                <RiArrowRightLine
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </Squircle>
          </div>

          <MarketLogoTrack />
        </section>
      </AnimateEnter>
    </div>
  )
}
