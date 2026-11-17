import { useCallback, useSyncExternalStore } from 'react'

type Theme = 'light' | 'dark'
const KEY = 'waslah.theme'
const listeners = new Set<() => void>()

function read(): Theme {
  const stored = localStorage.getItem(KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(theme: Theme = read()) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, read, () => 'light' as Theme)
  const setTheme = useCallback((next: Theme) => {
    localStorage.setItem(KEY, next)
    applyTheme(next)
    for (const listener of listeners) listener()
  }, [])
  return { theme, setTheme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') }
}
