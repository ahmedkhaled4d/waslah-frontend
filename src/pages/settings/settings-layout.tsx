import { NavLink, Outlet } from 'react-router'
import { useAuth } from '@/auth/auth-context'
import { cn } from '@/lib/utils'

export function SettingsLayout() {
  const { isManager, isAdmin } = useAuth()
  const items = [
    { to: '/settings/profile', label: 'Profile', show: true },
    { to: '/settings/labels', label: 'Labels', show: true },
    { to: '/settings/inboxes', label: 'Inboxes', show: isManager },
    { to: '/settings/pipelines', label: 'Pipelines', show: isManager },
    { to: '/settings/users', label: 'Users', show: isAdmin },
  ].filter((item) => item.show)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b px-4 pt-3">
        <h1 className="mb-2 text-lg font-semibold tracking-tight">Settings</h1>
        <nav className="-mb-px flex gap-4 overflow-x-auto text-sm">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'border-b-2 px-0.5 pb-2 whitespace-nowrap transition-colors',
                  isActive ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-4xl">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
