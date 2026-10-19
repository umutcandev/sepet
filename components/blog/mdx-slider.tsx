"use client"

import * as React from "react"
import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  useCarousel,
} from "@/components/ui/carousel"
import { cn } from "@/lib/utils"

// MDX içinde kaydırılabilir görsel bloğu. Yazı kaynağında yalnız etiket var:
//
//   <Slider label="Motif örnekleri">
//     <Slide src="/blog/media/x.svg" alt="…">Alt yazı</Slide>
//   </Slider>
//
// Her slayt kendi alt yazısını taşır; denetimler (önceki/sonraki, sıra) bloğun
// altında tek satırda. Parmakla ve fareyle sürüklenir; blok ya da içindeki bir
// düğme odaktayken ok tuşları da çalışır (Carousel). `ratio` bloktaki bütün
// görsellerin en-boy oranı; kutu sabit olduğu için slayt değişirken yazı
// zıplamaz.

type SlideProps = {
  src: string
  alt: string
  children?: React.ReactNode
}

export function Slide({ src, alt, children }: SlideProps) {
  return (
    <figure className="flex flex-col gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        draggable={false}
        // MdxImage ile aynı nötr kenar: görselin üstünde kir gibi durmasın.
        className="aspect-(--slide-ratio) w-full rounded-lg object-cover outline outline-1 -outline-offset-1 outline-black/10 select-none dark:outline-white/10"
      />
      {children ? (
        <figcaption className="text-sm text-muted-foreground">
          {children}
        </figcaption>
      ) : null}
    </figure>
  )
}

function SliderControls({ count }: { count: number }) {
  const { api, scrollPrev, scrollNext, canScrollPrev, canScrollNext } =
    useCarousel()
  const [index, setIndex] = React.useState(0)

  React.useEffect(() => {
    if (!api) return
    const sync = () => setIndex(api.selectedScrollSnap())
    sync()
    api.on("select", sync)
    api.on("reInit", sync)
    return () => {
      api.off("select", sync)
      api.off("reInit", sync)
    }
  }, [api])

  // Sınırdaki düğme `disabled` olsaydı odak sayfanın başına düşerdi; klavye
  // kullanıcısı yerini kaybetmesin diye odakta kalır, tıklama boşa gider.
  const button =
    "rounded-full aria-disabled:cursor-default aria-disabled:opacity-50"
  return (
    <div className="mt-3 flex items-center justify-end gap-2">
      <span
        aria-hidden
        className="mr-1 text-sm text-muted-foreground tabular-nums"
      >
        {index + 1} / {count}
      </span>
      <span aria-live="polite" className="sr-only">
        {count} görselden {index + 1}.
      </span>
      <Button
        variant="outline"
        size="icon-sm"
        className={button}
        onClick={() => canScrollPrev && scrollPrev()}
        aria-disabled={!canScrollPrev}
      >
        <RiArrowLeftSLine />
        <span className="sr-only">Önceki görsel</span>
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        className={button}
        onClick={() => canScrollNext && scrollNext()}
        aria-disabled={!canScrollNext}
      >
        <RiArrowRightSLine />
        <span className="sr-only">Sonraki görsel</span>
      </Button>
    </div>
  )
}

export function Slider({
  label,
  ratio = "16/9",
  className,
  children,
}: {
  label: string
  ratio?: string
  className?: string
  children: React.ReactNode
}) {
  // MDX satır sonlarını metin düğümü olarak da geçirebiliyor; yalnız
  // elemanlar slayt sayılır.
  const slides = React.Children.toArray(children).filter(React.isValidElement)

  return (
    <Carousel
      aria-label={label}
      aria-roledescription="kaydırmalı görseller"
      // Odaklanabilir bölge: ok tuşları düğmeye gitmeden de çalışsın.
      tabIndex={0}
      className={cn(
        "not-prose my-8 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
        className
      )}
      style={{ "--slide-ratio": ratio } as React.CSSProperties}
    >
      <CarouselContent>
        {slides.map((slide, i) => (
          <CarouselItem
            key={i}
            aria-roledescription="görsel"
            aria-label={`${slides.length} görselden ${i + 1}`}
          >
            {slide}
          </CarouselItem>
        ))}
      </CarouselContent>
      <SliderControls count={slides.length} />
    </Carousel>
  )
}
