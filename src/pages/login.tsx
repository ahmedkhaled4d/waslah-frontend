import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { MessageCircle } from 'lucide-react'
import { useAuth } from '@/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/common/form-field'
import { Spinner } from '@/components/common/loading'
import { useFormErrors } from '@/hooks/use-form-errors'
import { ApiError } from '@/lib/api'

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { formError, fieldErrors, reset, capture, setFormError } = useFormErrors()

  const from = (location.state as { from?: string } | null)?.from
  if (user) return <Navigate to={from && from !== '/login' ? from : '/inbox'} replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    reset()
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      void navigate(from && from !== '/login' ? from : '/inbox', { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) setFormError('Incorrect email or password.')
      else if (error instanceof ApiError && error.code === 'USER_DISABLED')
        setFormError('This account is disabled. Ask an admin to re-enable it.')
      else capture(error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <MessageCircle className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Waslah</h1>
            <p className="text-sm text-muted-foreground">Sign in to your workspace</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <FormField label="Email" htmlFor="email" error={fieldErrors['email']}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(fieldErrors['email'])}
            />
          </FormField>
          <FormField label="Password" htmlFor="password" error={fieldErrors['password']}>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(fieldErrors['password'])}
            />
          </FormField>
          {formError ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}
          <Button type="submit" disabled={submitting || !email || !password} className="w-full">
            {submitting ? <Spinner className="text-current" /> : null}
            Sign in
          </Button>
        </form>
      </div>
    </div>
  )
}
