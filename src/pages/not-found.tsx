import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-4xl font-semibold">404</p>
      <p className="text-sm text-muted-foreground">That page doesn't exist.</p>
      <Button asChild variant="outline">
        <Link to="/inbox">Go to inbox</Link>
      </Button>
    </div>
  )
}
