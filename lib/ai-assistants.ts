import {
  RiClaudeFill,
  RiGeminiFill,
  RiGrokAiFill,
  RiOpenaiFill,
  type RemixiconComponentType,
} from "@remixicon/react"

export type AssistantLink = {
  key: "chatgpt" | "claude" | "gemini" | "grok"
  name: string
  href: string
  icon: RemixiconComponentType
}

// Gemini deep-link'i prompt almıyor; Google AI Modu (udm=50) kullanılıyor.
export function getAssistantLinks(prompt: string): AssistantLink[] {
  const q = encodeURIComponent(prompt)
  return [
    { key: "chatgpt", name: "ChatGPT", icon: RiOpenaiFill, href: `https://chatgpt.com/?q=${q}` },
    { key: "claude", name: "Claude", icon: RiClaudeFill, href: `https://claude.ai/new?q=${q}` },
    { key: "gemini", name: "Gemini", icon: RiGeminiFill, href: `https://www.google.com/search?udm=50&aep=1&q=${q}` },
    { key: "grok", name: "Grok", icon: RiGrokAiFill, href: `https://grok.com/?q=${q}` },
  ]
}
