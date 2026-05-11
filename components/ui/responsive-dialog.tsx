"use client"

import * as React from "react"

import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer"

const DESKTOP_QUERY = "(min-width: 768px)"

type Open = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}

function useIsDesktop() {
  return useMediaQuery(DESKTOP_QUERY)
}

function ResponsiveDialog({ open, onOpenChange, children }: Open) {
  const isDesktop = useIsDesktop()
  return isDesktop ? (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
    </Dialog>
  ) : (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {children}
    </Drawer>
  )
}

function ResponsiveDialogContent({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const isDesktop = useIsDesktop()
  return isDesktop ? (
    <DialogContent className={cn("sm:max-w-2xl", className)}>
      {children}
    </DialogContent>
  ) : (
    <DrawerContent className={className}>{children}</DrawerContent>
  )
}

function ResponsiveDialogHeader({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const isDesktop = useIsDesktop()
  return isDesktop ? (
    <DialogHeader className={className}>{children}</DialogHeader>
  ) : (
    <DrawerHeader className={className}>{children}</DrawerHeader>
  )
}

function ResponsiveDialogTitle({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const isDesktop = useIsDesktop()
  return isDesktop ? (
    <DialogTitle className={className}>{children}</DialogTitle>
  ) : (
    <DrawerTitle className={className}>{children}</DrawerTitle>
  )
}

function ResponsiveDialogDescription({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const isDesktop = useIsDesktop()
  return isDesktop ? (
    <DialogDescription className={className}>{children}</DialogDescription>
  ) : (
    <DrawerDescription className={className}>{children}</DrawerDescription>
  )
}

function ResponsiveDialogFooter({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const isDesktop = useIsDesktop()
  return isDesktop ? (
    <DialogFooter className={className}>{children}</DialogFooter>
  ) : (
    <DrawerFooter className={className}>{children}</DrawerFooter>
  )
}

/**
 * Body wrapper that keeps padding consistent across modes.
 * - Desktop (Dialog): the parent DialogContent already has `p-4 gap-4`, so we
 *   render as `display: contents` to stay invisible to that grid.
 * - Mobile (Drawer): DrawerContent has no inner padding, so we add `px-4 pb-4`.
 */
function ResponsiveDialogBody({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const isDesktop = useIsDesktop()
  return isDesktop ? (
    <div className={cn("contents", className)}>{children}</div>
  ) : (
    <div className={cn("px-4 pb-4 space-y-3", className)}>{children}</div>
  )
}

export {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogBody,
}
