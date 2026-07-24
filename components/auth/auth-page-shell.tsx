import Image from "next/image"

// /dogrula ve /sifre-sifirla için ortak, login formu stilinde ortalanmış marka
// kartı. AppShell içinde render edilir; minimal ve nötr.
export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[70dvh] w-full items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-[402px] flex-col items-center rounded-xl bg-background px-6 pt-10 pb-8 text-center ring-1 ring-foreground/10">
        <Image
          src="/brand/sepet-square-dark.webp"
          alt="Sepet"
          width={256}
          height={256}
          className="h-16 w-16 rounded-xl dark:hidden"
        />
        <Image
          src="/brand/sepet-square-light.webp"
          alt=""
          aria-hidden
          width={256}
          height={256}
          className="hidden h-16 w-16 rounded-xl dark:block"
        />
        {children}
      </div>
    </div>
  )
}
