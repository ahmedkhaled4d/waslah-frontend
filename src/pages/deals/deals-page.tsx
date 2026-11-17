import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { KanbanSquare, Plus, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAllDeals, useDealsPage, useMoveDeal } from '@/api/deals'
import { useBoard, usePipelines } from '@/api/pipelines'
import { useAuth } from '@/auth/auth-context'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { CenteredSpinner, Spinner } from '@/components/common/loading'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { errorMessage } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Board, Deal, DealStatus, Pipeline } from '@/types/api'
import { DealCard } from './deal-card'
import { DealDetailSheet } from './deal-detail-sheet'
import { DealFormDialog } from './deal-form-dialog'

type View = 'board' | 'won' | 'lost'

export function DealsPage() {
  const [params, setParams] = useSearchParams()
  const { isManager } = useAuth()
  const pipelinesQuery = usePipelines()
  const pipelines = pipelinesQuery.data ?? []

  const pipelineId = params.get('pipeline') ?? pipelines[0]?._id
  const view = (params.get('view') as View | null) ?? 'board'
  const dealId = params.get('deal')
  const [createOpen, setCreateOpen] = useState(false)

  function patch(next: Record<string, string | null>) {
    const search = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) {
      if (value === null) search.delete(key)
      else search.set(key, value)
    }
    setParams(search, { replace: true })
  }

  const pipeline = pipelines.find((p) => p._id === pipelineId)

  if (pipelinesQuery.isLoading) return <CenteredSpinner />
  if (pipelinesQuery.isError) return <ErrorState error={pipelinesQuery.error} onRetry={() => void pipelinesQuery.refetch()} />

  if (pipelines.length === 0) {
    return (
      <EmptyState
        icon={KanbanSquare}
        title="No pipelines yet"
        description={isManager ? 'Create a pipeline with stages to start tracking deals.' : 'Ask an admin or supervisor to create a pipeline.'}
        action={
          isManager ? (
            <Button asChild>
              <Link to="/settings/pipelines">Create a pipeline</Link>
            </Button>
          ) : undefined
        }
        className="h-full"
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
        <Select value={pipelineId} onValueChange={(v) => patch({ pipeline: v, deal: null })}>
          <SelectTrigger size="sm" className="min-w-44" aria-label="Pipeline">
            <SelectValue placeholder="Pipeline" />
          </SelectTrigger>
          <SelectContent>
            {pipelines.map((p) => (
              <SelectItem key={p._id} value={p._id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Tabs value={view} onValueChange={(v) => patch({ view: v === 'board' ? null : v })}>
          <TabsList>
            <TabsTrigger value="board">Board</TabsTrigger>
            <TabsTrigger value="won">Won</TabsTrigger>
            <TabsTrigger value="lost">Lost</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="ml-auto flex items-center gap-2">
          {isManager ? (
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/settings/pipelines?pipeline=${pipelineId ?? ''}`}>
                <Settings2 /> Stages
              </Link>
            </Button>
          ) : null}
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus /> New deal
          </Button>
        </div>
      </div>

      {pipeline ? (
        view === 'board' ? (
          <BoardView key={pipeline._id} pipeline={pipeline} onOpenDeal={(id) => patch({ deal: id })} />
        ) : (
          <ClosedDealsList key={`${pipeline._id}-${view}`} pipelineId={pipeline._id} status={view} onOpenDeal={(id) => patch({ deal: id })} />
        )
      ) : null}

      <DealFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initial={{ pipelineId }}
        onCreated={(deal) => patch({ pipeline: deal.pipelineId, deal: deal._id, view: null })}
      />
      <DealDetailSheet dealId={dealId} onClose={() => patch({ deal: null })} />
    </div>
  )
}

function BoardView({ pipeline, onOpenDeal }: { pipeline: Pipeline; onOpenDeal: (id: string) => void }) {
  const board = useBoard(pipeline._id)
  const deals = useAllDeals({ pipelineId: pipeline._id, status: 'open' })
  const move = useMoveDeal()
  const [dragOver, setDragOver] = useState<string | null>(null)

  if (board.isLoading || deals.isLoading) return <CenteredSpinner />
  if (board.isError) return <ErrorState error={board.error} onRetry={() => void board.refetch()} />
  if (deals.isError) return <ErrorState error={deals.error} onRetry={() => void deals.refetch()} />

  const columns = board.data?.columns ?? []
  // Totals are plain numbers from the API; deals default to SAR, so use the first deal's currency for display.
  const currency = deals.data?.[0]?.currency ?? 'SAR'
  const byStage = new Map<string, Deal[]>()
  for (const deal of deals.data ?? []) {
    const list = byStage.get(deal.stageId) ?? []
    list.push(deal)
    byStage.set(deal.stageId, list)
  }

  function drop(stageId: string, event: React.DragEvent) {
    event.preventDefault()
    setDragOver(null)
    const id = event.dataTransfer.getData('text/deal-id')
    const from = event.dataTransfer.getData('text/stage-id')
    if (!id || from === stageId) return
    move.mutate({ id, stageId }, { onError: (error) => toast.error(errorMessage(error, 'Could not move the deal')) })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BoardTotals board={board.data} currency={currency} isFetching={board.isFetching || deals.isFetching || move.isPending} />
      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto px-4 pb-4">
        {columns.map((column) => {
          const items = byStage.get(column._id) ?? []
          return (
            <section
              key={column._id}
              className={cn(
                'flex w-72 shrink-0 flex-col rounded-xl border bg-muted/40 transition-colors',
                dragOver === column._id && 'border-primary bg-primary/5',
              )}
              onDragOver={(event) => {
                event.preventDefault()
                if (dragOver !== column._id) setDragOver(column._id)
              }}
              onDragLeave={() => setDragOver((current) => (current === column._id ? null : current))}
              onDrop={(event) => drop(column._id, event)}
              aria-label={`${column.name} stage`}
            >
              <header className="flex items-center gap-2 px-3 pt-3 pb-2">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: column.color }} />
                <span className="truncate text-sm font-semibold">{column.name}</span>
                <span className="rounded-full bg-background px-1.5 text-[11px] text-muted-foreground tabular-nums">{column.dealCount}</span>
                <span className="ml-auto text-[11px] text-muted-foreground">{column.probability}%</span>
              </header>
              <div className="px-3 pb-2 text-[11px] text-muted-foreground tabular-nums">
                {formatMoney(column.totalValue, currency)}
                {column.totalValue > 0 ? ` · weighted ${formatMoney(column.weightedValue, currency)}` : ''}
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
                {items.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">Drop deals here</div>
                ) : (
                  items.map((deal) => (
                    <DealCard
                      key={deal._id}
                      deal={deal}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData('text/deal-id', deal._id)
                        event.dataTransfer.setData('text/stage-id', deal.stageId)
                        event.dataTransfer.effectAllowed = 'move'
                      }}
                      onOpen={() => onOpenDeal(deal._id)}
                    />
                  ))
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function BoardTotals({ board, currency, isFetching }: { board: Board | undefined; currency: string; isFetching: boolean }) {
  if (!board) return null
  return (
    <div className="flex items-center gap-4 px-4 py-2 text-xs text-muted-foreground">
      <span>
        <strong className="text-foreground tabular-nums">{board.totals.dealCount}</strong> open deals
      </span>
      <span>
        Total <strong className="text-foreground tabular-nums">{formatMoney(board.totals.totalValue, currency)}</strong>
      </span>
      <span>
        Weighted <strong className="text-foreground tabular-nums">{formatMoney(board.totals.weightedValue, currency)}</strong>
      </span>
      {isFetching ? <Spinner className="size-3.5" /> : null}
    </div>
  )
}

function ClosedDealsList({
  pipelineId,
  status,
  onOpenDeal,
}: {
  pipelineId: string
  status: Exclude<DealStatus, 'open'>
  onOpenDeal: (id: string) => void
}) {
  const query = useDealsPage({ pipelineId, status })
  const deals = query.data?.pages.flatMap((p) => p.data) ?? []
  if (query.isLoading) return <CenteredSpinner />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  if (deals.length === 0)
    return <EmptyState icon={KanbanSquare} title={`No ${status} deals`} description="Deals you close will show up here." className="h-full" />
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="grid max-w-5xl gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {deals.map((deal) => (
          <DealCard key={deal._id} deal={deal} onOpen={() => onOpenDeal(deal._id)} />
        ))}
      </div>
      {query.hasNextPage ? (
        <div className="mt-3">
          <Button variant="outline" size="sm" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
            {query.isFetchingNextPage ? <Spinner /> : null}
            Load more
          </Button>
        </div>
      ) : null}
    </div>
  )
}
