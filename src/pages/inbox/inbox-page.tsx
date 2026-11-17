import { useParams } from 'react-router'
import { MessageSquareText } from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'
import { cn } from '@/lib/utils'
import { ConversationList } from './conversation-list'
import { ConversationView } from './conversation-view'

export function InboxPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  return (
    <div className="flex h-full min-h-0">
      <div className={cn('w-full shrink-0 border-r md:w-80 lg:w-88', conversationId && 'hidden md:block')}>
        <ConversationList activeId={conversationId} />
      </div>
      <div className={cn('min-w-0 flex-1', !conversationId && 'hidden md:flex md:flex-col')}>
        {conversationId ? (
          <ConversationView key={conversationId} conversationId={conversationId} />
        ) : (
          <EmptyState
            icon={MessageSquareText}
            title="Select a conversation"
            description="Pick a conversation from the list to read and reply."
            className="h-full"
          />
        )}
      </div>
    </div>
  )
}
