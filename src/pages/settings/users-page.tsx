import { useState, type FormEvent } from 'react'
import { KeyRound, Pencil, Plus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateUser, useUpdateUser, useUsers } from '@/api/users'
import { useAuth } from '@/auth/auth-context'
import { UserAvatar } from '@/components/common/avatars'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { FormField } from '@/components/common/form-field'
import { CenteredSpinner, Spinner } from '@/components/common/loading'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useFormErrors } from '@/hooks/use-form-errors'
import { errorMessage } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import type { Role, User } from '@/types/api'

const ROLES: Role[] = ['agent', 'supervisor', 'admin']

export function UsersPage() {
  const { user: me } = useAuth()
  const query = useUsers()
  const update = useUpdateUser()
  const [editing, setEditing] = useState<User | null | 'new'>(null)
  const [resetting, setResetting] = useState<User | null>(null)

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Users"
        description="Admins manage accounts. Disabled users can't sign in; their existing session ends within 12 hours."
        actions={
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus /> New user
          </Button>
        }
      />
      {query.isLoading ? (
        <CenteredSpinner />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState icon={Users} title="No users" />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(query.data ?? []).map((u) => {
                const isSelf = u._id === me?._id
                return (
                  <TableRow key={u._id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserAvatar name={u.name} />
                        <div className="leading-tight">
                          <div className="font-medium">
                            {u.name}
                            {isSelf ? <span className="ml-1 text-xs text-muted-foreground">(you)</span> : null}
                          </div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'admin' ? 'default' : u.role === 'supervisor' ? 'secondary' : 'outline'} className="capitalize">
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'}</TableCell>
                    <TableCell>
                      <Switch
                        checked={u.status === 'active'}
                        disabled={isSelf || update.isPending}
                        aria-label={`${u.status === 'active' ? 'Disable' : 'Enable'} ${u.name}`}
                        onCheckedChange={(checked) =>
                          update.mutate(
                            { id: u._id, input: { status: checked ? 'active' : 'disabled' } },
                            { onError: (error) => toast.error(errorMessage(error)) },
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${u.name}`} onClick={() => setEditing(u)}>
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Reset password for ${u.name}`} onClick={() => setResetting(u)}>
                        <KeyRound />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog open={editing !== null} onOpenChange={(open) => (open ? undefined : setEditing(null))}>
        {editing !== null ? <UserForm user={editing === 'new' ? null : editing} isSelf={editing !== 'new' && editing._id === me?._id} onDone={() => setEditing(null)} /> : null}
      </Dialog>
      <Dialog open={resetting !== null} onOpenChange={(open) => (open ? undefined : setResetting(null))}>
        {resetting ? <ResetPasswordForm user={resetting} onDone={() => setResetting(null)} /> : null}
      </Dialog>
    </div>
  )
}

function UserForm({ user, isSelf, onDone }: { user: User | null; isSelf: boolean; onDone: () => void }) {
  const create = useCreateUser()
  const update = useUpdateUser()
  const { formError, fieldErrors, reset, capture } = useFormErrors()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>(user?.role ?? 'agent')
  const pending = create.isPending || update.isPending

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    reset()
    try {
      if (user) {
        await update.mutateAsync({ id: user._id, input: { name: name.trim(), ...(isSelf ? {} : { role }) } })
      } else {
        await create.mutateAsync({ name: name.trim(), email: email.trim(), password, role })
      }
      toast.success(user ? 'User updated' : 'User created')
      onDone()
    } catch (error) {
      capture(error)
    }
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{user ? 'Edit user' : 'New user'}</DialogTitle>
        <DialogDescription>
          {user ? 'Email addresses cannot be changed.' : 'Share the password with the user; they can change it after signing in.'}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <FormField label="Name" htmlFor="user-name" error={fieldErrors['name']}>
          <Input id="user-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required autoFocus />
        </FormField>
        <FormField label="Email" htmlFor="user-email" error={fieldErrors['email']}>
          <Input id="user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} readOnly={Boolean(user)} className={user ? 'bg-muted' : undefined} required />
        </FormField>
        {!user ? (
          <FormField label="Password" htmlFor="user-password" error={fieldErrors['password']} hint="At least 8 characters">
            <Input id="user-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          </FormField>
        ) : null}
        <FormField label="Role" htmlFor="user-role" error={fieldErrors['role']} hint={isSelf ? 'You cannot change your own role.' : undefined}>
          <Select value={role} onValueChange={(v) => setRole(v as Role)} disabled={isSelf}>
            <SelectTrigger id="user-role" className="w-full capitalize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r} className="capitalize">
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        {formError ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending || !name.trim() || !email.trim() || (!user && password.length < 8)}>
            {pending ? <Spinner className="text-current" /> : null}
            {user ? 'Save' : 'Create user'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

function ResetPasswordForm({ user, onDone }: { user: User; onDone: () => void }) {
  const update = useUpdateUser()
  const { formError, fieldErrors, reset, capture } = useFormErrors()
  const [password, setPassword] = useState('')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    reset()
    try {
      await update.mutateAsync({ id: user._id, input: { password } })
      toast.success(`Password reset for ${user.name}`)
      onDone()
    } catch (error) {
      capture(error)
    }
  }

  return (
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>Reset password</DialogTitle>
        <DialogDescription>Set a new password for {user.name}. Their current sessions stay valid until they expire.</DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <FormField label="New password" htmlFor="reset-password" error={fieldErrors['password']} hint="At least 8 characters">
          <Input id="reset-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required autoFocus />
        </FormField>
        {formError ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" disabled={update.isPending || password.length < 8}>
            {update.isPending ? <Spinner className="text-current" /> : null}
            Reset password
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
