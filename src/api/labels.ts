import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from './keys'
import type { CreateLabelInput, Label, UpdateLabelInput } from '@/types/api'

export const labelsApi = {
  list: () => api.get<{ data: Label[] }>('/v1/labels').then((r) => r.data),
  create: (input: CreateLabelInput) => api.post<Label>('/v1/labels', input),
  update: (id: string, input: UpdateLabelInput) => api.patch<Label>(`/v1/labels/${id}`, input),
  remove: (id: string) => api.delete(`/v1/labels/${id}`),
}

export function useLabels() {
  return useQuery({ queryKey: keys.labels, queryFn: labelsApi.list, staleTime: 60_000 })
}

export function useLabelMap() {
  const { data } = useLabels()
  const map = new Map<string, Label>()
  for (const label of data ?? []) map.set(label._id, label)
  return map
}

export function useCreateLabel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: labelsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.labels }),
  })
}

export function useUpdateLabel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateLabelInput }) => labelsApi.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.labels }),
  })
}

export function useDeleteLabel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: labelsApi.remove,
    onSuccess: async () => {
      // Deleting a label also strips it from conversations and deals server-side.
      await Promise.all([
        qc.invalidateQueries({ queryKey: keys.labels }),
        qc.invalidateQueries({ queryKey: keys.conversationsAll }),
        qc.invalidateQueries({ queryKey: keys.dealsAll }),
      ])
    },
  })
}
