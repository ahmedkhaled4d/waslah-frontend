import { useState } from 'react'
import { Check, Plus, Tag } from 'lucide-react'
import { useLabels } from '@/api/labels'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ColorDot } from './label-chip'
import { cn } from '@/lib/utils'

export function LabelPicker({
  selectedIds,
  onAdd,
  onRemove,
  disabled,
  trigger,
}: {
  selectedIds: string[]
  onAdd: (labelId: string) => void
  onRemove: (labelId: string) => void
  disabled?: boolean
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const { data: labels } = useLabels()
  const selected = new Set(selectedIds)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="xs" disabled={disabled} aria-label="Edit labels">
            <Plus /> Label
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search labels…" />
          <CommandList>
            <CommandEmpty>
              <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                <Tag className="size-4" />
                No labels yet
              </div>
            </CommandEmpty>
            <CommandGroup>
              {(labels ?? []).map((label) => {
                const isSelected = selected.has(label._id)
                return (
                  <CommandItem
                    key={label._id}
                    value={label.name}
                    onSelect={() => (isSelected ? onRemove(label._id) : onAdd(label._id))}
                  >
                    <ColorDot color={label.color} />
                    <span className="flex-1 truncate">{label.name}</span>
                    <Check className={cn('size-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
