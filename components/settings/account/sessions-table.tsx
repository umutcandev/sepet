"use client"

import * as React from "react"
import { MoreHorizontalIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  listSessions,
  revokeSession,
  type SessionRow,
} from "@/lib/actions/sessions"

const dtFmt = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
})

function fmt(iso: string): string {
  return dtFmt.format(new Date(iso))
}

// Aktif cihaz oturumları. Mount'ta listSessions ile yüklenir; masaüstünde tablo,
// mobilde kart listesi gösterir. Satır eylem menüsündeki üç-nokta (no-icon
// kuralının istisnası) ile bir oturum uzaktan kapatılabilir.
export function SessionsTable() {
  const [rows, setRows] = React.useState<SessionRow[] | null>(null)
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">(
    "loading",
  )
  const [busyId, setBusyId] = React.useState<string | null>(null)

  React.useEffect(() => {
    let active = true
    listSessions()
      .then((r) => {
        if (!active) return
        setRows(r)
        setStatus("ready")
      })
      .catch(() => {
        if (active) setStatus("error")
      })
    return () => {
      active = false
    }
  }, [])

  const revoke = React.useCallback(async (id: string) => {
    setBusyId(id)
    try {
      await revokeSession(id)
      setRows((prev) => prev?.filter((r) => r.id !== id) ?? null)
    } finally {
      setBusyId(null)
    }
  }, [])

  if (status === "loading") return <SessionsSkeleton />
  if (status === "error") {
    return (
      <p className="text-sm text-muted-foreground">
        Oturumlar yüklenemedi. Lütfen tekrar dene.
      </p>
    )
  }
  if (!rows || rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Aktif oturum bulunamadı.</p>
    )
  }

  return (
    // Tek tablo (mobil dahil). Table'ın iç kabı overflow-x-auto olduğu için
    // taşmada yatay kaydırılır; ince, yuvarlak scrollbar tüm Ayarlar modalıyla
    // ortak `cn-scrollbar-thin-table` yardımcısından gelir (bkz. globals.css).
    <div className="cn-scrollbar-thin-table">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cihaz</TableHead>
            <TableHead>Konum</TableHead>
            <TableHead>Oluşturma</TableHead>
            <TableHead>Güncelleme</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id} className="group">
              <TableCell className="font-medium">
                <span className="flex items-center gap-2">
                  {r.deviceLabel}
                  {r.isCurrent ? (
                    <Badge variant="secondary">Bu cihaz</Badge>
                  ) : null}
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {r.locationLabel}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {fmt(r.createdAt)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {fmt(r.lastSeenAt)}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Oturum eylemleri"
                      disabled={busyId === r.id}
                      // Mobilde her zaman görünür; masaüstünde hover/açıkken belirir.
                      className="text-muted-foreground transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:aria-expanded:opacity-100"
                    >
                      <MoreHorizontalIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-40">
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={(e) => {
                        e.preventDefault()
                        void revoke(r.id)
                      }}
                    >
                      Oturumu kapat
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function SessionsSkeleton() {
  return (
    <div className="flex flex-col gap-3 py-1">
      {[0, 1, 2].map((r) => (
        <div key={r} className="flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}
