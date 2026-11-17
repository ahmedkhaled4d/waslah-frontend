import { useState, type KeyboardEvent } from 'react'
import { Lock, SendHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { useSendMessage } from '@/api/conversations'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/common/loading'
import { ApiError, errorMessage } from '@/lib/api'
import { formatDateTime, windowState } from '@/lib/format'
import type { Conversation } from '@/types/api'

export function Composer({ conversation }: { conversation: Conversation }) {
  const [text, setText] = useState('')
  const send = useSendMessage(conversation._id)
  const window24 = windowState(conversation.lastInboundAt)

  async function submit() {
    const trimmed = text.trim()
    if (!trimmed || send.isPending) return
    try {
      await send.mutateAsync({ text: trimmed })
      setText('')
    } catch (error) {
      if (error instanceof ApiError && error.code === 'WINDOW_CLOSED') {
        toast.error('The 24-hour window has closed. Only approved templates can be sent now.')
      } else {
        toast.error(errorMessage(error, 'Could not send the message'))
      }
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submit()
    }
  }

  if (!window24.open) {
    return (
      <div className="flex items-center gap-2 border-t bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <Lock className="size-4 shrink-0" />
        <span>
          {conversation.lastInboundAt
            ? `The 24-hour reply window closed ${formatDateTime(window24.closesAt?.toISOString())}. Free-form replies are blocked until the customer writes again; template messages are not available yet.`
            : 'The customer has not written yet, so free-form replies are not allowed.'}
        </span>
      </div>
    )
  }

  return (
    <div className="border-t p-3">
      <div className="flex items-end gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a reply… (Enter to send, Shift+Enter for a new line)"
          rows={2}
          maxLength={4096}
          className="max-h-40 min-h-10 resize-none"
          aria-label="Reply"
        />
        <Button onClick={() => void submit()} disabled={!text.trim() || send.isPending} size="icon" aria-label="Send">
          {send.isPending ? <Spinner className="text-current" /> : <SendHorizontal />}
        </Button>
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        Window closes {formatDateTime(window24.closesAt?.toISOString())}
        {conversation.status === 'resolved' ? ' · This conversation is resolved; set it back to open if the customer needs follow-up.' : ''}
      </p>
    </div>
  )
}
