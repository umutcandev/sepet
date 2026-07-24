"use client"

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"

// Ortak 6 haneli OTP alanı (login modalı + ayarlar diyalogları). Tamamlanınca
// onComplete tetiklenir. Slotlar sabit genişlikte DEĞİL: kapsayıcının tamamına
// yayılır (flex-1) ki alan, altındaki tam genişlik butonlarla aynı grid'e
// otursun; mobil, tablet ve masaüstünde kapsayıcı ne kadar genişse o kadar yer
// kaplar.
export function OtpField({
  value,
  onChange,
  onComplete,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  onComplete?: (v: string) => void
  disabled?: boolean
}) {
  return (
    <InputOTP
      maxLength={6}
      value={value}
      onChange={onChange}
      onComplete={onComplete}
      disabled={disabled}
      containerClassName="w-full"
    >
      <InputOTPGroup className="w-full gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <InputOTPSlot
            key={i}
            index={i}
            className="h-12 min-w-0 flex-1 rounded-lg border-l text-base first:rounded-l-lg last:rounded-r-lg"
          />
        ))}
      </InputOTPGroup>
    </InputOTP>
  )
}
