import { RecordNotFoundState } from "@/components/records/record-not-found"

export default function ReceiptNotFound() {
  return (
    <RecordNotFoundState
      title="Fiş bulunamadı"
      description="Bu fiş silinmiş olabilir ya da sana ait değil."
      backHref="/fis-gecmisi"
      backLabel="Fişlerim"
    />
  )
}
