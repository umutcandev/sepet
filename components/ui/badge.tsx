import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "surface-raised-chip bg-primary text-primary-foreground [a]:hover:bg-primary-hover",
        secondary:
          "surface-raised-chip bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "surface-raised-chip bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "surface-raised-chip border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        // `surface-raised-chip` diğer dolu varyantlarla aynı sebeple burada:
        // bu ikisi onsuzdu ve yan yana geldiklerinde düz kalıyorlardı. Rim'in
        // beslendiği `--surface-base` globals.css'te tanımlı (destructive ile
        // aynı kalıp: görünen yüzey varyantın ADI değil, alfalı dolgunun
        // zeminle karışmış hâli).
        // Yazı 800 tonunda: 700 bu dolgu üstünde amber'de 4,35:1 ile 4,5:1'in
        // altında, emerald'da 4,51:1 ile sınırdaydı; kart içi 10px rozetler bu
        // varyantları kullanıyor. 800 ile ikisi de ~6:1.
        success:
          "surface-raised-chip bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
        warning:
          "surface-raised-chip bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
