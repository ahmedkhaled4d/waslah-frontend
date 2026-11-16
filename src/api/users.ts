import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from './keys'
import { useAuth } from '@/auth/auth-context'
import type { CreateUserInput, UpdateUserInput, User } from '@/types/api'

export const usersApi = {
  list: () => api.get<{ data: User[] }>('/v1/users').then((r) => r.data),
  get: (id: string) => api.get<User>(`/v1/users/${id}`),
  create: (input: CreateUserInput) => api.post<User>('/v1/users', input),
  update: (id: string, input: UpdateUserInput) => api.patch<User>(`/v1/users/${id}`, input),
}

/** Managers only; agents get an empty list without calling the API. */
export function useUsers() {
  const { isManager } = useAuth()
  return useQuery({
    queryKey: keys.users,
    queryFn: usersApi.list,
    enabled: isManager,
    staleTime: 60_000,
  })
}

/**
 * Lookup helpers for user ids. Managers see every user; agents only know themselves,
 * so other ids fall back to a short handle.
 */
export function useUserDirectory() {
  const { user } = useAuth()
  const { data } = useUsers()
  const byId = new Map<string, User>()
  if (user) byId.set(user._id, user)
  for (const u of data ?? []) byId.set(u._id, u)
  return {
    byId,
    users: data ?? [],
    nameOf(id: string | null | undefined): string {
      if (!id) return 'Unassigned'
      if (id === user?._id) return `${user.name} (you)`
      return byId.get(id)?.name ?? `Agent ${id.slice(-4).toUpperCase()}`
    },
  }
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.users }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) => usersApi.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.users }),
  })
}
