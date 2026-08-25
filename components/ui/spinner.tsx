import { cn } from "@/lib/utils"
import { RiLoader4Line } from "@remixicon/react"

function Spinner({ className, ...props }: React.ComponentProps<typeof RiLoader4Line>) {
  return (
    <RiLoader4Line role="status" aria-label="Loading" className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }
