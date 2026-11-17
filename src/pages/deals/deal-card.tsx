import { CalendarDays, MessageSquare } from 'lucide-react'
import { useLabelMap } from '@/api/labels'
import { useNow } from '@/hooks/use-now'
import { useUserDirectory } from '@/api/users'
import { UserAvatar } from '@/components/common/avatars'
import { LabelChip } from '@/components/common/label-chip'
import { contactHandle, formatDate, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Deal } from '@/types/api'

export function DealCard({
  deal,
  onOpen,
  draggable = false,
  onDragStart,
  className,
}: {
  deal: Deal
  onOpen: () => void
  draggable?: boolean
  onDragStart?: (event: React.DragEvent<HTMLButtonElement>) => void
  className?: string
}) {
  const labelMap = useLabelMap()
  const { byId } = useUserDirectory()
  const owner = deal.ownerId ? byId.get(deal.ownerId) : undefined
  const now = useNow()
  const overdue = deal.status === 'open' && deal.expectedCloseDate && new Date(deal.expectedCloseDate).getTime() < now

  return (
    <button
      type="button"
      onClick={onOpen}
      draggable={draggable}
      onDragStart={onDragStart}
      className={cn(
        'w-full rounded-lg border bg-card p-2.5 text-left text-sm shadow-xs transition-colors hover:border-ring/60 hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
        draggable && 'cursor-grab active:cursor-grabbing',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="line-clamp-2 font-medium">{deal.title}</span>
        <span className="shrink-0 text-xs font-semibold tabular-nums">{formatMoney(deal.value, deal.currency)}</span>
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{contactHandle(deal.contactId)}</div>
      {deal.labelIds.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {deal.labelIds.map((id) => {
            const label = labelMap.get(id)
            return label ? <LabelChip key={id} label={label} size="xs" /> : null
          })}
        </div>
      ) : null}
      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        {deal.expectedCloseDate ? (
          <span className={cn('inline-flex items-center gap-1', overdue && 'text-destructive')}>
            <CalendarDays className="size-3" />
            {formatDate(deal.expectedCloseDate)}
          </span>
        ) : null}
        {deal.conversationId ? <MessageSquare className="size-3" aria-label="Linked conversation" /> : null}
        <span className="ml-auto">
          {owner ? <UserAvatar name={owner.name} className="size-5" /> : deal.ownerId ? <UserAvatar name={deal.ownerId.slice(-2)} className="size-5" /> : null}
        </span>
      </div>
    </button>
  )
}
