import { useState } from 'react'
import { Link } from 'react-router'
import { Handshake, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useAddConversationLabel, useRemoveConversationLabel } from '@/api/conversations'
import { useDealsPage } from '@/api/deals'
import { useInboxes } from '@/api/inboxes'
import { useLabelMap } from '@/api/labels'
import { usePipelines } from '@/api/pipelines'
import { useUserDirectory } from '@/api/users'
import { ContactAvatar } from '@/components/common/avatars'
import { LabelChip } from '@/components/common/label-chip'
import { LabelPicker } from '@/components/common/label-picker'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { errorMessage } from '@/lib/api'
import { contactHandle, formatDateTime, formatMoney, formatRelative, windowState } from '@/lib/format'
import type { Conversation } from '@/types/api'
import { DealFormDialog } from '@/pages/deals/deal-form-dialog'
import { StatusBadge } from './conversation-header'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[88px_1fr] items-start gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  )
}

export function ConversationDetails({ conversation }: { conversation: Conversation }) {
  const labelMap = useLabelMap()
  const { nameOf } = useUserDirectory()
  const { data: inboxes } = useInboxes()
  const { data: pipelines } = usePipelines()
  const addLabel = useAddConversationLabel()
  const removeLabel = useRemoveConversationLabel()
  const deals = useDealsPage({ contactId: conversation.contactId })
  const [dealDialogOpen, setDealDialogOpen] = useState(false)

  const inbox = inboxes?.find((i) => i._id === conversation.inboxId)
  const window24 = windowState(conversation.lastInboundAt)
  const contactDeals = deals.data?.pages.flatMap((p) => p.data) ?? []
  const onError = (error: unknown) => toast.error(errorMessage(error))

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex flex-col items-center gap-2 p-4 text-center">
        <ContactAvatar contactId={conversation.contactId} className="size-14 text-base" />
        <div>
          <div className="text-sm font-semibold">{contactHandle(conversation.contactId)}</div>
          <div className="text-[11px] text-muted-foreground">Contact profiles arrive with the contacts API</div>
        </div>
        <StatusBadge status={conversation.status} />
      </div>
      <Separator />
      <section className="space-y-2 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Labels</h3>
          <LabelPicker
            selectedIds={conversation.labelIds}
            onAdd={(labelId) => addLabel.mutate({ id: conversation._id, labelId }, { onError })}
            onRemove={(labelId) => removeLabel.mutate({ id: conversation._id, labelId }, { onError })}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {conversation.labelIds.length === 0 ? <span className="text-xs text-muted-foreground">No labels</span> : null}
          {conversation.labelIds.map((id) => {
            const label = labelMap.get(id)
            if (!label) return null
            return (
              <LabelChip
                key={id}
                label={label}
                onRemove={() => removeLabel.mutate({ id: conversation._id, labelId: id }, { onError })}
              />
            )
          })}
        </div>
      </section>
      <Separator />
      <section className="space-y-2 p-4">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Conversation</h3>
        <Row label="Inbox">{inbox?.name ?? '—'}</Row>
        <Row label="Assignee">{nameOf(conversation.assigneeId)}</Row>
        <Row label="Reply window">
          {window24.open ? (
            <span className="text-emerald-600 dark:text-emerald-400">Open · closes {formatRelative(window24.closesAt?.toISOString())}</span>
          ) : (
            <span className="text-muted-foreground">Closed</span>
          )}
        </Row>
        <Row label="Last message">{formatDateTime(conversation.lastMessageAt)}</Row>
        <Row label="Last inbound">{conversation.lastInboundAt ? formatDateTime(conversation.lastInboundAt) : '—'}</Row>
        <Row label="Started">{formatDateTime(conversation.createdAt)}</Row>
        {conversation.resolvedAt ? <Row label="Resolved">{formatDateTime(conversation.resolvedAt)}</Row> : null}
        <Row label="Contact ID">
          <code className="text-[10px]">{conversation.contactId}</code>
        </Row>
      </section>
      <Separator />
      <section className="space-y-2 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Deals</h3>
          <Button variant="outline" size="xs" onClick={() => setDealDialogOpen(true)} disabled={!pipelines?.length}>
            <Plus /> Deal
          </Button>
        </div>
        {contactDeals.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {pipelines && pipelines.length === 0 ? 'Create a pipeline in Settings first.' : 'No deals for this contact.'}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {contactDeals.map((deal) => {
              const pipeline = pipelines?.find((p) => p._id === deal.pipelineId)
              const stage = pipeline?.stages.find((s) => s._id === deal.stageId)
              return (
                <li key={deal._id}>
                  <Link
                    to={`/deals?pipeline=${deal.pipelineId}&deal=${deal._id}`}
                    className="block rounded-md border p-2 text-xs transition-colors hover:bg-accent/60"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 truncate font-medium">
                        <Handshake className="size-3.5 shrink-0 text-muted-foreground" />
                        {deal.title}
                      </span>
                      <span className="shrink-0">{formatMoney(deal.value, deal.currency)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-muted-foreground">
                      {stage ? (
                        <>
                          <span className="size-1.5 rounded-full" style={{ backgroundColor: stage.color }} />
                          {stage.name}
                        </>
                      ) : null}
                      <span className="ml-auto capitalize">{deal.status}</span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
      <DealFormDialog
        open={dealDialogOpen}
        onOpenChange={setDealDialogOpen}
        initial={{ contactId: conversation.contactId, conversationId: conversation._id }}
      />
    </div>
  )
}
