"use client"

import {
  RiAlertLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiInformationLine,
  RiLoader4Line,
} from "@remixicon/react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, toast as sonnerToast, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <RiCheckboxCircleLine className="size-4" />,
        info: <RiInformationLine className="size-4" />,
        warning: <RiAlertLine className="size-4" />,
        error: <RiCloseCircleLine className="size-4" />,
        loading: <RiLoader4Line className="size-4 animate-spin" />,
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
      closeButton
      // Sonner varsayılanı 4sn; zamanlı bir bildirimin tabanı 5sn. Hataların
      // kendisi hiç sönmüyor (aşağıdaki sarmalayıcı), bu süre yalnız düşük
      // riskli onaylar için.
      duration={6000}
      {...props}
    />
  )
}

/**
 * Projede `toast` doğrudan sonner'dan değil buradan alınır.
 *
 * Tek sebebi var: HATA bildirimleri kendiliğinden kaybolmamalı. Kaybolan bir
 * hata, kullanıcı okumaya yetişemediğinde geri getirilemez; ekran okuyucu ya da
 * büyüteç kullanan biri için birkaç saniye çoğu zaman yetmez. Diğer türler
 * Toaster'daki 6sn'yi kullanmaya devam eder, hepsinde kapatma butonu var.
 *
 * Çağıran taraf isterse `duration` geçerek bunu geçersiz kılabilir.
 */
const toast: typeof sonnerToast = Object.assign(
  ((...args: Parameters<typeof sonnerToast>) => sonnerToast(...args)) as typeof sonnerToast,
  sonnerToast,
  {
    error: ((message, data) =>
      sonnerToast.error(message, {
        duration: Number.POSITIVE_INFINITY,
        ...data,
      })) as typeof sonnerToast.error,
  }
)

export { Toaster, toast }
