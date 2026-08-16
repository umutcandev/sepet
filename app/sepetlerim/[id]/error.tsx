"use client"

import { RecordErrorState } from "@/components/records/record-error"

export default function BasketDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <RecordErrorState
      error={error}
      reset={reset}
      title="Sepet açılamadı"
      backHref="/sepetlerim"
      backLabel="Sepetlerim"
    />
  )
}
