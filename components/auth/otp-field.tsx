"use client"

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"

// Ortak 6 haneli OTP alanı (login modalı + ayarlar diyalogları). Tamamlanınca
// onComplete tetiklenir; slotlar aralıklı ve yuvarlatılmış.
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
      containerClassName="justify-center"
    >
      <InputOTPGroup className="gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <InputOTPSlot
            key={i}
            index={i}
            className="h-11 w-9 rounded-lg border-l text-base first:rounded-l-lg last:rounded-r-lg"
          />
        ))}
      </InputOTPGroup>
    </InputOTP>
  )
}
