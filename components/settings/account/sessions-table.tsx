"use client"

import * as React from "react"
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiMoreLine,
} from "@remixicon/react"

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

// Sayfa başına oturum. Oturumlar ancak kapatılınca listeden düşüyor; uzun
// süredir kullanılan bir hesapta liste uzar ve Ayarlar penceresini doldururdu.
const PAGE_SIZE = 5

// Aktif cihaz oturumları. Mount'ta listSessions ile yüklenir; masaüstünde tablo,
// mobilde kart listesi gösterir. Satır eylem menüsündeki üç-nokta (no-icon
// kuralının istisnası) ile bir oturum uzaktan kapatılabilir.
export function SessionsTable() {
  const [rows, setRows] = React.useState<SessionRow[] | null>(null)
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">(
    "loading",
  )
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(0)

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

  // Oturum kapatılıp son sayfa boşalırsa bir önceki sayfaya düş.
  const pageCount = Math.ceil(rows.length / PAGE_SIZE)
  const current = Math.min(page, pageCount - 1)
  const start = current * PAGE_SIZE
  const pageRows = rows.slice(start, start + PAGE_SIZE)

  return (
    <SessionsFrame
      footer={
        pageCount > 1 ? (
          <nav
            aria-label="Oturum sayfaları"
            className="flex flex-1 items-center justify-between gap-3"
          >
            <span className="tabular-nums">
              {start + 1}–{start + pageRows.length} / {rows.length} oturum
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-xs"
                hitArea
                aria-label="Önceki sayfa"
                disabled={current === 0}
                onClick={() => setPage(current - 1)}
              >
                <RiArrowLeftSLine className="size-4" />
              </Button>
              <span className="min-w-10 text-center tabular-nums">
                {current + 1} / {pageCount}
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                hitArea
                aria-label="Sonraki sayfa"
                disabled={current >= pageCount - 1}
                onClick={() => setPage(current + 1)}
              >
                <RiArrowRightSLine className="size-4" />
              </Button>
            </div>
          </nav>
        ) : null
      }
    >
      <TableBody>
        {pageRows.map((r) => (
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
    </SessionsFrame>
  )
}

/**
 * Tablonun çerçevesi ve başlığı; gerçek liste ile yükleme iskeleti aynısını
 * kullanır, veri gelince tablo yer değiştirmez.
 *
 * Tek tablo (mobil dahil). Table'ın iç kabı overflow-x-auto olduğu için
 * taşmada yatay kaydırılır; ince, yuvarlak scrollbar tüm Ayarlar modalıyla
 * ortak `cn-scrollbar-thin-table` yardımcısından gelir (bkz. globals.css).
 * Dış çerçeve, koyu başlık şeridi ve sıra sıra değişen satır zemini: satır
 * çok olduğunda göz aynı satırda kalsın, liste değil tablo okunsun.
 * Dark'ta `--border` `--muted` ile aynı renk: çerçeve ve zebra satırlar
 * birbirine karışmasın diye çerçeve bir basamak açık (`--accent`).
 *
 * `footer` başlıkla aynı zeminde bir alt şerit; tablonun dışında durur ki
 * tablo yatay kaydırılırken sayfalama yerinde kalsın.
 */
function SessionsFrame({
  children,
  footer,
}: {
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
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
        {children}
      </Table>
      {footer ? (
        <div className="table-head-fill flex h-8 items-center border-t px-3 text-xs text-muted-foreground">
          {footer}
        </div>
      ) : null}
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
  // Gerçek tabloyla aynı çerçeve ve satır yüksekliği; hücre içerikleri iskelet.
  return (
    <SessionsFrame>
      <TableBody>
        {[0, 1, 2].map((r) => (
          <TableRow key={r} className="table-zebra hover:bg-transparent">
            <TableCell>
              <Skeleton className="h-4 w-28" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-20" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-24" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-24" />
            </TableCell>
            <TableCell>
              <Skeleton className="ml-auto size-6" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </SessionsFrame>
  )
}
