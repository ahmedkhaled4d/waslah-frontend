import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/auth/auth-context'
import { TooltipProvider } from '@/components/ui/tooltip'
import { applyTheme } from '@/hooks/use-theme'
import { ApiError } from '@/lib/api'
import { App } from './App'
import './index.css'

applyTheme()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => {
        // Client errors won't succeed on retry; network blips and 5xx get one more attempt.
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
        return failureCount < 1
      },
    },
    mutations: { retry: false },
  },
})

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Missing #root element')

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <App />
        </TooltipProvider>
        <Toaster position="bottom-right" richColors closeButton />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
