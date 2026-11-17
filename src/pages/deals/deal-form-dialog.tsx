import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useCreateDeal } from '@/api/deals'
import { usePipelines } from '@/api/pipelines'
import { useUserDirectory } from '@/api/users'
import { useAuth } from '@/auth/auth-context'
import { FormField } from '@/components/common/form-field'
import { Spinner } from '@/components/common/loading'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useFormErrors } from '@/hooks/use-form-errors'
import type { CreateDealInput, Deal } from '@/types/api'

const OBJECT_ID = /^[a-fA-F0-9]{24}$/
const NONE = '__none__'

interface DealFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Partial<Pick<CreateDealInput, 'contactId' | 'conversationId' | 'pipelineId' | 'stageId'>>
  onCreated?: (deal: Deal) => void
}

export function DealFormDialog(props: DealFormDialogProps) {
  // Remount the form each time the dialog opens so stale values never leak between uses.
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open ? <DealForm {...props} /> : null}
    </Dialog>
  )
}

function DealForm({ onOpenChange, initial, onCreated }: DealFormDialogProps) {
  const { user } = useAuth()
  const { data: pipelines } = usePipelines()
  const { users } = useUserDirectory()
  const create = useCreateDeal()
  const { formError, fieldErrors, reset, capture } = useFormErrors()

  const [title, setTitle] = useState('')
  const [pipelineId, setPipelineId] = useState(initial?.pipelineId ?? pipelines?.[0]?._id ?? '')
  const [stageId, setStageId] = useState(initial?.stageId ?? '')
  const [contactId, setContactId] = useState(initial?.contactId ?? '')
  const [value, setValue] = useState('')
  const [currency, setCurrency] = useState('SAR')
  const [ownerId, setOwnerId] = useState(user?._id ?? '')
  const [expectedCloseDate, setExpectedCloseDate] = useState('')
  const [notes, setNotes] = useState('')

  const pipeline = pipelines?.find((p) => p._id === pipelineId)
  const contactLocked = Boolean(initial?.contactId)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    reset()
    if (!OBJECT_ID.test(contactId)) {
      capture(new Error('Contact ID must be a 24-character hex id'))
      return
    }
    const input: CreateDealInput = {
      title: title.trim(),
      pipelineId,
      contactId,
      stageId: stageId || undefined,
      value: value === '' ? undefined : Number(value),
      currency: currency.trim().toUpperCase() || undefined,
      conversationId: initial?.conversationId,
      ownerId: ownerId || undefined,
      expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate).toISOString() : undefined,
      notes: notes.trim() || undefined,
    }
    try {
      const deal = await create.mutateAsync(input)
      toast.success('Deal created')
      onCreated?.(deal)
      onOpenChange(false)
    } catch (error) {
      capture(error)
    }
  }

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>New deal</DialogTitle>
        <DialogDescription>Track an opportunity for this contact through a pipeline.</DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <FormField label="Title" htmlFor="deal-title" error={fieldErrors['title']}>
          <Input id="deal-title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} autoFocus />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Pipeline" htmlFor="deal-pipeline" error={fieldErrors['pipelineId']}>
            <Select
              value={pipelineId}
              onValueChange={(v) => {
                setPipelineId(v)
                setStageId('')
              }}
            >
              <SelectTrigger id="deal-pipeline" className="w-full">
                <SelectValue placeholder="Choose a pipeline" />
              </SelectTrigger>
              <SelectContent>
                {(pipelines ?? []).map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Stage" htmlFor="deal-stage" error={fieldErrors['stageId']} hint={stageId ? undefined : 'Defaults to the first stage'}>
            <Select value={stageId || NONE} onValueChange={(v) => setStageId(v === NONE ? '' : v)} disabled={!pipeline}>
              <SelectTrigger id="deal-stage" className="w-full">
                <SelectValue placeholder="First stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>First stage</SelectItem>
                {(pipeline?.stages ?? []).map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
        <FormField
          label="Contact ID"
          htmlFor="deal-contact"
          error={fieldErrors['contactId']}
          hint={contactLocked ? 'Linked to the current conversation' : 'Copy it from a conversation’s details panel'}
        >
          <Input
            id="deal-contact"
            value={contactId}
            onChange={(e) => setContactId(e.target.value.trim())}
            readOnly={contactLocked}
            className={contactLocked ? 'bg-muted font-mono text-xs' : 'font-mono text-xs'}
            placeholder="24-character id"
            required
          />
        </FormField>
        <div className="grid grid-cols-[1fr_96px] gap-3">
          <FormField label="Value" htmlFor="deal-value" error={fieldErrors['value']}>
            <Input id="deal-value" type="number" min={0} step="any" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
          </FormField>
          <FormField label="Currency" htmlFor="deal-currency" error={fieldErrors['currency']}>
            <Input id="deal-currency" value={currency} onChange={(e) => setCurrency(e.target.value)} maxLength={3} className="uppercase" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Owner" htmlFor="deal-owner" error={fieldErrors['ownerId']}>
            <Select value={ownerId || NONE} onValueChange={(v) => setOwnerId(v === NONE ? '' : v)}>
              <SelectTrigger id="deal-owner" className="w-full">
                <SelectValue placeholder="No owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No owner</SelectItem>
                {user && !users.some((u) => u._id === user._id) ? (
                  <SelectItem value={user._id}>{user.name} (you)</SelectItem>
                ) : null}
                {users.map((u) => (
                  <SelectItem key={u._id} value={u._id}>
                    {u.name}
                    {u._id === user?._id ? ' (you)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Expected close" htmlFor="deal-close" error={fieldErrors['expectedCloseDate']}>
            <Input id="deal-close" type="date" value={expectedCloseDate} onChange={(e) => setExpectedCloseDate(e.target.value)} />
          </FormField>
        </div>
        <FormField label="Notes" htmlFor="deal-notes" error={fieldErrors['notes']}>
          <Textarea id="deal-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={5000} />
        </FormField>
        {formError ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending || !title.trim() || !pipelineId || !contactId}>
            {create.isPending ? <Spinner className="text-current" /> : null}
            Create deal
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
