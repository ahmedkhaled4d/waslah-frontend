import { NavLink, useNavigate } from 'react-router'
import { Inbox, KanbanSquare, LogOut, MessageCircle, Moon, Settings, Sun, UserRound } from 'lucide-react'
import { useAuth } from '@/auth/auth-context'
import { useTheme } from '@/hooks/use-theme'
import { UserAvatar } from '@/components/common/avatars'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  { to: '/deals', label: 'Deals', icon: KanbanSquare },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 px-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <MessageCircle className="size-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Waslah</div>
          <div className="text-[11px] text-muted-foreground">WhatsApp CRM</div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-2 py-2">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
              )
            }
          >
            <item.icon className="size-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-auto w-full justify-start gap-2.5 px-2 py-1.5">
              <UserAvatar name={user?.name ?? '?'} />
              <div className="min-w-0 flex-1 text-left leading-tight">
                <div className="truncate text-sm font-medium">{user?.name}</div>
                <div className="truncate text-[11px] text-muted-foreground capitalize">{user?.role}</div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-56">
            <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                onNavigate?.()
                void navigate('/settings/profile')
              }}
            >
              <UserRound /> Profile & password
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={toggle}>
              {theme === 'dark' ? <Sun /> : <Moon />}
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                logout()
                void navigate('/login', { replace: true })
              }}
            >
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
