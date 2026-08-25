import Link from "next/link"
import { RiSearchLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"

export function RecordNotFoundState({
  title,
  description,
  backHref,
  backLabel,
}: {
  title: string
  description: string
  backHref: string
  backLabel: string
}) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 text-center">
      <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <RiSearchLine className="size-5" />
      </div>
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <div className="mt-5 flex items-center justify-center gap-2">
        <Button asChild>
          <Link href={backHref}>{backLabel}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/asistan">Asistan&apos;a git</Link>
        </Button>
      </div>
    </div>
  )
}
