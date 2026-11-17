import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { ExternalLink, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  useAddDealLabel,
  useDeal,
  useDeleteDeal,
  useMoveDeal,
  useRemoveDealLabel,
  useSetDealStatus,
  useUpdateDeal,
} from '@/api/deals'
import { useLabelMap } from '@/api/labels'
import { usePipelines } from '@/api/pipelines'
import { useUserDirectory } from '@/api/users'
import { useAuth } from '@/auth/auth-context'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { ErrorState } from '@/components/common/error-state'
import { FormField } from '@/components/common/form-field'
import { LabelChip } from '@/components/common/label-chip'
import { LabelPicker } from '@/components/common/label-picker'
import { CenteredSpinner, Spinner } from '@/components/common/loading'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useFormErrors } from '@/hooks/use-form-errors'
import { errorMessage } from '@/lib/api'
import { contactHandle, formatDateTime, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Deal, DealStatus } from '@/types/api'

const NONE = '__none__'

export function DealDetailSheet({ dealId, onClose }: { dealId: string | null; onClose: () => void }) {
  return (
    <Sheet open={Boolean(dealId)} onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
        {dealId ? <DealDetail key={dealId} dealId={dealId} onClose={onClose} /> : null}
      </SheetContent>
    </Sheet>
  )
}

const STATUS_STYLES: Record<DealStatus, string> = {
  open: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  won: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  lost: 'bg-destructive/10 text-destructive',
}

