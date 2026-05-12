"use server"

import { signIn, signOut } from "@/auth"

export async function signOutAction() {
  await signOut({ redirectTo: "/" })
}

const ALLOWED_CALLBACK_PREFIXES = ["/"]

function sanitizeCallback(callbackUrl: string | undefined | null): string {
  if (!callbackUrl) return "/"
  // Only allow same-origin relative paths starting with "/"
  if (typeof callbackUrl !== "string") return "/"
  if (!callbackUrl.startsWith("/")) return "/"
  if (callbackUrl.startsWith("//")) return "/"
  if (!ALLOWED_CALLBACK_PREFIXES.some((p) => callbackUrl.startsWith(p))) {
    return "/"
  }
  return callbackUrl
}

export async function signInWithGoogleAction(callbackUrl?: string) {
  const safe = sanitizeCallback(callbackUrl)
  await signIn("google", { redirectTo: safe })
}
