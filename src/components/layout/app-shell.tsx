import { useState } from 'react'
import { Outlet } from 'react-router'
import { Menu } from 'lucide-react'
import { Sidebar } from './sidebar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <aside className="hidden w-60 shrink-0 border-r bg-sidebar md:flex md:flex-col">
        <Sidebar />
      </aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3 md:hidden">
          <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu />
          </Button>
          <span className="font-semibold">Waslah</span>
        </header>
        <main className="flex min-h-0 flex-1 flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
