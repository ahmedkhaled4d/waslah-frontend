import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-4 animate-spin text-muted-foreground', className)} aria-label="Loading" />
}

export function FullPageSpinner() {
  return (
    <div className="flex h-full min-h-screen items-center justify-center">
      <Spinner className="size-6" />
    </div>
  )
}

export function CenteredSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-1 items-center justify-center p-8', className)}>
      <Spinner className="size-5" />
    </div>
  )
}
