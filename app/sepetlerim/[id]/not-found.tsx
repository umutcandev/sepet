import { RecordNotFoundState } from "@/components/records/record-not-found"

export default function BasketNotFound() {
  return (
    <RecordNotFoundState
      title="Sepet bulunamadı"
      description="Bu sepet silinmiş olabilir ya da sana ait değil."
      backHref="/sepetlerim"
      backLabel="Sepetlerim"
    />
  )
}
