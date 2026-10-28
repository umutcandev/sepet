import Image from "next/image"

// /dogrula ve /sifre-sifirla için ortak, login formu stilinde ortalanmış marka
// kartı. AppShell içinde render edilir; minimal ve nötr.
export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[70dvh] w-full items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-[402px] flex-col items-center rounded-xl bg-background px-6 pt-10 pb-8 text-center smooth-shadow-ring-lg">
        <Image
          src="/brand/dark-icon-sepet.svg"
          alt="Sepet"
          width={256}
          height={256}
          priority
          className="h-16 w-16 dark:hidden"
        />
        <Image
          src="/brand/light-icon-sepet.svg"
          alt=""
          aria-hidden
          width={256}
          height={256}
          priority
          className="hidden h-16 w-16 dark:block"
        />
        {children}
      </div>
    </div>
  )
}
