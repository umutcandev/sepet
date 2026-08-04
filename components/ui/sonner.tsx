"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--border-radius": "var(--radius)",
          // Kenar `smooth-shadow-ring-md`in içindeki hairline'dan geliyor.
          // Sonner'ın kendi 1px border'ı açık kalsaydı gölgenin hemen içinde
          // ikinci bir sert çizgi olarak dururdu — düzeltmeye çalıştığımız
          // çift kenarın ta kendisi. `richColors` açık olduğu için nötr
          // `--normal-border` yetmiyor, durum renklerinin kenarları da
          // kapatılıyor. Anlamı zaten zemin tonu, ikon ve metin rengi taşıyor;
          // kenar yalnız çerçeve çiziyordu.
          "--normal-border": "transparent",
          "--success-border": "transparent",
          "--error-border": "transparent",
          "--warning-border": "transparent",
          "--info-border": "transparent",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          // `!` şart: sonner kendi `box-shadow`unu KATMANSIZ bir <style> ile
          // enjekte ediyor, Tailwind utility'leri ise `@layer utilities`te —
          // katmansız CSS katmanlıyı yener, yani plugin'in gölgesi (halkasıyla
          // birlikte) sessizce düşerdi. Önemli değiştirici bunu geri alır.
          // (shadow-plugin v1 tüm utility'lere `!important` basıyordu ve bu
          // gerekmiyordu; v2 onu kaldırdı, kural artık burada açık yazılı.)
          toast: "cn-toast smooth-shadow-ring-md!",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
