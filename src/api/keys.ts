import type { ListConversationsQuery, ListDealsQuery } from '@/types/api'

/** Centralised query keys so invalidation is consistent across hooks. */
export const keys = {
  me: ['me'] as const,
  users: ['users'] as const,
  user: (id: string) => ['users', id] as const,
  inboxes: ['inboxes'] as const,
  inbox: (id: string) => ['inboxes', id] as const,
  labels: ['labels'] as const,
  conversations: (query: ListConversationsQuery) => ['conversations', 'list', query] as const,
  conversationsAll: ['conversations'] as const,
  conversation: (id: string) => ['conversations', 'detail', id] as const,
  messages: (conversationId: string) => ['messages', conversationId] as const,
  pipelines: ['pipelines'] as const,
  pipeline: (id: string) => ['pipelines', id] as const,
  board: (pipelineId: string) => ['board', pipelineId] as const,
  deals: (query: ListDealsQuery) => ['deals', 'list', query] as const,
  dealsAll: ['deals'] as const,
  deal: (id: string) => ['deals', 'detail', id] as const,
}
