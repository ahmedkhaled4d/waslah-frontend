import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { ChevronDown, ChevronUp, KanbanSquare, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  useAddStage,
  useCreatePipeline,
  useDeletePipeline,
  useDeleteStage,
  usePipelines,
  useRenamePipeline,
  useReorderStages,
  useUpdateStage,
} from '@/api/pipelines'
import { ColorPicker } from '@/components/common/color-picker'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { FormField } from '@/components/common/form-field'
import { CenteredSpinner, Spinner } from '@/components/common/loading'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFormErrors } from '@/hooks/use-form-errors'
import { ApiError, errorMessage } from '@/lib/api'
import { PALETTE } from '@/lib/colors'
import type { Pipeline, Stage, StageInput } from '@/types/api'

export function PipelinesPage() {
  const [params, setParams] = useSearchParams()
  const query = usePipelines()
  const rename = useRenamePipeline()
  const remove = useDeletePipeline()
  const reorder = useReorderStages()
  const deleteStage = useDeleteStage()
  const pipelines = query.data ?? []
  const selectedId = params.get('pipeline') ?? pipelines[0]?._id
  const pipeline = pipelines.find((p) => p._id === selectedId)

  const [createOpen, setCreateOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [stageEditing, setStageEditing] = useState<Stage | null | 'new'>(null)
  const [stageDeleting, setStageDeleting] = useState<Stage | null>(null)
  const onError = (error: unknown) => toast.error(errorMessage(error))

  function moveStage(index: number, delta: number) {
    if (!pipeline) return
    const ids = pipeline.stages.map((s) => s._id)
    const target = index + delta
    if (target < 0 || target >= ids.length) return
    const next = [...ids]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved!)
    reorder.mutate({ id: pipeline._id, stageIds: next }, { onError })
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Pipelines"
        description="Each pipeline has ordered stages with a win probability used for weighted totals."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus /> New pipeline
          </Button>
        }
      />
      {query.isLoading ? (
        <CenteredSpinner />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : pipelines.length === 0 ? (
        <EmptyState icon={KanbanSquare} title="No pipelines yet" description="Create your first pipeline to start tracking deals." />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedId} onValueChange={(v) => setParams({ pipeline: v }, { replace: true })}>
              <SelectTrigger size="sm" className="min-w-48" aria-label="Pipeline">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {pipeline ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRenameValue(pipeline.name)
                    setRenaming(true)
                  }}
                >
                  <Pencil /> Rename
                </Button>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleting(true)}>
                  <Trash2 /> Delete
                </Button>
              </>
            ) : null}
          </div>

          {pipeline ? (
            <div className="rounded-lg border">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <span className="text-sm font-medium">Stages · {pipeline.stages.length}</span>
                <Button size="xs" variant="outline" onClick={() => setStageEditing('new')}>
                  <Plus /> Add stage
                </Button>
              </div>
              <ol className="divide-y">
                {pipeline.stages.map((stage, index) => (
                  <li key={stage._id} className="flex items-center gap-3 px-3 py-2">
                    <div className="flex flex-col">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Move up"
                        disabled={index === 0 || reorder.isPending}
                        onClick={() => moveStage(index, -1)}
                      >
                        <ChevronUp />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Move down"
                        disabled={index === pipeline.stages.length - 1 || reorder.isPending}
                        onClick={() => moveStage(index, 1)}
                      >
                        <ChevronDown />
                      </Button>
                    </div>
                    <span className="size-3 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="flex-1 truncate text-sm font-medium">{stage.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{stage.probability}%</span>
                    <Button variant="ghost" size="icon-sm" aria-label={`Edit ${stage.name}`} onClick={() => setStageEditing(stage)}>
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${stage.name}`}
                      disabled={pipeline.stages.length === 1}
                      onClick={() => setStageDeleting(stage)}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        {createOpen ? (
          <CreatePipelineForm
            onDone={(created) => {
              setCreateOpen(false)
              if (created) setParams({ pipeline: created._id }, { replace: true })
            }}
          />
        ) : null}
      </Dialog>

      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename pipeline</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event: FormEvent) => {
              event.preventDefault()
              if (!pipeline) return
              rename.mutate(
                { id: pipeline._id, name: renameValue.trim() },
                {
                  onSuccess: () => {
                    setRenaming(false)
                    toast.success('Pipeline renamed')
                  },
                  onError,
                },
              )
            }}
          >
            <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} maxLength={80} required autoFocus aria-label="Pipeline name" />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenaming(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={rename.isPending || !renameValue.trim()}>
                {rename.isPending ? <Spinner className="text-current" /> : null}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={stageEditing !== null} onOpenChange={(open) => (open ? undefined : setStageEditing(null))}>
        {pipeline && stageEditing !== null ? (
          <StageForm pipeline={pipeline} stage={stageEditing === 'new' ? null : stageEditing} onDone={() => setStageEditing(null)} />
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete “${pipeline?.name}”?`}
        description="Only pipelines without deals can be deleted."
        confirmLabel="Delete"
        destructive
        pending={remove.isPending}
        onConfirm={() =>
          pipeline &&
          remove.mutate(pipeline._id, {
            onSuccess: () => {
              setDeleting(false)
              setParams({}, { replace: true })
              toast.success('Pipeline deleted')
            },
            onError: (error) =>
              toast.error(error instanceof ApiError && error.status === 409 ? 'This pipeline still has deals.' : errorMessage(error)),
          })
        }
      />
      <ConfirmDialog
        open={stageDeleting !== null}
        onOpenChange={(open) => (open ? undefined : setStageDeleting(null))}
        title={`Delete stage “${stageDeleting?.name}”?`}
        description="Only stages without deals can be deleted. Move its deals to another stage first."
        confirmLabel="Delete"
        destructive
        pending={deleteStage.isPending}
        onConfirm={() =>
          pipeline &&
          stageDeleting &&
          deleteStage.mutate(
            { id: pipeline._id, stageId: stageDeleting._id },
            {
              onSuccess: () => {
                setStageDeleting(null)
                toast.success('Stage deleted')
              },
              onError: (error) =>
                toast.error(error instanceof ApiError && error.status === 409 ? 'This stage still has deals.' : errorMessage(error)),
            },
          )
        }
      />
    </div>
  )
}

const DEFAULT_STAGES: StageInput[] = [
  { name: 'New', color: PALETTE[8], probability: 10 },
  { name: 'Qualified', color: PALETTE[9], probability: 30 },
  { name: 'Proposal', color: PALETTE[3], probability: 60 },
  { name: 'Negotiation', color: PALETTE[2], probability: 80 },
]

function CreatePipelineForm({ onDone }: { onDone: (created?: Pipeline) => void }) {
  const create = useCreatePipeline()
  const { formError, fieldErrors, reset, capture } = useFormErrors()
  const [name, setName] = useState('')
  const [stages, setStages] = useState<StageInput[]>(DEFAULT_STAGES)

  function updateStage(index: number, patch: Partial<StageInput>) {
    setStages((list) => list.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    reset()
    const cleaned = stages.filter((s) => s.name.trim()).map((s) => ({ ...s, name: s.name.trim() }))
    try {
      const created = await create.mutateAsync({ name: name.trim(), stages: cleaned.length > 0 ? cleaned : undefined })
      toast.success('Pipeline created')
      onDone(created)
    } catch (error) {
      capture(error)
    }
  }

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>New pipeline</DialogTitle>
        <DialogDescription>Start with the suggested stages or define your own. Leave stages empty to use the server defaults.</DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <FormField label="Name" htmlFor="pipeline-name" error={fieldErrors['name']}>
          <Input id="pipeline-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required autoFocus />
        </FormField>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Stages</span>
            <Button
              type="button"
              size="xs"
              variant="outline"
              disabled={stages.length >= 30}
              onClick={() => setStages((list) => [...list, { name: '', color: PALETTE[list.length % PALETTE.length], probability: 50 }])}
            >
              <Plus /> Stage
            </Button>
          </div>
          <div className="grid gap-2">
            {stages.map((stage, index) => (
              <div key={index} className="grid grid-cols-[1fr_72px_auto] items-center gap-2">
                <Input
                  value={stage.name}
                  onChange={(e) => updateStage(index, { name: e.target.value })}
                  placeholder={`Stage ${index + 1}`}
                  maxLength={60}
                  aria-label={`Stage ${index + 1} name`}
                />
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={stage.probability ?? ''}
                  onChange={(e) => updateStage(index, { probability: e.target.value === '' ? undefined : Number(e.target.value) })}
                  aria-label={`Stage ${index + 1} probability`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove stage"
                  onClick={() => setStages((list) => list.filter((_, i) => i !== index))}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
          {fieldErrors['stages'] ? <p className="text-xs text-destructive">{fieldErrors['stages']}</p> : null}
        </div>
        {formError ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onDone()}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending || !name.trim()}>
            {create.isPending ? <Spinner className="text-current" /> : null}
            Create pipeline
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

function StageForm({ pipeline, stage, onDone }: { pipeline: Pipeline; stage: Stage | null; onDone: () => void }) {
  const add = useAddStage()
  const update = useUpdateStage()
  const { formError, fieldErrors, reset, capture } = useFormErrors()
  const [name, setName] = useState(stage?.name ?? '')
  const [color, setColor] = useState(stage?.color ?? PALETTE[(pipeline.stages.length + 8) % PALETTE.length])
  const [probability, setProbability] = useState(String(stage?.probability ?? 50))
  const pending = add.isPending || update.isPending

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    reset()
    const input: StageInput = { name: name.trim(), color, probability: Number(probability) }
    try {
      if (stage) await update.mutateAsync({ id: pipeline._id, stageId: stage._id, input })
      else await add.mutateAsync({ id: pipeline._id, input })
      toast.success(stage ? 'Stage updated' : 'Stage added')
      onDone()
    } catch (error) {
      capture(error)
    }
  }

  return (
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>{stage ? 'Edit stage' : 'Add stage'}</DialogTitle>
        <DialogDescription>New stages are appended to the end of the board.</DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <FormField label="Name" htmlFor="stage-name" error={fieldErrors['name']}>
          <Input id="stage-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required autoFocus />
        </FormField>
        <FormField label="Win probability (%)" htmlFor="stage-prob" error={fieldErrors['probability']}>
          <Input id="stage-prob" type="number" min={0} max={100} value={probability} onChange={(e) => setProbability(e.target.value)} />
        </FormField>
        <FormField label="Color" error={fieldErrors['color']}>
          <ColorPicker value={color} onChange={setColor} />
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
          <Button type="submit" disabled={pending || !name.trim()}>
            {pending ? <Spinner className="text-current" /> : null}
            {stage ? 'Save' : 'Add'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
