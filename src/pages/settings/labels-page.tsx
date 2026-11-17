import { useState, type FormEvent } from 'react'
import { Pencil, Plus, Tag, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateLabel, useDeleteLabel, useLabels, useUpdateLabel } from '@/api/labels'
import { useAuth } from '@/auth/auth-context'
import { ColorPicker } from '@/components/common/color-picker'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { FormField } from '@/components/common/form-field'
import { LabelChip } from '@/components/common/label-chip'
import { CenteredSpinner, Spinner } from '@/components/common/loading'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useFormErrors } from '@/hooks/use-form-errors'
import { DEFAULT_COLOR } from '@/lib/colors'
import { errorMessage } from '@/lib/api'
import type { Label } from '@/types/api'

export function LabelsPage() {
  const { isManager } = useAuth()
  const query = useLabels()
  const remove = useDeleteLabel()
  const [editing, setEditing] = useState<Label | null | 'new'>(null)
  const [deleting, setDeleting] = useState<Label | null>(null)

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Labels"
        description="Shared tags for conversations and deals."
        actions={
          isManager ? (
            <Button size="sm" onClick={() => setEditing('new')}>
              <Plus /> New label
            </Button>
          ) : undefined
        }
      />
      {query.isLoading ? (
        <CenteredSpinner />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState icon={Tag} title="No labels yet" description={isManager ? 'Create a label to start organising conversations and deals.' : undefined} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Description</TableHead>
                {isManager ? <TableHead className="w-24" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(query.data ?? []).map((label) => (
                <TableRow key={label._id}>
                  <TableCell>
                    <LabelChip label={label} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{label.description || '—'}</TableCell>
                  {isManager ? (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${label.name}`} onClick={() => setEditing(label)}>
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Delete ${label.name}`} onClick={() => setDeleting(label)}>
                        <Trash2 />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog open={editing !== null} onOpenChange={(open) => (open ? undefined : setEditing(null))}>
        {editing !== null ? <LabelForm label={editing === 'new' ? null : editing} onDone={() => setEditing(null)} /> : null}
      </Dialog>
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => (open ? undefined : setDeleting(null))}
        title={`Delete “${deleting?.name}”?`}
        description="The label is removed from every conversation and deal that uses it."
        confirmLabel="Delete"
        destructive
        pending={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting._id, {
            onSuccess: () => {
              setDeleting(null)
              toast.success('Label deleted')
            },
            onError: (error) => toast.error(errorMessage(error)),
          })
        }
      />
    </div>
  )
}

function LabelForm({ label, onDone }: { label: Label | null; onDone: () => void }) {
  const create = useCreateLabel()
  const update = useUpdateLabel()
  const { formError, fieldErrors, reset, capture } = useFormErrors()
  const [name, setName] = useState(label?.name ?? '')
  const [color, setColor] = useState(label?.color ?? DEFAULT_COLOR)
  const [description, setDescription] = useState(label?.description ?? '')
  const pending = create.isPending || update.isPending

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    reset()
    const input = { name: name.trim(), color, description: description.trim() || undefined }
    try {
      if (label) await update.mutateAsync({ id: label._id, input })
      else await create.mutateAsync(input)
      toast.success(label ? 'Label updated' : 'Label created')
      onDone()
    } catch (error) {
      capture(error)
    }
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{label ? 'Edit label' : 'New label'}</DialogTitle>
        <DialogDescription>Names must be unique (case-insensitive).</DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <FormField label="Name" htmlFor="label-name" error={fieldErrors['name']}>
          <Input id="label-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} required autoFocus />
        </FormField>
        <FormField label="Color" error={fieldErrors['color']}>
          <ColorPicker value={color} onChange={setColor} />
        </FormField>
        <FormField label="Description" htmlFor="label-desc" error={fieldErrors['description']}>
          <Input id="label-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} />
        </FormField>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          Preview <LabelChip label={{ name: name || 'Label', color }} />
        </div>
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
            {label ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
