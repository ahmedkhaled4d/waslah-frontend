import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { RequireAdmin, RequireAuth, RequireManager } from '@/auth/require-auth'
import { AppShell } from '@/components/layout/app-shell'
import { DealsPage } from '@/pages/deals/deals-page'
import { InboxPage } from '@/pages/inbox/inbox-page'
import { LoginPage } from '@/pages/login'
import { NotFoundPage } from '@/pages/not-found'
import { InboxesPage } from '@/pages/settings/inboxes-page'
import { LabelsPage } from '@/pages/settings/labels-page'
import { PipelinesPage } from '@/pages/settings/pipelines-page'
import { ProfilePage } from '@/pages/settings/profile-page'
import { SettingsLayout } from '@/pages/settings/settings-layout'
import { UsersPage } from '@/pages/settings/users-page'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/inbox" replace />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/inbox/:conversationId" element={<InboxPage />} />
            <Route path="/deals" element={<DealsPage />} />
            <Route path="/settings" element={<SettingsLayout />}>
              <Route index element={<Navigate to="/settings/profile" replace />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="labels" element={<LabelsPage />} />
              <Route element={<RequireManager />}>
                <Route path="inboxes" element={<InboxesPage />} />
                <Route path="pipelines" element={<PipelinesPage />} />
              </Route>
              <Route element={<RequireAdmin />}>
                <Route path="users" element={<UsersPage />} />
              </Route>
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
