"use client"

import * as React from "react"
import { RiMoreLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
    // Dış çerçeve, koyu başlık şeridi ve sıra sıra değişen satır zemini: satır
    // çok olduğunda göz aynı satırda kalsın, liste değil tablo okunsun.
    // Dark'ta `--border` `--muted` ile aynı renk: çerçeve ve zebra satırlar
    // birbirine karışmasın diye çerçeve bir basamak açık (`--accent`).
    <div className="cn-scrollbar-thin-table overflow-hidden rounded-lg border dark:border-accent">
      <Table className="[&_td]:px-3 [&_th]:px-3">
        <TableHeader>
          <TableRow className="table-head-fill text-xs hover:bg-transparent [&_th]:h-7 [&_th]:font-medium [&_th]:text-muted-foreground">
            <TableHead>Cihaz</TableHead>
            <TableHead>Konum</TableHead>
            <TableHead>Oluşturma</TableHead>
            <TableHead>Güncelleme</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow
              key={r.id}
              className="group table-zebra hover:bg-transparent"
            >
              <TableCell className="font-medium">
                {/* İşaret adın solunda, diğer satırların adlarıyla aynı
                    hizada; yalnız bu satırın adı sağa kayar. */}
                <span className="flex items-center gap-1.5">
                  {r.isCurrent ? <CurrentDeviceMark /> : null}
                  {r.deviceLabel}
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
                      hitArea
                      className="sm:opacity-0 sm:group-hover:opacity-100 sm:aria-expanded:opacity-100"
                    >
                      <RiMoreLine />
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

/**
 * Şu an kullanılan cihazın oturumu: "Bu cihaz" yazılı rozet yerine halkalı
 * küçük bir nokta. Açıklaması fareyle üstüne gelince, dokunmatikte
 * dokununca, klavyede odaklanıp Enter'la açılır.
 */
function CurrentDeviceMark() {
  const [open, setOpen] = React.useState(false)
  // Fareyle tıklamak açık/kapalıyı çevirmesin: üstüne gelince zaten açık,
  // tıklama onu kapatıyordu.
  const pointerType = React.useRef<string | null>(null)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Şu an kullandığın cihaz"
          onPointerDown={(e) => {
            pointerType.current = e.pointerType
          }}
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse") setOpen(true)
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") setOpen(false)
          }}
          onClick={(e) => {
            if (pointerType.current === "mouse") e.preventDefault()
            pointerType.current = null
          }}
          // Ana renkte dolu nokta ve çevresinde soluk halka (onay simgesiyle
          // aynı renk dili). Görünen 14px; dokunma alanı after ile 30px'e açılır.
          className="relative inline-flex size-3.5 shrink-0 items-center justify-center rounded-full outline-none after:absolute after:-inset-2 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="size-2 rounded-full bg-primary ring-3 ring-primary/20" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        // Yalnız bir açıklama: odak tetikleyicide kalsın.
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="pointer-events-none w-auto px-2.5 py-1.5 text-xs font-medium"
      >
        Şu an kullandığın cihaz
      </PopoverContent>
    </Popover>
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
