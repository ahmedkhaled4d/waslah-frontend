import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './auth-context'
import { FullPageSpinner } from '@/components/common/loading'

export function RequireAuth() {
  const { user, loading, resumeAfterLogin } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageSpinner />
  if (!user)
    return (
      <Navigate to="/login" replace state={resumeAfterLogin ? { from: location.pathname + location.search } : undefined} />
    )
  return <Outlet />
}

/** Only admins and supervisors may enter. Others are bounced to the inbox. */
export function RequireManager() {
  const { isManager } = useAuth()
  if (!isManager) return <Navigate to="/inbox" replace />
  return <Outlet />
}

export function RequireAdmin() {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/settings" replace />
  return <Outlet />
}
