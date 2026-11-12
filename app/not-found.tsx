import type { Metadata } from "next"
import Link from "next/link"

import { SiteFooter } from "@/components/site-footer"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Sayfa bulunamadı",
  description: "Aradığın sayfa Sepet'te yok.",
  // Var olmayan yol kendini canonical ilan etmesin.
  alternates: null,
}

export default function NotFound() {
  return (
    <>
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <p className="cn-font-display text-7xl text-muted-foreground/60 md:text-8xl">
          404
        </p>
        <h1 className="mt-4 text-xl font-medium tracking-tight text-foreground">
          Sayfa bulunamadı
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Adres yanlış yazılmış ya da sayfa kaldırılmış olabilir.
        </p>
        <div className="mt-6 flex items-center gap-2">
          <Button variant="default" asChild>
            <Link href="/">Ana sayfa</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/asistan">Asistan</Link>
          </Button>
        </div>
      </div>
      <SiteFooter className="mt-0" />
    </>
  )
}
