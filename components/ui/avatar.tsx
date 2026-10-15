"use client"

import * as React from "react"
import { Avatar as AvatarPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Avatar({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & {
  size?: "xs" | "sm" | "default" | "lg"
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        // `isolate` ŞART. Aşağıdaki `::after` kenarı `mix-blend-darken` ile
        // boyanıyor ve harmanın zemini, en yakın stacking context'e kadar
        // ALTTAKİ HER ŞEY. `relative` tek başına context yaratmıyor (z-index
        // yok), dolayısıyla bir avatar grubunda öndeki avatarın kenarı
        // arkasındaki avatarın üstünde harmanlanıp bindirme yerinde koyu bir
        // yay bırakıyordu. `isolate` harmanı avatarın kendi boyamasına kapatır.
        "group/avatar isolate relative flex size-8 shrink-0 rounded-full select-none before:pointer-events-none before:absolute before:inset-0 before:z-10 before:rounded-full before:shadow-[inset_0_0_0_1px_var(--surface-ring-inner)] after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken data-[size=lg]:size-10 data-[size=sm]:size-6 data-[size=xs]:size-5 dark:after:mix-blend-lighten",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn(
        "aspect-square size-full rounded-full object-cover",
        className
      )}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground group-data-[size=sm]/avatar:text-xs group-data-[size=xs]/avatar:text-[10px]",
        className
      )}
      {...props}
    />
  )
}

function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground bg-blend-color ring-2 ring-background select-none",
        "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
        "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
        "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        // Bindirme boşluğu BOYANMAZ, oyulur (`avatar-cut`). Eskiden zemin
        // renginde (`--card`) bir halka çiziliyordu; zemin o renk olmayınca
        // (sidebar, yarı saydam menü, üzerine gelinmiş satır, koyu tema)
        // halka avatarın çevresinde açık bir şerit olarak okunuyordu. Oyukta
        // arkadaki zemin ne ise o görünür; tek avatarda hiç iz kalmaz.
        //
        // Bindirme ve boşluk değişkenle verilir, çünkü oyuğun konumu bunlardan
        // hesaplanıyor. xs'te 8px bindirme 20px'lik avatarın neredeyse
        // yarısını yiyordu, orada 6px.
        "group/avatar-group flex [--avatar-gap:2px] [--avatar-overlap:0.5rem] *:not-first:-ms-(--avatar-overlap) *:not-last:avatar-cut has-data-[size=xs]:[--avatar-overlap:0.375rem]",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroupCount({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 group-has-data-[size=xs]/avatar-group:size-5 group-has-data-[size=xs]/avatar-group:text-[10px] [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3 group-has-data-[size=xs]/avatar-group:[&>svg]:size-3",
        className
      )}
      {...props}
    />
  )
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
}
