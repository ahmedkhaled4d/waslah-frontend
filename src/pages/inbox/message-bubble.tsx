import { AlertCircle, Check, CheckCheck, Clock, FileText, Image as ImageIcon, MapPin, Mic, Sticker, Video } from 'lucide-react'
import { formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Message } from '@/types/api'

function StatusIcon({ status }: { status: Message['status'] }) {
  const cls = 'size-3.5'
  switch (status) {
    case 'queued':
      return <Clock className={cls} aria-label="Queued" />
    case 'sent':
      return <Check className={cls} aria-label="Sent" />
    case 'delivered':
      return <CheckCheck className={cls} aria-label="Delivered" />
    case 'read':
      return <CheckCheck className={cn(cls, 'text-sky-500')} aria-label="Read" />
    case 'failed':
      return <AlertCircle className={cn(cls, 'text-destructive')} aria-label="Failed" />
    default:
      return null
  }
}

function MediaPlaceholder({ message }: { message: Message }) {
  const media = message.media
  const icon =
    message.type === 'image' ? ImageIcon
    : message.type === 'video' ? Video
    : message.type === 'audio' ? Mic
    : message.type === 'sticker' ? Sticker
    : FileText
  const Icon = icon
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed border-current/30 px-2.5 py-2 text-xs">
      <Icon className="size-4 shrink-0 opacity-70" />
      <div className="min-w-0">
        <div className="truncate font-medium capitalize">{media?.filename ?? message.type}</div>
        <div className="truncate opacity-70">{media?.mimeType ?? 'Media preview not available yet'}</div>
      </div>
    </div>
  )
}

export function MessageBubble({ message, senderName }: { message: Message; senderName?: string }) {
  const outbound = message.direction === 'outbound'
  const isMedia = Boolean(message.media)
  const isLocation = Boolean(message.location)
  const isReaction = message.type === 'reaction'
  const isReply = Boolean(message.reply)
  const isUnsupported = !message.text && !isMedia && !isLocation && !isReaction && !isReply

  if (isReaction) {
    return (
      <div className={cn('flex', outbound ? 'justify-end' : 'justify-start')}>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {outbound ? 'You' : 'Customer'} reacted {message.reaction?.emoji ?? ''} · {formatTime(message.sentAt)}
        </span>
      </div>
    )
  }

  return (
    <div className={cn('flex', outbound ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-xs',
          outbound
            ? 'rounded-br-sm bg-primary text-primary-foreground'
            : 'rounded-bl-sm border bg-card text-card-foreground',
          message.status === 'failed' && 'ring-1 ring-destructive',
        )}
      >
        {outbound && senderName ? <div className="mb-0.5 text-[11px] font-medium opacity-80">{senderName}</div> : null}
        {message.replyToWaMessageId ? (
          <div className="mb-1 border-l-2 border-current/40 pl-2 text-[11px] opacity-70">Replying to a message</div>
        ) : null}
        {isMedia ? <MediaPlaceholder message={message} /> : null}
        {isLocation && message.location ? (
          <a
            href={`https://maps.google.com/?q=${message.location.latitude},${message.location.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 underline-offset-2 hover:underline"
          >
            <MapPin className="size-4 shrink-0" />
            <span className="truncate">{message.location.name ?? message.location.address ?? 'Shared location'}</span>
          </a>
        ) : null}
        {isReply && !message.text ? <div className="italic opacity-80">Selected: {message.reply?.title}</div> : null}
        {message.text ? (
          <p className={cn('whitespace-pre-wrap break-words', isMedia && 'mt-1.5')}>{message.text}</p>
        ) : null}
        {isUnsupported ? <p className="italic opacity-70">Unsupported message type: {message.type}</p> : null}
        {message.error ? (
          <p className="mt-1 text-[11px] text-destructive-foreground/90">
            Failed: {message.error.title ?? message.error.message ?? `error ${message.error.code}`}
          </p>
        ) : null}
        <div className={cn('mt-1 flex items-center justify-end gap-1 text-[10px]', outbound ? 'opacity-80' : 'text-muted-foreground')}>
          <span>{formatTime(message.sentAt)}</span>
          {outbound ? <StatusIcon status={message.status} /> : null}
        </div>
      </div>
    </div>
  )
}
