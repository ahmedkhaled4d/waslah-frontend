import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from './keys'
import type { CreateDealInput, Deal, DealStatusInput, ListDealsQuery, Page, UpdateDealInput } from '@/types/api'

export const dealsApi = {
  list: (query: ListDealsQuery, signal?: AbortSignal) => api.get<Page<Deal>>('/v1/deals', { ...query }, signal),
  get: (id: string) => api.get<Deal>(`/v1/deals/${id}`),
  create: (input: CreateDealInput) => api.post<Deal>('/v1/deals', input),
  update: (id: string, input: UpdateDealInput) => api.patch<Deal>(`/v1/deals/${id}`, input),
  move: (id: string, stageId: string, pipelineId?: string) =>
    api.post<Deal>(`/v1/deals/${id}/move`, { stageId, pipelineId }),
  setStatus: (id: string, input: DealStatusInput) => api.post<Deal>(`/v1/deals/${id}/status`, input),
  addLabel: (id: string, labelId: string) => api.post<Deal>(`/v1/deals/${id}/labels`, { labelId }),
  removeLabel: (id: string, labelId: string) => api.delete<Deal>(`/v1/deals/${id}/labels/${labelId}`),
  remove: (id: string) => api.delete(`/v1/deals/${id}`),
}

/** Fetches every page of a deal list (the board needs all open deals of a pipeline). */
async function listAll(query: ListDealsQuery, signal?: AbortSignal): Promise<Deal[]> {
  const all: Deal[] = []
  let cursor: string | undefined
  for (let i = 0; i < 20; i++) {
    const page = await dealsApi.list({ ...query, limit: 100, cursor }, signal)
    all.push(...page.data)
    if (!page.nextCursor) break
    cursor = page.nextCursor
  }
  return all
}

export function useAllDeals(query: ListDealsQuery, enabled = true) {
  return useQuery({
    queryKey: [...keys.deals(query), 'all'],
    queryFn: ({ signal }) => listAll(query, signal),
    enabled,
  })
}

export function useDealsPage(query: ListDealsQuery, enabled = true) {
  return useInfiniteQuery({
    queryKey: keys.deals(query),
    queryFn: ({ pageParam, signal }) => dealsApi.list({ ...query, limit: 30, cursor: pageParam }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
  })
}

export function useDeal(id: string | undefined) {
  return useQuery({
    queryKey: keys.deal(id ?? ''),
    queryFn: () => dealsApi.get(id ?? ''),
    enabled: Boolean(id),
  })
}

function useDealMutation<TVars, TResult extends Deal | void>(mutationFn: (vars: TVars) => Promise<TResult>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async (deal) => {
      if (deal) qc.setQueryData(keys.deal(deal._id), deal)
      await Promise.all([
        qc.invalidateQueries({ queryKey: keys.dealsAll }),
        qc.invalidateQueries({ queryKey: ['board'] }),
      ])
    },
  })
}

export function useCreateDeal() {
  return useDealMutation((input: CreateDealInput) => dealsApi.create(input))
}
export function useUpdateDeal() {
  return useDealMutation(({ id, input }: { id: string; input: UpdateDealInput }) => dealsApi.update(id, input))
}
export function useMoveDeal() {
  return useDealMutation(({ id, stageId, pipelineId }: { id: string; stageId: string; pipelineId?: string }) =>
    dealsApi.move(id, stageId, pipelineId),
  )
}
export function useSetDealStatus() {
  return useDealMutation(({ id, input }: { id: string; input: DealStatusInput }) => dealsApi.setStatus(id, input))
}
export function useAddDealLabel() {
  return useDealMutation(({ id, labelId }: { id: string; labelId: string }) => dealsApi.addLabel(id, labelId))
}
export function useRemoveDealLabel() {
  return useDealMutation(({ id, labelId }: { id: string; labelId: string }) => dealsApi.removeLabel(id, labelId))
}
export function useDeleteDeal() {
  return useDealMutation((id: string) => dealsApi.remove(id))
}
