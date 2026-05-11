import { signIn, auth } from "@/auth"
import { redirect } from "next/navigation"
import Image from "next/image"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function LoginPage() {
  const session = await auth()
  if (session?.user) redirect("/dashboard")

  return (
    <main className="flex min-h-dvh w-full bg-white text-neutral-950">
      <div className="relative hidden lg:block lg:flex-1">
        <Image
          src="/login-image.webp"
          alt=""
          fill
          priority
          sizes="75vw"
          className="object-cover"
        />
      </div>

      <div className="flex w-full justify-center lg:w-[420px] lg:shrink-0">
        <div className="flex w-full max-w-[402px] flex-col px-5 pt-12 pb-3">
          <div className="mt-[110px] flex flex-col lg:mt-20">
            <h1 className="text-[48px] font-semibold leading-[48px] tracking-[-0.04em]">
              Sepet<span className="text-neutral-400">IQ</span>
            </h1>
            <p className="mt-[18px] max-w-[260px] text-[17px] leading-[1.35] tracking-[-0.01em] text-neutral-600">
              45+ market arasında karşılaştır.
              <br />
              Kendi enflasyonunu ölç.
            </p>
          </div>

          <div className="flex-1" />

          <ul className="mb-6 flex flex-col gap-3 text-[13px] text-neutral-600">
            {[
              "162.929 ürün, canlı fiyat",
              "Doğal dilde sepet yazımı",
              "Fiş fotoğrafından otomatik kayıt",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="h-3 w-3 shrink-0" strokeWidth={2.5} />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <form
            action={async () => {
              "use server"
              await signIn("google", { redirectTo: "/dashboard" })
            }}
          >
            <Button
              type="submit"
              size="lg"
              className="h-[52px] w-full gap-2 rounded-[14px] px-[6px] text-[15px] font-medium tracking-[-0.01em]"
            >
              <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white">
                <GoogleIcon />
              </span>
              Google ile devam et
            </Button>
          </form>

          <p className="mt-3.5 text-center text-[11px] leading-[1.5] tracking-[-0.005em] text-neutral-400">
            Devam ederek <u>Şartlar</u> ve <u>Gizlilik</u>&apos;i kabul ediyorsun.
          </p>
        </div>
      </div>
    </main>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" className="h-[18px] w-[18px]" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}
