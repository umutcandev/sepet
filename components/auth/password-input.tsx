"use client"

import * as React from "react"
import { RiEyeLine, RiEyeOffLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// Tüm auth şifre alanları için ortak göster/gizle özellikli input. type
// dışarıdan alınmaz (text/password'u toggle yönetir); kalan tüm props Input'a
// aynen geçer.
export function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type">) {
  const [visible, setVisible] = React.useState(false)

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        // Sağ dolgu SONDA: çağrı yerlerinin `px-3`ü önce gelirse tailwind-merge
        // `pr-*`ı düşürüyor ve metin göz düğmesinin altına giriyordu.
        className={cn(className, "pr-11")}
        {...props}
      />
      <div className="absolute inset-y-0 right-1.5 flex items-center">
        <Button
          variant="ghost"
          size="icon-sm"
          // Sekme sırasında: her pointer etkileşiminin klavye yolu olmalı.
          // Eskiden tabIndex={-1} idi ve klavye kullanıcısı şifresini hiç
          // göremiyordu; aria-pressed de ulaşılamadığı için işe yaramıyordu.
          aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <RiEyeOffLine aria-hidden /> : <RiEyeLine aria-hidden />}
        </Button>
      </div>
    </div>
  )
}
