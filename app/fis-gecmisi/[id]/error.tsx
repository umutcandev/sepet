"use client"

import { RecordErrorState } from "@/components/records/record-error"

export default function ReceiptDetailError({
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
      title="Fiş açılamadı"
      backHref="/fis-gecmisi"
      backLabel="Fişlerim"
    />
  )
}
