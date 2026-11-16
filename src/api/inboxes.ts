import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from './keys'
import type { CreateInboxInput, Inbox, UpdateInboxInput } from '@/types/api'

export const inboxesApi = {
  list: () => api.get<{ data: Inbox[] }>('/v1/inboxes').then((r) => r.data),
  get: (id: string) => api.get<Inbox>(`/v1/inboxes/${id}`),
  create: (input: CreateInboxInput) => api.post<Inbox>('/v1/inboxes', input),
  update: (id: string, input: UpdateInboxInput) => api.patch<Inbox>(`/v1/inboxes/${id}`, input),
  remove: (id: string) => api.delete(`/v1/inboxes/${id}`),
  addMembers: (id: string, memberIds: string[]) =>
    api.post<Inbox>(`/v1/inboxes/${id}/members`, { memberIds }),
  removeMember: (id: string, userId: string) =>
    api.delete<Inbox>(`/v1/inboxes/${id}/members/${userId}`),
}

export function useInboxes() {
  return useQuery({ queryKey: keys.inboxes, queryFn: inboxesApi.list, staleTime: 60_000 })
}

function useInvalidateInboxes() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: keys.inboxes })
}

export function useCreateInbox() {
  const invalidate = useInvalidateInboxes()
  return useMutation({ mutationFn: inboxesApi.create, onSuccess: invalidate })
}

export function useUpdateInbox() {
  const invalidate = useInvalidateInboxes()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateInboxInput }) => inboxesApi.update(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteInbox() {
  const invalidate = useInvalidateInboxes()
  return useMutation({ mutationFn: inboxesApi.remove, onSuccess: invalidate })
}

export function useAddInboxMembers() {
  const invalidate = useInvalidateInboxes()
  return useMutation({
    mutationFn: ({ id, memberIds }: { id: string; memberIds: string[] }) =>
      inboxesApi.addMembers(id, memberIds),
    onSuccess: invalidate,
  })
}

export function useRemoveInboxMember() {
  const invalidate = useInvalidateInboxes()
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) => inboxesApi.removeMember(id, userId),
    onSuccess: invalidate,
  })
}
