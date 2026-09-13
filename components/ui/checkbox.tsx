"use client"

import * as React from "react"
import { RiCheckLine } from "@remixicon/react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

const checkboxBox =
  "surface-inset data-checked:surface-raised-tight peer relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input transition-colors outline-none group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary"

const checkboxIndicator =
  "grid place-content-center text-current transition-none [&>svg]:size-3.5"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(checkboxBox, className)}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className={checkboxIndicator}
      >
        <RiCheckLine />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

// Salt görsel kutu: seçim durumunu satırın kendisi (button/label) taşıdığında
// kullan. Radix Root bir <button> render ettiği için iç içe button olurdu.
function CheckboxVisual({
  checked,
  className,
  ...props
}: React.ComponentProps<"span"> & { checked?: boolean }) {
  return (
    <span
      data-slot="checkbox"
      data-state={checked ? "checked" : "unchecked"}
      aria-hidden
      className={cn(checkboxBox, className)}
      {...props}
    >
      {checked ? (
        <span data-slot="checkbox-indicator" className={checkboxIndicator}>
          <RiCheckLine />
        </span>
      ) : null}
    </span>
  )
}

export { Checkbox, CheckboxVisual }
