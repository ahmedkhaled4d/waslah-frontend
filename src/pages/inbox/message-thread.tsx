import { useEffect, useLayoutEffect, useRef } from 'react'
import { MessageSquare } from 'lucide-react'
import { useMessages } from '@/api/conversations'
import { useUserDirectory } from '@/api/users'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { CenteredSpinner, Spinner } from '@/components/common/loading'
import { Button } from '@/components/ui/button'
import { formatDayLabel } from '@/lib/format'
import type { Message } from '@/types/api'
import { MessageBubble } from './message-bubble'

function dayKey(iso: string) {
  return new Date(iso).toDateString()
}

export function MessageThread({ conversationId }: { conversationId: string }) {
  const query = useMessages(conversationId)
  const { nameOf } = useUserDirectory()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const lastNewestIdRef = useRef<string | null>(null)
  const prependRef = useRef<{ height: number; top: number } | null>(null)

  // Pages arrive newest-first; display oldest-first.
  const messages: Message[] = (query.data?.pages ?? [])
    .flatMap((page) => page.data)
    .slice()
    .reverse()
  const newestId = messages.at(-1)?._id ?? null

  // Scroll to the bottom on first load and when a new message appears while near the bottom.
  useEffect(() => {
    const el = scrollerRef.current
    if (!el || !newestId) return
    const first = lastNewestIdRef.current === null
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (first || (nearBottom && newestId !== lastNewestIdRef.current)) {
      el.scrollTop = el.scrollHeight
    }
    lastNewestIdRef.current = newestId
  }, [newestId])

  // Keep the viewport anchored when older messages are prepended.
  useLayoutEffect(() => {
    const el = scrollerRef.current
    const snapshot = prependRef.current
    if (!el || !snapshot) return
    el.scrollTop = el.scrollHeight - snapshot.height + snapshot.top
    prependRef.current = null
  }, [messages.length])

  function loadOlder() {
    const el = scrollerRef.current
    if (el) prependRef.current = { height: el.scrollHeight, top: el.scrollTop }
    void query.fetchNextPage()
  }

  if (query.isLoading) return <CenteredSpinner />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  return (
    <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto bg-muted/30 px-4 py-3">
      {query.hasNextPage ? (
        <div className="mb-3 flex justify-center">
          <Button variant="outline" size="xs" disabled={query.isFetchingNextPage} onClick={loadOlder}>
            {query.isFetchingNextPage ? <Spinner /> : null}
            Load older messages
          </Button>
        </div>
      ) : null}
      {messages.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No messages yet" />
      ) : (
        <div className="flex flex-col gap-1.5">
          {messages.map((message, index) => {
            const previous = messages[index - 1]
            const showDay = !previous || dayKey(previous.sentAt) !== dayKey(message.sentAt)
            return (
              <div key={message._id} className="flex flex-col gap-1.5">
                {showDay ? (
                  <div className="my-2 flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[11px] font-medium text-muted-foreground">{formatDayLabel(message.sentAt)}</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                ) : null}
                <MessageBubble
                  message={message}
                  senderName={message.direction === 'outbound' && message.sentBy ? nameOf(message.sentBy) : undefined}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
