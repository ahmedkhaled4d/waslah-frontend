import { useEffect, useState } from 'react'
import { useConversation, useMarkConversationRead } from '@/api/conversations'
import { ErrorState } from '@/components/common/error-state'
import { CenteredSpinner } from '@/components/common/loading'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useMediaQuery } from '@/hooks/use-media-query'
import { Composer } from './composer'
import { ConversationDetails } from './conversation-details'
import { ConversationHeader } from './conversation-header'
import { MessageThread } from './message-thread'

export function ConversationView({ conversationId }: { conversationId: string }) {
  const query = useConversation(conversationId)
  const markRead = useMarkConversationRead()
  // Wide screens show the details as a fixed side panel; narrower ones use a slide-over sheet.
  const isWide = useMediaQuery('(min-width: 1280px)')
  const [panelOpen, setPanelOpen] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const conversation = query.data
  const unread = conversation?.unreadCount ?? 0

  // Opening a conversation (or receiving new inbound messages while it is open) clears its unread count.
  useEffect(() => {
    if (!conversation || unread === 0 || markRead.isPending) return
    markRead.mutate({ id: conversation._id })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?._id, unread])

  if (query.isLoading) return <CenteredSpinner />
  if (query.isError || !conversation) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  const detailsOpen = isWide ? panelOpen : sheetOpen
  const toggleDetails = () => (isWide ? setPanelOpen((v) => !v) : setSheetOpen((v) => !v))

  return (
    <div className="flex h-full min-w-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <ConversationHeader conversation={conversation} detailsOpen={detailsOpen} onToggleDetails={toggleDetails} />
        <MessageThread key={conversation._id} conversationId={conversation._id} />
        <Composer key={`composer-${conversation._id}`} conversation={conversation} />
      </div>
      {isWide && panelOpen ? (
        <aside className="w-72 shrink-0 border-l">
          <ConversationDetails conversation={conversation} />
        </aside>
      ) : null}
      {!isWide ? (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="right" className="w-80 p-0">
            <SheetTitle className="sr-only">Conversation details</SheetTitle>
            <ConversationDetails conversation={conversation} />
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  )
}