function DealDetail({ dealId, onClose }: { dealId: string; onClose: () => void }) {
  const query = useDeal(dealId)
  if (query.isLoading) return <CenteredSpinner />
  if (query.isError || !query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  return <DealDetailBody deal={query.data} onClose={onClose} />
}

function DealDetailBody({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  const { isManager } = useAuth()
  const { data: pipelines } = usePipelines()
  const { users, nameOf } = useUserDirectory()
  const labelMap = useLabelMap()
  const update = useUpdateDeal()
  const move = useMoveDeal()
  const setStatus = useSetDealStatus()
  const addLabel = useAddDealLabel()
  const removeLabel = useRemoveDealLabel()
  const remove = useDeleteDeal()
  const { formError, fieldErrors, reset, capture } = useFormErrors()

  const [title, setTitle] = useState(deal.title)
  const [value, setValue] = useState(String(deal.value))
  const [currency, setCurrency] = useState(deal.currency)
  const [ownerId, setOwnerId] = useState(deal.ownerId ?? '')
  const [expectedCloseDate, setExpectedCloseDate] = useState(deal.expectedCloseDate ? deal.expectedCloseDate.slice(0, 10) : '')
  const [notes, setNotes] = useState(deal.notes ?? '')
  const [lostReason, setLostReason] = useState('')
  const [confirmLost, setConfirmLost] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const pipeline = pipelines?.find((p) => p._id === deal.pipelineId)
  const stage = pipeline?.stages.find((s) => s._id === deal.stageId)
  const onError = (error: unknown) => toast.error(errorMessage(error))

  const dirty =
    title !== deal.title ||
    Number(value) !== deal.value ||
    currency.toUpperCase() !== deal.currency.toUpperCase() ||
    ownerId !== (deal.ownerId ?? '') ||
    expectedCloseDate !== (deal.expectedCloseDate ? deal.expectedCloseDate.slice(0, 10) : '') ||
    notes !== (deal.notes ?? '')

  async function save(event: FormEvent) {
    event.preventDefault()
    reset()
    try {
      await update.mutateAsync({
        id: deal._id,
        input: {
          title: title.trim(),
          value: Number(value),
          currency: currency.trim().toUpperCase(),
          ownerId: ownerId || null,
          expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate).toISOString() : null,
          notes,
        },
      })
      toast.success('Deal saved')
    } catch (error) {
      capture(error)
    }
  }

  return (
    <>
      <SheetHeader className="border-b">
        <div className="flex items-center gap-2">
          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium capitalize', STATUS_STYLES[deal.status])}>{deal.status}</span>
          {stage ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <span className="size-2 rounded-full" style={{ backgroundColor: stage.color }} />
              {stage.name}
            </span>
          ) : null}
        </div>
        <SheetTitle className="leading-tight">{deal.title}</SheetTitle>
        <SheetDescription>
          {formatMoney(deal.value, deal.currency)} · {contactHandle(deal.contactId)}
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-4 p-4">
        <section className="grid gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Stage & outcome</h3>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={deal.stageId}
              onValueChange={(stageId) => move.mutate({ id: deal._id, stageId }, { onError })}
              disabled={move.isPending || deal.status !== 'open'}
            >
              <SelectTrigger className="w-full" aria-label="Stage">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                {(pipeline?.stages ?? []).map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={deal.pipelineId}
              onValueChange={(pipelineId) => {
                const target = pipelines?.find((p) => p._id === pipelineId)
                const first = target?.stages[0]
                if (!first) return
                move.mutate({ id: deal._id, stageId: first._id, pipelineId }, { onError })
              }}
              disabled={move.isPending || deal.status !== 'open' || (pipelines?.length ?? 0) < 2}
            >
              <SelectTrigger className="w-full" aria-label="Pipeline">
                <SelectValue placeholder="Pipeline" />
              </SelectTrigger>
              <SelectContent>
                {(pipelines ?? []).map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            {deal.status !== 'won' ? (
              <Button
                size="sm"
                className="bg-emerald-600 text-white hover:bg-emerald-600/90"
                disabled={setStatus.isPending}
                onClick={() =>
                  setStatus.mutate({ id: deal._id, input: { status: 'won' } }, { onSuccess: () => toast.success('Marked as won'), onError })
                }
              >
                Mark won
              </Button>
            ) : null}
            {deal.status !== 'lost' ? (
              <Button size="sm" variant="destructive" disabled={setStatus.isPending} onClick={() => setConfirmLost(true)}>
                Mark lost
              </Button>
            ) : null}
            {deal.status !== 'open' ? (
              <Button
                size="sm"
                variant="outline"
                disabled={setStatus.isPending}
                onClick={() => setStatus.mutate({ id: deal._id, input: { status: 'open' } }, { onError })}
              >
                Reopen
              </Button>
            ) : null}
          </div>
          {deal.status === 'lost' && deal.lostReason ? (
            <p className="text-xs text-muted-foreground">Lost reason: {deal.lostReason}</p>
          ) : null}
          {deal.closedAt ? <p className="text-xs text-muted-foreground">Closed {formatDateTime(deal.closedAt)}</p> : null}
        </section>

        <Separator />

        <section className="grid gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Labels</h3>
            <LabelPicker
              selectedIds={deal.labelIds}
              onAdd={(labelId) => addLabel.mutate({ id: deal._id, labelId }, { onError })}
              onRemove={(labelId) => removeLabel.mutate({ id: deal._id, labelId }, { onError })}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {deal.labelIds.length === 0 ? <span className="text-xs text-muted-foreground">No labels</span> : null}
            {deal.labelIds.map((id) => {
              const label = labelMap.get(id)
              return label ? (
                <LabelChip key={id} label={label} onRemove={() => removeLabel.mutate({ id: deal._id, labelId: id }, { onError })} />
              ) : null
            })}
          </div>
        </section>

        <Separator />

        <form onSubmit={save} className="grid gap-3" noValidate>
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Details</h3>
          <FormField label="Title" htmlFor="edit-title" error={fieldErrors['title']}>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
          </FormField>
          <div className="grid grid-cols-[1fr_96px] gap-3">
            <FormField label="Value" htmlFor="edit-value" error={fieldErrors['value']}>
              <Input id="edit-value" type="number" min={0} step="any" value={value} onChange={(e) => setValue(e.target.value)} />
            </FormField>
            <FormField label="Currency" htmlFor="edit-currency" error={fieldErrors['currency']}>
              <Input id="edit-currency" value={currency} onChange={(e) => setCurrency(e.target.value)} maxLength={3} className="uppercase" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Owner" htmlFor="edit-owner" error={fieldErrors['ownerId']}>
              <Select value={ownerId || NONE} onValueChange={(v) => setOwnerId(v === NONE ? '' : v)}>
                <SelectTrigger id="edit-owner" className="w-full">
                  <SelectValue placeholder="No owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No owner</SelectItem>
                  {ownerId && !users.some((u) => u._id === ownerId) ? <SelectItem value={ownerId}>{nameOf(ownerId)}</SelectItem> : null}
                  {users.map((u) => (
                    <SelectItem key={u._id} value={u._id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Expected close" htmlFor="edit-close" error={fieldErrors['expectedCloseDate']}>
              <Input id="edit-close" type="date" value={expectedCloseDate} onChange={(e) => setExpectedCloseDate(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Notes" htmlFor="edit-notes" error={fieldErrors['notes']}>
            <Textarea id="edit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} maxLength={5000} />
          </FormField>
          {formError ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={!dirty || update.isPending}>
              {update.isPending ? <Spinner className="text-current" /> : null}
              Save changes
            </Button>
          </div>
        </form>

        <Separator />

        <section className="grid gap-1.5 text-xs text-muted-foreground">
          <div>Created {formatDateTime(deal.createdAt)} by {nameOf(deal.createdBy)}</div>
          <div>Updated {formatDateTime(deal.updatedAt)}</div>
          <div className="flex items-center gap-2">
            Contact <code className="text-[10px]">{deal.contactId}</code>
          </div>
          {deal.conversationId ? (
            <Link to={`/inbox/${deal.conversationId}`} className="inline-flex items-center gap-1 text-primary hover:underline">
              Open linked conversation <ExternalLink className="size-3" />
            </Link>
          ) : null}
        </section>

        {isManager ? (
          <>
            <Separator />
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 /> Delete deal
            </Button>
          </>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmLost}
        onOpenChange={setConfirmLost}
        title="Mark this deal as lost?"
        description={
          <span className="block space-y-2">
            <span className="block">You can reopen it later.</span>
            <Input value={lostReason} onChange={(e) => setLostReason(e.target.value)} placeholder="Reason (optional)" maxLength={500} />
          </span>
        }
        confirmLabel="Mark lost"
        destructive
        pending={setStatus.isPending}
        onConfirm={() =>
          setStatus.mutate(
            { id: deal._id, input: { status: 'lost', lostReason: lostReason.trim() || undefined } },
            {
              onSuccess: () => {
                setConfirmLost(false)
                toast.success('Marked as lost')
              },
              onError,
            },
          )
        }
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this deal?"
        description="This permanently removes the deal. This cannot be undone."
        confirmLabel="Delete"
        destructive
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutate(deal._id, {
            onSuccess: () => {
              setConfirmDelete(false)
              toast.success('Deal deleted')
              onClose()
            },
            onError,
          })
        }
      />
    </>
  )
}
