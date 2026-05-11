import { auth } from "@/auth"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ShoppingCart, Mic, Plus, Camera } from "lucide-react"

export default async function DashboardPage() {
  const session = await auth()
  const user = {
    name: session?.user?.name ?? "Kullanıcı",
    email: session?.user?.email ?? "",
    avatar: session?.user?.image ?? "",
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
          </div>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-16">
          <div className="w-full max-w-2xl flex flex-col items-center gap-6">
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
                  <button className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs bg-foreground text-background transition-opacity hover:opacity-80 disabled:opacity-40">
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
      </SidebarInset>
    </SidebarProvider>
  )
}
