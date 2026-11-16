import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from './keys'
import type { Conversation, ConversationStatus, ListConversationsQuery, Message, Page } from '@/types/api'

export const conversationsApi = {
  list: (query: ListConversationsQuery, signal?: AbortSignal) =>
    api.get<Page<Conversation>>('/v1/conversations', { ...query }, signal),
  get: (id: string) => api.get<Conversation>(`/v1/conversations/${id}`),
  assign: (id: string, assigneeId: string | null) =>
    api.post<Conversation>(`/v1/conversations/${id}/assign`, { assigneeId }),
  setStatus: (id: string, status: ConversationStatus) =>
    api.post<Conversation>(`/v1/conversations/${id}/status`, { status }),
  move: (id: string, inboxId: string) => api.post<Conversation>(`/v1/conversations/${id}/move`, { inboxId }),
  markRead: (id: string) => api.post<Conversation>(`/v1/conversations/${id}/read`),
  addLabel: (id: string, labelId: string) =>
    api.post<Conversation>(`/v1/conversations/${id}/labels`, { labelId }),
  removeLabel: (id: string, labelId: string) =>
    api.delete<Conversation>(`/v1/conversations/${id}/labels/${labelId}`),
  messages: (id: string, cursor?: string, signal?: AbortSignal) =>
    api.get<Page<Message>>(`/v1/conversations/${id}/messages`, { limit: 50, cursor }, signal),
  sendMessage: (id: string, text: string, replyToWaMessageId?: string) =>
    api.post<Message>(`/v1/conversations/${id}/messages`, { text, replyToWaMessageId }),
}

export const CONVERSATIONS_POLL_MS = 10_000
export const MESSAGES_POLL_MS = 5_000

export function useConversations(query: ListConversationsQuery) {
  return useInfiniteQuery({
    queryKey: keys.conversations(query),
    queryFn: ({ pageParam, signal }) => conversationsApi.list({ ...query, limit: 30, cursor: pageParam }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchInterval: CONVERSATIONS_POLL_MS,
  })
}

export function useConversation(id: string | undefined) {
  return useQuery({
    queryKey: keys.conversation(id ?? ''),
    queryFn: () => conversationsApi.get(id ?? ''),
    enabled: Boolean(id),
    refetchInterval: MESSAGES_POLL_MS,
  })
}

export function useMessages(conversationId: string | undefined) {
  return useInfiniteQuery({
    queryKey: keys.messages(conversationId ?? ''),
    queryFn: ({ pageParam, signal }) => conversationsApi.messages(conversationId ?? '', pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: Boolean(conversationId),
    refetchInterval: MESSAGES_POLL_MS,
  })
}

/** Shared cache update after any conversation mutation: patch the detail and refresh lists. */
function useConversationMutation<TVars>(mutationFn: (vars: TVars) => Promise<Conversation>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (conversation) => {
      qc.setQueryData(keys.conversation(conversation._id), conversation)
      void qc.invalidateQueries({ queryKey: keys.conversationsAll })
    },
  })
}

export function useAssignConversation() {
  return useConversationMutation(({ id, assigneeId }: { id: string; assigneeId: string | null }) =>
    conversationsApi.assign(id, assigneeId),
  )
}

export function useSetConversationStatus() {
  return useConversationMutation(({ id, status }: { id: string; status: ConversationStatus }) =>
    conversationsApi.setStatus(id, status),
  )
}

export function useMoveConversation() {
  return useConversationMutation(({ id, inboxId }: { id: string; inboxId: string }) =>
    conversationsApi.move(id, inboxId),
  )
}

export function useMarkConversationRead() {
  return useConversationMutation(({ id }: { id: string }) => conversationsApi.markRead(id))
}

export function useAddConversationLabel() {
  return useConversationMutation(({ id, labelId }: { id: string; labelId: string }) =>
    conversationsApi.addLabel(id, labelId),
  )
}

export function useRemoveConversationLabel() {
  return useConversationMutation(({ id, labelId }: { id: string; labelId: string }) =>
    conversationsApi.removeLabel(id, labelId),
  )
}

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ text, replyToWaMessageId }: { text: string; replyToWaMessageId?: string }) =>
      conversationsApi.sendMessage(conversationId, text, replyToWaMessageId),
    onSuccess: (message) => {
      // Prepend to the newest page so the thread updates without waiting for the poll.
      qc.setQueryData<{ pages: Page<Message>[]; pageParams: unknown[] }>(keys.messages(conversationId), (old) => {
        if (!old) return old
        const [first, ...rest] = old.pages
        if (!first) return old
        if (first.data.some((m) => m._id === message._id)) return old
        return { ...old, pages: [{ ...first, data: [message, ...first.data] }, ...rest] }
      })
      void qc.invalidateQueries({ queryKey: keys.conversation(conversationId) })
      void qc.invalidateQueries({ queryKey: keys.conversationsAll })
    },
  })
}
