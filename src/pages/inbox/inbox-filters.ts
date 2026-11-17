import { useSearchParams } from 'react-router'
import type { ConversationStatus, ListConversationsQuery } from '@/types/api'

export type StatusFilter = ConversationStatus | 'all'

export interface InboxFilters {
  inboxId: string | undefined
  status: StatusFilter
  assignee: string | undefined
  labelId: string | undefined
}

const STATUSES: readonly StatusFilter[] = ['open', 'pending', 'resolved', 'all']

/** Filters live in the URL so refreshes and shared links keep them. */
export function useInboxFilters(): [InboxFilters, (patch: Partial<InboxFilters>) => void] {
  const [params, setParams] = useSearchParams()
  const rawStatus = params.get('status')
  const filters: InboxFilters = {
    inboxId: params.get('inbox') ?? undefined,
    status: STATUSES.includes(rawStatus as StatusFilter) ? (rawStatus as StatusFilter) : 'open',
    assignee: params.get('assignee') ?? undefined,
    labelId: params.get('label') ?? undefined,
  }
  function update(patch: Partial<InboxFilters>) {
    const next = { ...filters, ...patch }
    const search = new URLSearchParams()
    if (next.inboxId) search.set('inbox', next.inboxId)
    if (next.status !== 'open') search.set('status', next.status)
    if (next.assignee) search.set('assignee', next.assignee)
    if (next.labelId) search.set('label', next.labelId)
    setParams(search, { replace: true })
  }
  return [filters, update]
}

export function toQuery(filters: InboxFilters): ListConversationsQuery {
  return {
    inboxId: filters.inboxId,
    status: filters.status === 'all' ? undefined : filters.status,
    assignee: filters.assignee,
    labelId: filters.labelId,
  }
}
