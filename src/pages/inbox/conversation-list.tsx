import { NavLink, useSearchParams } from 'react-router'
import { Inbox as InboxIcon } from 'lucide-react'
import { useConversations } from '@/api/conversations'
import { useInboxes } from '@/api/inboxes'
import { useLabelMap } from '@/api/labels'
import { useUserDirectory } from '@/api/users'
import { useAuth } from '@/auth/auth-context'
import { ContactAvatar } from '@/components/common/avatars'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { CenteredSpinner, Spinner } from '@/components/common/loading'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { contactHandle, formatListTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/types/api'
import { toQuery, useInboxFilters, type StatusFilter } from './inbox-filters'

const ALL = '__all__'

export function ConversationList({ activeId }: { activeId?: string }) {
  const [filters, setFilters] = useInboxFilters()
  const [params] = useSearchParams()
  const { isManager } = useAuth()
  const { data: inboxes } = useInboxes()
  const { users } = useUserDirectory()
  const labelMap = useLabelMap()
  const query = useConversations(toQuery(filters))

  const conversations = query.data?.pages.flatMap((page) => page.data) ?? []
  const inboxById = new Map((inboxes ?? []).map((inbox) => [inbox._id, inbox]))
  const search = params.toString()

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Inbox</h2>
          {query.isFetching && !query.isLoading ? <Spinner className="size-3.5" /> : null}
        </div>
        <Select value={filters.inboxId ?? ALL} onValueChange={(v) => setFilters({ inboxId: v === ALL ? undefined : v })}>
          <SelectTrigger size="sm" className="w-full" aria-label="Inbox">
            <SelectValue placeholder="All inboxes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All inboxes</SelectItem>
            {(inboxes ?? []).map((inbox) => (
              <SelectItem key={inbox._id} value={inbox._id}>
                <span className="size-2 rounded-full" style={{ backgroundColor: inbox.color }} />
                {inbox.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={filters.assignee ?? ALL}
            onValueChange={(v) => setFilters({ assignee: v === ALL ? undefined : v })}
          >
            <SelectTrigger size="sm" className="w-full" aria-label="Assignee">
              <SelectValue placeholder="Anyone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Anyone</SelectItem>
              <SelectItem value="me">Mine</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {isManager && users.length > 0 ? (
                <>
                  {users.map((u) => (
                    <SelectItem key={u._id} value={u._id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </>
              ) : null}
            </SelectContent>
          </Select>
          <Select value={filters.labelId ?? ALL} onValueChange={(v) => setFilters({ labelId: v === ALL ? undefined : v })}>
            <SelectTrigger size="sm" className="w-full" aria-label="Label">
              <SelectValue placeholder="Any label" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any label</SelectItem>
              {[...labelMap.values()].map((label) => (
                <SelectItem key={label._id} value={label._id}>
                  <span className="size-2 rounded-full" style={{ backgroundColor: label.color }} />
                  {label.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Tabs value={filters.status} onValueChange={(v) => setFilters({ status: v as StatusFilter })}>
          <TabsList className="w-full">
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {query.isLoading ? (
          <CenteredSpinner />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={InboxIcon}
            title="No conversations"
            description="Conversations appear here when customers message your WhatsApp number."
          />
        ) : (
          <ul className="divide-y">
            {conversations.map((conversation) => (
              <ConversationRow
                key={conversation._id}
                conversation={conversation}
                active={conversation._id === activeId}
                inboxName={inboxById.get(conversation.inboxId)?.name}
                inboxColor={inboxById.get(conversation.inboxId)?.color}
                labelColors={conversation.labelIds.map((id) => labelMap.get(id)?.color).filter(Boolean) as string[]}
                search={search}
              />
            ))}
          </ul>
        )}
        {query.hasNextPage ? (
          <div className="p-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              {query.isFetchingNextPage ? <Spinner /> : null}
              Load more
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ConversationRow({
  conversation,
  active,
  inboxName,
  inboxColor,
  labelColors,
  search,
}: {
  conversation: Conversation
  active: boolean
  inboxName?: string
  inboxColor?: string
  labelColors: string[]
  search: string
}) {
  const unread = conversation.unreadCount > 0
  return (
    <li>
      <NavLink
        to={{ pathname: `/inbox/${conversation._id}`, search }}
        className={cn(
          'flex gap-3 px-3 py-2.5 transition-colors hover:bg-accent/60',
          active && 'bg-accent',
        )}
      >
        <ContactAvatar contactId={conversation.contactId} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className={cn('truncate text-sm', unread ? 'font-semibold' : 'font-medium')}>
              {contactHandle(conversation.contactId)}
            </span>
            <span className="shrink-0 text-[11px] text-muted-foreground">{formatListTime(conversation.lastMessageAt)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className={cn('truncate text-xs', unread ? 'text-foreground' : 'text-muted-foreground')}>
              {conversation.lastMessagePreview || 'No messages yet'}
            </p>
            {unread ? (
              <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            {inboxName ? (
              <span className="inline-flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                <span className="size-1.5 rounded-full" style={{ backgroundColor: inboxColor }} />
                {inboxName}
              </span>
            ) : null}
            {conversation.status !== 'open' ? (
              <span className="rounded bg-muted px-1 text-[10px] text-muted-foreground capitalize">{conversation.status}</span>
            ) : null}
            {!conversation.assigneeId ? (
              <span className="rounded bg-amber-500/15 px-1 text-[10px] text-amber-700 dark:text-amber-400">Unassigned</span>
            ) : null}
            {labelColors.length > 0 ? (
              <span className="ml-auto flex items-center gap-0.5">
                {labelColors.slice(0, 4).map((color, i) => (
                  <span key={i} className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
                ))}
              </span>
            ) : null}
          </div>
        </div>
      </NavLink>
    </li>
  )
}
