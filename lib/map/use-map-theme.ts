"use client"

import { useTheme } from "next-themes"

import type { MapTheme } from "./style"

/** Uygulamanın çözülmüş teması; harita gece/gündüz renklerini buna göre seçer. */
export function useMapTheme(): MapTheme {
  const { resolvedTheme } = useTheme()
  return resolvedTheme === "dark" ? "dark" : "light"
}
