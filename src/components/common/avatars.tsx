import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { contactHandle, hueFromId, initials } from '@/lib/format'
import { cn } from '@/lib/utils'

export function ContactAvatar({ contactId, className }: { contactId: string; className?: string }) {
  const hue = hueFromId(contactId)
  return (
    <Avatar className={cn('size-9', className)}>
      <AvatarFallback
        className="text-xs font-semibold"
        style={{ backgroundColor: `hsl(${hue} 60% 90%)`, color: `hsl(${hue} 50% 30%)` }}
      >
        {contactHandle(contactId).slice(-2)}
      </AvatarFallback>
    </Avatar>
  )
}

export function UserAvatar({ name, className }: { name: string; className?: string }) {
  const hue = hueFromId(name)
  return (
    <Avatar className={cn('size-8', className)}>
      <AvatarFallback
        className="text-[11px] font-semibold"
        style={{ backgroundColor: `hsl(${hue} 45% 88%)`, color: `hsl(${hue} 45% 28%)` }}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
