import { ShoppingCart, Mic, Plus, Camera } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 pb-16">
      <div className="flex w-full max-w-2xl flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Alışveriş listeni oluşturalım mı?
          </h1>
        </div>

        <div className="w-full rounded-2xl border bg-background shadow-sm">
          <textarea
            className="w-full resize-none bg-transparent px-5 pt-5 pb-3 text-sm placeholder:text-muted-foreground focus:outline-none"
            rows={4}
            placeholder="Alışveriş listeni yaz, senin için en iyi sepeti oluşturalım..."
          />

          <div className="flex items-center justify-between px-4 pb-4">
            <div className="flex items-center gap-1">
              <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Plus className="h-4 w-4" />
              </button>
              <button className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Camera className="h-4 w-4" />
                Fiş Yükle
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Mic className="h-4 w-4" />
              </button>
              <button className="flex h-8 items-center gap-1.5 rounded-lg bg-foreground px-2 text-xs text-background transition-opacity hover:opacity-80 disabled:opacity-40">
                <ShoppingCart className="h-4 w-4" />
                Sepeti Oluştur
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {[
            "Haftalık market listesi",
            "Kahvaltılık ürünler",
            "Temizlik malzemeleri",
            "Fiş yükle ve analiz et",
          ].map((chip) => (
            <button
              key={chip}
              className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
