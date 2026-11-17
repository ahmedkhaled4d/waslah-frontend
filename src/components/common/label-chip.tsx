import { X } from 'lucide-react'
import type { Label } from '@/types/api'
import { cn } from '@/lib/utils'

export function LabelChip({
  label,
  onRemove,
  size = 'sm',
  className,
}: {
  label: Pick<Label, 'name' | 'color'>
  onRemove?: () => void
  size?: 'xs' | 'sm'
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full border font-medium whitespace-nowrap',
        size === 'xs' ? 'px-1.5 py-px text-[11px]' : 'px-2 py-0.5 text-xs',
        className,
      )}
      style={{ borderColor: `${label.color}66`, backgroundColor: `${label.color}1a`, color: label.color }}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: label.color }} />
      <span className="truncate">{label.name}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove label ${label.name}`}
          className="-mr-0.5 rounded-full opacity-70 hover:opacity-100"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </span>
  )
}

export function ColorDot({ color, className }: { color: string; className?: string }) {
  return <span className={cn('inline-block size-2.5 shrink-0 rounded-full', className)} style={{ backgroundColor: color }} />
}
