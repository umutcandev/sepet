import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// Basma fiziği yalnız "nesne" gibi duran varyantlarda. Satır (`item`) ve metin
// bağlantıları (`link*`) basılınca küçülmez: tam genişlikte bir satırın %2
// daralması bir buton hissi değil, sayfanın titremesi gibi okunuyor.
const press =
  "active:not-aria-[haspopup]:translate-y-px active:not-aria-[haspopup]:scale-[0.98] active:not-aria-[haspopup]:[--surface-ambient:transparent]"

const buttonVariants = cva(
  // `border` YOK. Kenar, `surface-raised`ın gölge zincirindeki 1px halkadır
  // (bkz. globals.css). Eskiden gerçek bir `border` + `bg-clip-padding` + iç rim
  // üçlüsü vardı ve hover'da açık halka, dark outline'da çift çizgi gibi
  // artefaktları tek tek yamamak gerekiyordu; halka gölgenin içinde olunca o
  // sınıf sorunlar hiç oluşmuyor. Odak ve hata hâli de kenarlığı değil halkanın
  // rengini (`--surface-edge`) değiştirir.
  "group/button relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg text-sm font-medium whitespace-nowrap outline-none select-none transition-[color,background-color,box-shadow,translate,scale,opacity] duration-150 ease-out-soft focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:[--surface-edge:var(--ring)] disabled:pointer-events-none disabled:opacity-50 aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:[--surface-edge:var(--destructive)] dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Dolgu `bg-(--surface-base)`: görünen renk ile ışığın/gölgenin
        // türetildiği taban TEK kaynaktan gelir. Hover yalnız tabanı değiştirir,
        // kenar ve gölge de onunla birlikte koyulaşır.
        default: cn(
          "surface-raised bg-(--surface-base) text-primary-foreground [--surface-base:var(--primary)] hover:[--surface-base:var(--primary-hover)]",
          press
        ),
        outline: cn(
          "surface-raised bg-(--surface-base) [--surface-base:var(--surface-outline)] hover:[--surface-base:var(--surface-outline-hover)] aria-expanded:[--surface-base:var(--surface-outline-hover)]",
          press
        ),
        secondary: cn(
          "surface-raised bg-(--surface-base) text-secondary-foreground [--surface-base:var(--secondary)] hover:[--surface-base:var(--surface-secondary-hover)] aria-expanded:[--surface-base:var(--surface-secondary-hover)]",
          press
        ),
        destructive: cn(
          "surface-raised bg-(--surface-base) text-destructive [--surface-base:var(--surface-destructive)] hover:[--surface-base:var(--surface-destructive-hover)] focus-visible:ring-destructive/20 focus-visible:[--surface-edge:color-mix(in_oklab,var(--destructive)_45%,var(--surface-base))] dark:focus-visible:ring-destructive/40",
          press
        ),
        // Öneri çipleri (ana sayfa hero'su, boş asistan ekranı). Dolgu
        // `--control`: dark'ta kenar çubuğunun tonu, yani çipler chrome ile
        // aynı ailede durur. İki ekran eskiden bunu ayrı ayrı (biri `bg-muted`,
        // biri `bg-control`) elle yazıyordu.
        chip: cn(
          "surface-raised bg-(--surface-base) font-normal text-muted-foreground [--surface-base:var(--control)] hover:text-foreground",
          press
        ),
        // İkincil eylemler (kapat, geri, menü, vazgeç) sayfadaki metinden bir
        // kademe sönük durur; hover'da ön plana çıkar. Çağrı yerlerinde elle
        // `text-muted-foreground hover:text-foreground` yazılması bunun eksik
        // olduğunu gösteriyordu.
        ghost: cn(
          "text-muted-foreground hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
          press
        ),
        link: "text-primary underline-offset-4 hover:underline",
        // Auth akışındaki "Şifreni mi unuttun?", "Kurtarma kodu kullan" gibi
        // metin eylemleri.
        "link-muted":
          "font-normal text-muted-foreground underline-offset-2 hover:text-foreground hover:underline",
        // Ayarlar dialogu gibi yerel gezinme listelerinin satırı. Aktiflik
        // `aria-current="page"` ile anlatılır.
        nav: "justify-start text-left text-muted-foreground hover:bg-accent/60 hover:text-foreground aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground",
        // Liste satırı (il seçici, ayar arama sonuçları).
        item: "w-full justify-start text-left font-normal whitespace-normal hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        // Auth ekranlarının tam genişlik eylemleri (sosyal giriş, Doğrula,
        // Giriş yap). 44px: dokunmatik hedef tabanı. Önceden on dört yerde
        // `h-11 rounded-xl` elle yazılıyordu.
        xl: "h-11 gap-2 rounded-xl px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-8",
        // Metin içindeki 16px'lik bilgi işaretleri. Görünen boyut küçük;
        // tıklama alanı `hitArea` ile açılmalı.
        "icon-2xs":
          "size-4 rounded-full [&_svg:not([class*='size-'])]:size-3.5",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
        // Cümle içindeki bağlantılar: yükseklik, dolgu ve yazı boyutu
        // bağlamdan gelir.
        inline: "h-auto gap-1 p-0 text-[length:inherit]",
        // İçeriği iki satır olan liste satırları.
        auto: "h-auto gap-2.5 px-2 py-1.5",
      },
      // Görünen boyutu küçük kalan kontrollerin tıklama alanını her yönde 8px
      // açar (WCAG 2.5.8). Komşusuna 16px'ten yakın kontrollerde kullanma:
      // alanlar üst üste biner ve sonraki kazanır.
      hitArea: {
        true: "after:absolute after:-inset-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = React.ComponentProps<"button"> &
  Omit<VariantProps<typeof buttonVariants>, "variant"> & {
    // Zorunlu: varyantı yazılmamış bir buton sessizce birincil (dolgulu kahve)
    // olur. Her çağrı yeri hangi ağırlıkta bir eylem olduğunu açıkça söyler.
    variant: NonNullable<VariantProps<typeof buttonVariants>["variant"]>
    asChild?: boolean
  }

// Kendi varyantını zaten seçen sarmalayıcılar (SidebarTrigger, carousel
// okları, InputGroupButton, AlertDialog eylemleri…) için: sarmalayıcının
// varsayılanı açık olduğundan çağrı yerinde varyant opsiyoneldir.
type ButtonWrapperProps = Omit<ButtonProps, "variant"> & {
  variant?: ButtonProps["variant"]
}

function Button({
  className,
  variant,
  size = "default",
  hitArea,
  asChild = false,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      // `<button>`ın HTML varsayılanı `submit`: form içinde `type`ı unutulmuş
      // bir "Vazgeç" formu gönderir. Gönderim açıkça `type="submit"` ister.
      type={asChild ? type : (type ?? "button")}
      className={cn(buttonVariants({ variant, size, hitArea, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants, type ButtonProps, type ButtonWrapperProps }
