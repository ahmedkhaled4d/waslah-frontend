import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from './keys'
import type { Board, CreatePipelineInput, Pipeline, StageInput } from '@/types/api'

export const pipelinesApi = {
  list: () => api.get<{ data: Pipeline[] }>('/v1/pipelines').then((r) => r.data),
  get: (id: string) => api.get<Pipeline>(`/v1/pipelines/${id}`),
  board: (id: string, signal?: AbortSignal) => api.get<Board>(`/v1/pipelines/${id}/board`, undefined, signal),
  create: (input: CreatePipelineInput) => api.post<Pipeline>('/v1/pipelines', input),
  rename: (id: string, name: string) => api.patch<Pipeline>(`/v1/pipelines/${id}`, { name }),
  remove: (id: string) => api.delete(`/v1/pipelines/${id}`),
  addStage: (id: string, input: StageInput) => api.post<Pipeline>(`/v1/pipelines/${id}/stages`, input),
  reorderStages: (id: string, stageIds: string[]) =>
    api.put<Pipeline>(`/v1/pipelines/${id}/stages/order`, { stageIds }),
  updateStage: (id: string, stageId: string, input: Partial<StageInput>) =>
    api.patch<Pipeline>(`/v1/pipelines/${id}/stages/${stageId}`, input),
  removeStage: (id: string, stageId: string) => api.delete<Pipeline>(`/v1/pipelines/${id}/stages/${stageId}`),
}

export function usePipelines() {
  return useQuery({ queryKey: keys.pipelines, queryFn: pipelinesApi.list, staleTime: 60_000 })
}

export function useBoard(pipelineId: string | undefined) {
  return useQuery({
    queryKey: keys.board(pipelineId ?? ''),
    queryFn: ({ signal }) => pipelinesApi.board(pipelineId ?? '', signal),
    enabled: Boolean(pipelineId),
  })
}

function usePipelineMutation<TVars, TResult extends Pipeline | void>(mutationFn: (vars: TVars) => Promise<TResult>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: keys.pipelines }),
        qc.invalidateQueries({ queryKey: ['board'] }),
      ])
    },
  })
}

export function useCreatePipeline() {
  return usePipelineMutation((input: CreatePipelineInput) => pipelinesApi.create(input))
}
export function useRenamePipeline() {
  return usePipelineMutation(({ id, name }: { id: string; name: string }) => pipelinesApi.rename(id, name))
}
export function useDeletePipeline() {
  return usePipelineMutation((id: string) => pipelinesApi.remove(id))
}
export function useAddStage() {
  return usePipelineMutation(({ id, input }: { id: string; input: StageInput }) => pipelinesApi.addStage(id, input))
}
export function useReorderStages() {
  return usePipelineMutation(({ id, stageIds }: { id: string; stageIds: string[] }) =>
    pipelinesApi.reorderStages(id, stageIds),
  )
}
export function useUpdateStage() {
  return usePipelineMutation(
    ({ id, stageId, input }: { id: string; stageId: string; input: Partial<StageInput> }) =>
      pipelinesApi.updateStage(id, stageId, input),
  )
}
export function useDeleteStage() {
  return usePipelineMutation(({ id, stageId }: { id: string; stageId: string }) =>
    pipelinesApi.removeStage(id, stageId),
  )
}
