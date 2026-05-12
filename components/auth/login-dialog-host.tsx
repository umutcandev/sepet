"use client"

import * as React from "react"
import { usePathname, useSearchParams } from "next/navigation"

import { LoginDialog } from "@/components/auth/login-dialog"
import { useLoginDialog } from "@/lib/stores/login-dialog"

export function LoginDialogHost() {
  const { open, setOpen } = useLoginDialog()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const callbackUrl = React.useMemo(() => {
    if (!pathname) return "/"
    const qs = searchParams?.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }, [pathname, searchParams])

  return <LoginDialog open={open} onOpenChange={setOpen} callbackUrl={callbackUrl} />
}
