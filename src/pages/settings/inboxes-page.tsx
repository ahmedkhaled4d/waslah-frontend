import { useState, type FormEvent } from 'react'
import { Inbox as InboxIcon, Pencil, Plus, Star, Trash2, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  useAddInboxMembers,
  useCreateInbox,
  useDeleteInbox,
  useInboxes,
  useRemoveInboxMember,
  useUpdateInbox,
} from '@/api/inboxes'
import { useUsers } from '@/api/users'
import { UserAvatar } from '@/components/common/avatars'
import { ColorPicker } from '@/components/common/color-picker'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { FormField } from '@/components/common/form-field'
import { CenteredSpinner, Spinner } from '@/components/common/loading'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useFormErrors } from '@/hooks/use-form-errors'
import { ApiError, errorMessage } from '@/lib/api'
import { PALETTE } from '@/lib/colors'
import type { Inbox, User } from '@/types/api'

export function InboxesPage() {
  const query = useInboxes()
  const usersQuery = useUsers()
  const remove = useDeleteInbox()
  const update = useUpdateInbox()
  const [editing, setEditing] = useState<Inbox | null | 'new'>(null)
  const [deleting, setDeleting] = useState<Inbox | null>(null)
  const users = usersQuery.data ?? []
  const userById = new Map(users.map((u) => [u._id, u]))

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Inboxes"
        description="Team inboxes decide who sees which conversations. New chats land in the default inbox."
        actions={
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus /> New inbox
          </Button>
        }
      />
      {query.isLoading ? (
        <CenteredSpinner />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState icon={InboxIcon} title="No inboxes" description="The General inbox is created automatically with the first message." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {(query.data ?? []).map((inbox) => (
            <Card key={inbox._id} className="gap-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="size-3 rounded-full" style={{ backgroundColor: inbox.color }} />
                  <span className="truncate">{inbox.name}</span>
                  {inbox.isDefault ? (
                    <Badge variant="secondary" className="gap-1">
                      <Star className="size-3" /> Default
                    </Badge>
                  ) : null}
                </CardTitle>
                {inbox.description ? <CardDescription>{inbox.description}</CardDescription> : null}
                <div className="col-start-2 row-span-2 row-start-1 flex gap-0.5 self-start justify-self-end">
                  {!inbox.isDefault ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Make default"
                      title="Make default"
                      disabled={update.isPending}
                      onClick={() =>
                        update.mutate(
                          { id: inbox._id, input: { isDefault: true } },
                          { onSuccess: () => toast.success(`${inbox.name} is now the default inbox`), onError: (e) => toast.error(errorMessage(e)) },
                        )
                      }
                    >
                      <Star />
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="icon-sm" aria-label="Edit inbox" onClick={() => setEditing(inbox)}>
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Delete inbox" onClick={() => setDeleting(inbox)}>
                    <Trash2 />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <MembersEditor inbox={inbox} users={users} userById={userById} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={editing !== null} onOpenChange={(open) => (open ? undefined : setEditing(null))}>
        {editing !== null ? <InboxForm inbox={editing === 'new' ? null : editing} users={users} onDone={() => setEditing(null)} /> : null}
      </Dialog>
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => (open ? undefined : setDeleting(null))}
        title={`Delete “${deleting?.name}”?`}
        description="Only inboxes without conversations can be deleted."
        confirmLabel="Delete"
        destructive
        pending={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting._id, {
            onSuccess: () => {
              setDeleting(null)
              toast.success('Inbox deleted')
            },
            onError: (error) =>
              toast.error(
                error instanceof ApiError && error.status === 409
                  ? 'This inbox still has conversations. Move them first.'
                  : errorMessage(error),
              ),
          })
        }
      />
    </div>
  )
}

function MembersEditor({ inbox, users, userById }: { inbox: Inbox; users: User[]; userById: Map<string, User> }) {
  const add = useAddInboxMembers()
  const remove = useRemoveInboxMember()
  const [open, setOpen] = useState(false)
  const candidates = users.filter((u) => u.status === 'active' && !inbox.memberIds.includes(u._id))
  const onError = (error: unknown) => toast.error(errorMessage(error))

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Members · {inbox.memberIds.length}</span>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="xs" disabled={add.isPending}>
              <UserPlus /> Add
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-0" align="end">
            <Command>
              <CommandInput placeholder="Search users…" />
              <CommandList>
                <CommandEmpty>Everyone is already a member.</CommandEmpty>
                <CommandGroup>
                  {candidates.map((u) => (
                    <CommandItem
                      key={u._id}
                      value={`${u.name} ${u.email}`}
                      onSelect={() => {
                        setOpen(false)
                        add.mutate({ id: inbox._id, memberIds: [u._id] }, { onError })
                      }}
                    >
                      <UserAvatar name={u.name} className="size-6" />
                      <span className="flex-1 truncate">{u.name}</span>
                      <span className="text-[10px] text-muted-foreground capitalize">{u.role}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      {inbox.memberIds.length === 0 ? (
        <p className="text-xs text-muted-foreground">No members yet. Agents only see inboxes they belong to.</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {inbox.memberIds.map((id) => {
            const u = userById.get(id)
            return (
              <li key={id} className="inline-flex items-center gap-1.5 rounded-full border py-0.5 pr-1 pl-0.5 text-xs">
                <UserAvatar name={u?.name ?? id.slice(-2)} className="size-5" />
                <span className="max-w-32 truncate">{u?.name ?? `User ${id.slice(-4)}`}</span>
                <button
                  type="button"
                  aria-label={`Remove ${u?.name ?? 'member'}`}
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate({ id: inbox._id, userId: id }, { onError })}
                >
                  <X className="size-3" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function InboxForm({ inbox, users, onDone }: { inbox: Inbox | null; users: User[]; onDone: () => void }) {
  const create = useCreateInbox()
  const update = useUpdateInbox()
  const { formError, fieldErrors, reset, capture } = useFormErrors()
  const [name, setName] = useState(inbox?.name ?? '')
  const [description, setDescription] = useState(inbox?.description ?? '')
  const [color, setColor] = useState(inbox?.color ?? PALETTE[8])
  const [memberIds, setMemberIds] = useState<string[]>([])
  const pending = create.isPending || update.isPending

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    reset()
    try {
      if (inbox) {
        await update.mutateAsync({ id: inbox._id, input: { name: name.trim(), description: description.trim() || undefined, color } })
      } else {
        await create.mutateAsync({ name: name.trim(), description: description.trim() || undefined, color, memberIds })
      }
      toast.success(inbox ? 'Inbox updated' : 'Inbox created')
      onDone()
    } catch (error) {
      capture(error)
    }
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{inbox ? 'Edit inbox' : 'New inbox'}</DialogTitle>
        <DialogDescription>Inbox names must be unique.</DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <FormField label="Name" htmlFor="inbox-name" error={fieldErrors['name']}>
          <Input id="inbox-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required autoFocus />
        </FormField>
        <FormField label="Description" htmlFor="inbox-desc" error={fieldErrors['description']}>
          <Input id="inbox-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} />
        </FormField>
        <FormField label="Color" error={fieldErrors['color']}>
          <ColorPicker value={color} onChange={setColor} />
        </FormField>
        {!inbox ? (
          <FormField label="Initial members" error={fieldErrors['memberIds']}>
            <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-md border p-2">
              {users.filter((u) => u.status === 'active').length === 0 ? (
                <span className="text-xs text-muted-foreground">No users yet.</span>
              ) : (
                users
                  .filter((u) => u.status === 'active')
                  .map((u) => {
                    const checked = memberIds.includes(u._id)
                    return (
                      <label key={u._id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-accent/60">
                        <input
                          type="checkbox"
                          className="accent-primary"
                          checked={checked}
                          onChange={(e) =>
                            setMemberIds((ids) => (e.target.checked ? [...ids, u._id] : ids.filter((id) => id !== u._id)))
                          }
                        />
                        <span className="flex-1 truncate">{u.name}</span>
                        <span className="text-[10px] text-muted-foreground capitalize">{u.role}</span>
                      </label>
                    )
                  })
              )}
            </div>
          </FormField>
        ) : null}
        {formError ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending || !name.trim()}>
            {pending ? <Spinner className="text-current" /> : null}
            {inbox ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
