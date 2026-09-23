import type { ConversationListItem } from "@/components/assistant/assistant-conversations-group"
import { DEFAULT_CONVERSATION_STATUS } from "@/lib/assistant/conversation-status"

// Sidebar "Geçmiş Sohbetler" listesinin filtre/gruplama/sıralama tercihleri.
export type HistoryView = {
  status: "all" | "awaiting" | "completed"
  activity: "all" | "today" | "week" | "month"
  groupBy: "date" | "status" | "none"
  sort: "recent" | "name"
}

export const DEFAULT_HISTORY_VIEW: HistoryView = {
  status: "all",
  activity: "all",
  groupBy: "none",
  sort: "recent",
}

export const HISTORY_VIEW_OPTIONS: {
  [K in keyof HistoryView]: { value: HistoryView[K]; label: string }[]
} = {
  status: [
    { value: "all", label: "Tümü" },
    { value: "awaiting", label: "Onay bekleyen" },
    { value: "completed", label: "Tamamlanan" },
  ],
  activity: [
    { value: "all", label: "Tümü" },
    { value: "today", label: "Bugün" },
    { value: "week", label: "Son 7 gün" },
    { value: "month", label: "Son 30 gün" },
  ],
  groupBy: [
    { value: "date", label: "Tarih" },
    { value: "status", label: "Durum" },
    { value: "none", label: "Yok" },
  ],
  sort: [
    { value: "recent", label: "Son etkinlik" },
    { value: "name", label: "İsim" },
  ],
}

export function parseHistoryView(raw: unknown): HistoryView {
  const view = { ...DEFAULT_HISTORY_VIEW }
  if (!raw || typeof raw !== "object") return view
  for (const key of Object.keys(view) as (keyof HistoryView)[]) {
    const value = (raw as Record<string, unknown>)[key]
    if (HISTORY_VIEW_OPTIONS[key].some((o) => o.value === value)) {
      view[key] = value as never
    }
  }
  return view
}

export function isDefaultHistoryView(view: HistoryView) {
  return (Object.keys(view) as (keyof HistoryView)[]).every(
    (key) => view[key] === DEFAULT_HISTORY_VIEW[key]
  )
}

const ACTIVITY_MAX_DAYS = { all: Infinity, today: 0, week: 6, month: 29 }

const DATE_GROUPS = [
  { maxDays: 0, label: "Bugün" },
  { maxDays: 1, label: "Dün" },
  { maxDays: 6, label: "Son 7 gün" },
  { maxDays: 29, label: "Son 30 gün" },
  { maxDays: Infinity, label: "Daha eski" },
]

const STATUS_GROUPS = ["Onay bekleyen", "Tamamlanan"]

// Takvim günü farkı; DST'de gün 23/25 saat sürebildiği için round.
function daysAgo(date: Date | string, now: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  return Math.round((today.getTime() - d.getTime()) / 86_400_000)
}

export type HistorySection = {
  label: string | null
  items: ConversationListItem[]
}

/**
 * Filtrele → sırala → (grupla) → ilk `limit` öğe. Gruplamada sıra grup
 * sırasına göre, grup içinde seçili sıralamaya göredir. `total` limit
 * öncesi eşleşen sayı ("Daha fazla göster" için).
 */
export function arrangeHistory(
  list: ConversationListItem[],
  view: HistoryView,
  limit: number,
  now = new Date()
): { sections: HistorySection[]; total: number } {
  const maxDays = ACTIVITY_MAX_DAYS[view.activity]
  const items = list.filter(
    (c) =>
      (view.status === "all" ||
        (c.status ?? DEFAULT_CONVERSATION_STATUS) === view.status) &&
      (maxDays === Infinity || daysAgo(c.updatedAt, now) <= maxDays)
  )
  // "recent": store zaten son etkinliğe göre sıralı.
  if (view.sort === "name") {
    items.sort((a, b) => a.title.localeCompare(b.title, "tr"))
  }

  if (view.groupBy === "none") {
    return {
      sections: [{ label: null, items: items.slice(0, limit) }],
      total: items.length,
    }
  }

  const labels =
    view.groupBy === "date" ? DATE_GROUPS.map((g) => g.label) : STATUS_GROUPS
  const groupOf = (c: ConversationListItem) =>
    view.groupBy === "date"
      ? DATE_GROUPS.findIndex((g) => daysAgo(c.updatedAt, now) <= g.maxDays)
      : c.status === "completed"
        ? 1
        : 0

  const sections: HistorySection[] = []
  const ranked = items
    .map((c) => ({ c, group: groupOf(c) }))
    .sort((a, b) => a.group - b.group)
    .slice(0, limit)
  for (const { c, group } of ranked) {
    const last = sections.at(-1)
    if (last?.label === labels[group]) last.items.push(c)
    else sections.push({ label: labels[group], items: [c] })
  }
  return { sections, total: items.length }
}
