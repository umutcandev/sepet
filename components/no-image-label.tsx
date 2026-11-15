import { cn } from "@/lib/utils"

/** Görseli olmayan ürün kutusunun ortasındaki yazı; görsel zaten dekoratif. */
export function NoImageLabel({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "px-0.5 text-center text-[0.5rem] leading-[1.15] font-medium text-muted-foreground",
        className,
      )}
    >
      Resim Yok
    </span>
  )
}
