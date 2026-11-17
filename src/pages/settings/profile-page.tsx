import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useChangePassword } from '@/api/auth'
import { useAuth } from '@/auth/auth-context'
import { UserAvatar } from '@/components/common/avatars'
import { FormField } from '@/components/common/form-field'
import { Spinner } from '@/components/common/loading'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useFormErrors } from '@/hooks/use-form-errors'
import { ApiError } from '@/lib/api'
import { formatDateTime } from '@/lib/format'

export function ProfilePage() {
  const { user } = useAuth()
  const change = useChangePassword()
  const { formError, fieldErrors, reset, capture, setFormError } = useFormErrors()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    reset()
    if (next !== confirm) {
      setFormError('New passwords do not match.')
      return
    }
    try {
      await change.mutateAsync({ currentPassword: current, newPassword: next })
      toast.success('Password updated')
      setCurrent('')
      setNext('')
      setConfirm('')
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) setFormError('Current password is incorrect.')
      else capture(error)
    }
  }

  if (!user) return null
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Your account</CardTitle>
          <CardDescription>Only admins can change names and roles.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <UserAvatar name={user.name} className="size-12" />
          <div className="text-sm">
            <div className="font-medium">{user.name}</div>
            <div className="text-muted-foreground">{user.email}</div>
            <div className="mt-1 text-xs text-muted-foreground capitalize">
              {user.role} · {user.lastLoginAt ? `last login ${formatDateTime(user.lastLoginAt)}` : 'first login'}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>At least 8 characters.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-3" noValidate>
            <FormField label="Current password" htmlFor="pw-current" error={fieldErrors['currentPassword']}>
              <Input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            </FormField>
            <FormField label="New password" htmlFor="pw-new" error={fieldErrors['newPassword']}>
              <Input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} minLength={8} required />
            </FormField>
            <FormField label="Confirm new password" htmlFor="pw-confirm">
              <Input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </FormField>
            {formError ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="flex justify-end">
              <Button type="submit" disabled={change.isPending || !current || next.length < 8 || !confirm}>
                {change.isPending ? <Spinner className="text-current" /> : null}
                Update password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
