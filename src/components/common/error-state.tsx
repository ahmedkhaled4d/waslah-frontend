import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown
  onRetry?: () => void
  className?: string
}) {
  return (
    <div className={cn('flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center', className)}>
      <AlertTriangle className="size-5 text-destructive" />
      <p className="text-sm text-muted-foreground">{errorMessage(error)}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  )
}
