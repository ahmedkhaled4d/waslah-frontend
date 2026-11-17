import { Check } from 'lucide-react'
import { PALETTE, contrastText } from '@/lib/colors'
import { cn } from '@/lib/utils'

export function ColorPicker({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (color: string) => void
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)} role="radiogroup" aria-label="Color">
      {PALETTE.map((color) => {
        const selected = color === value
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={color}
            onClick={() => onChange(color)}
            className={cn(
              'flex size-6 items-center justify-center rounded-full border transition-transform focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
              selected ? 'scale-110 border-foreground' : 'border-transparent hover:scale-105',
            )}
            style={{ backgroundColor: color }}
          >
            {selected ? <Check className="size-3.5" style={{ color: contrastText(color) }} /> : null}
          </button>
        )
      })}
    </div>
  )
}
