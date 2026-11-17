import { useState } from 'react'
import { ArrowLeft, ArrowRightLeft, Check, ChevronDown, Info, UserRoundCheck, UserRoundX } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { useAssignConversation, useMoveConversation, useSetConversationStatus } from '@/api/conversations'
import { useInboxes } from '@/api/inboxes'
import { useUserDirectory } from '@/api/users'
import { useAuth } from '@/auth/auth-context'
import { ContactAvatar } from '@/components/common/avatars'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { errorMessage } from '@/lib/api'
import { contactHandle } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Conversation, ConversationStatus } from '@/types/api'

const STATUS_STYLES: Record<ConversationStatus, string> = {
  open: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  resolved: 'bg-muted text-muted-foreground',
}
const STATUS_DOT: Record<ConversationStatus, string> = {
  open: 'bg-emerald-500',
  pending: 'bg-amber-500',
  resolved: 'bg-muted-foreground/50',
}

export function ConversationHeader({
  conversation,
  onToggleDetails,
  detailsOpen,
}: {
  conversation: Conversation
  onToggleDetails: () => void
  detailsOpen: boolean
}) {
  const [params] = useSearchParams()
  const { data: inboxes } = useInboxes()
  const inbox = inboxes?.find((i) => i._id === conversation.inboxId)
  return (
    <div className="flex items-center gap-2 border-b px-3 py-2">
      <Button variant="ghost" size="icon-sm" asChild className="md:hidden" aria-label="Back to list">
        <Link to={{ pathname: '/inbox', search: params.toString() }}>
          <ArrowLeft />
        </Link>
      </Button>
      <ContactAvatar contactId={conversation.contactId} className="size-8" />
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-sm font-semibold">{contactHandle(conversation.contactId)}</div>
        <div className="flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
          {inbox ? (
            <>
              <span className="size-1.5 rounded-full" style={{ backgroundColor: inbox.color }} />
              {inbox.name}
            </>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <AssignMenu conversation={conversation} />
        <StatusMenu conversation={conversation} />
        <MoveMenu conversation={conversation} />
        <Button
          variant={detailsOpen ? 'secondary' : 'ghost'}
          size="icon-sm"
          onClick={onToggleDetails}
          aria-label="Toggle details"
          aria-pressed={detailsOpen}
        >
          <Info />
        </Button>
      </div>
    </div>
  )
}

export function AssignMenu({ conversation, size = 'sm' }: { conversation: Conversation; size?: 'sm' | 'xs' }) {
  const { user, isManager } = useAuth()
  const { users, nameOf } = useUserDirectory()
  const { data: inboxes } = useInboxes()
  const assign = useAssignConversation()
  if (!user) return null

  const inbox = inboxes?.find((i) => i._id === conversation.inboxId)
  const members = isManager ? users.filter((u) => u.status === 'active' && inbox?.memberIds.includes(u._id)) : []
  const mine = conversation.assigneeId === user._id
  const unassigned = conversation.assigneeId === null

  function run(assigneeId: string | null) {
    assign.mutate(
      { id: conversation._id, assigneeId },
      { onError: (error) => toast.error(errorMessage(error, 'Could not update the assignee')) },
    )
  }

  // Agents only get claim / release; no need for a menu.
  if (!isManager) {
    if (unassigned)
      return (
        <Button variant="outline" size={size} onClick={() => run(user._id)} disabled={assign.isPending}>
          <UserRoundCheck /> Claim
        </Button>
      )
    if (mine)
      return (
        <Button variant="outline" size={size} onClick={() => run(null)} disabled={assign.isPending}>
          <UserRoundX /> Release
        </Button>
      )
    return (
      <span className="truncate rounded-md border px-2 py-1 text-xs text-muted-foreground">
        {nameOf(conversation.assigneeId)}
      </span>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size} disabled={assign.isPending} className="max-w-44">
          <span className="truncate">{nameOf(conversation.assigneeId)}</span>
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Assign to</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => run(null)}>
          <Check className={cn(unassigned ? 'opacity-100' : 'opacity-0')} /> Unassigned
        </DropdownMenuItem>
        {inbox && !inbox.memberIds.includes(user._id) ? null : (
          <DropdownMenuItem onSelect={() => run(user._id)}>
            <Check className={cn(mine ? 'opacity-100' : 'opacity-0')} /> Me
          </DropdownMenuItem>
        )}
        {members.length > 0 ? <DropdownMenuSeparator /> : null}
        {members
          .filter((m) => m._id !== user._id)
          .map((member) => (
            <DropdownMenuItem key={member._id} onSelect={() => run(member._id)}>
              <Check className={cn(conversation.assigneeId === member._id ? 'opacity-100' : 'opacity-0')} />
              <span className="truncate">{member.name}</span>
            </DropdownMenuItem>
          ))}
        {members.length === 0 ? (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            No members in {inbox?.name ?? 'this inbox'}. Add members in Settings → Inboxes.
          </div>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function StatusMenu({ conversation, size = 'sm' }: { conversation: Conversation; size?: 'sm' | 'xs' }) {
  const setStatus = useSetConversationStatus()
  function run(status: ConversationStatus) {
    if (status === conversation.status) return
    setStatus.mutate(
      { id: conversation._id, status },
      { onError: (error) => toast.error(errorMessage(error, 'Could not change the status')) },
    )
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size} disabled={setStatus.isPending} className="capitalize">
          <span className={cn('size-2 rounded-full', STATUS_DOT[conversation.status])} />
          {conversation.status}
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(['open', 'pending', 'resolved'] as const).map((status) => (
          <DropdownMenuItem key={status} onSelect={() => run(status)} className="capitalize">
            <Check className={cn(conversation.status === status ? 'opacity-100' : 'opacity-0')} />
            {status}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MoveMenu({ conversation }: { conversation: Conversation }) {
  const { isManager } = useAuth()
  const { data: inboxes } = useInboxes()
  const move = useMoveConversation()
  const [open, setOpen] = useState(false)
  if (!isManager) return null
  const targets = (inboxes ?? []).filter((i) => i._id !== conversation.inboxId)
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Move to another inbox" disabled={move.isPending}>
          <ArrowRightLeft />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Move to inbox</DropdownMenuLabel>
        {targets.length === 0 ? (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">No other inboxes.</div>
        ) : (
          targets.map((inbox) => (
            <DropdownMenuItem
              key={inbox._id}
              onSelect={() =>
                move.mutate(
                  { id: conversation._id, inboxId: inbox._id },
                  {
                    onSuccess: () => toast.success(`Moved to ${inbox.name}`),
                    onError: (error) => toast.error(errorMessage(error, 'Could not move the conversation')),
                  },
                )
              }
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: inbox.color }} />
              {inbox.name}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function StatusBadge({ status }: { status: ConversationStatus }) {
  return <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium capitalize', STATUS_STYLES[status])}>{status}</span>
}
