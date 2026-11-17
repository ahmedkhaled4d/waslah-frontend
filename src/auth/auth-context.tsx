/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { ApiError, onUnauthorized, tokenStore } from '@/lib/api'
import type { Role, User } from '@/types/api'

export const MANAGER_ROLES: readonly Role[] = ['admin', 'supervisor']

interface AuthState {
  user: User | null
  /** True until the stored token has been validated against /v1/auth/me. */
  loading: boolean
  isManager: boolean
  isAdmin: boolean
  /** Whether the login page should return the user to the page they were on. False after an explicit sign-out. */
  resumeAfterLogin: boolean
  login: (email: string, password: string) => Promise<User>
  logout: (options?: { resume?: boolean }) => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(() => tokenStore.get() !== null)
  const [resumeAfterLogin, setResumeAfterLogin] = useState(true)

  const logout = useCallback(
    (options?: { resume?: boolean }) => {
      setResumeAfterLogin(options?.resume ?? false)
      tokenStore.clear()
      setUser(null)
      qc.clear()
    },
    [qc],
  )

  // Session expiry (401) should bring the user back to where they were after signing in again.
  useEffect(() => onUnauthorized(() => logout({ resume: true })), [logout])

  useEffect(() => {
    if (tokenStore.get() === null) return
    let cancelled = false
    authApi
      .me()
      .then((me) => {
        if (!cancelled) setUser(me)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) tokenStore.clear()
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password)
    tokenStore.set(result.token, result.expiresAt)
    setUser(result.user)
    return result.user
  }, [])

  const refreshUser = useCallback(async () => {
    const me = await authApi.me()
    setUser(me)
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      resumeAfterLogin,
      isManager: user ? MANAGER_ROLES.includes(user.role) : false,
      isAdmin: user?.role === 'admin',
      login,
      logout,
      refreshUser,
    }),
    [user, loading, resumeAfterLogin, login, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
