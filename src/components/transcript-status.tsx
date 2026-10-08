import { Loader2 } from 'lucide-react'
import { Badge } from '#/components/ui/badge'

export function TranscriptStatusBadge({ status }: { status: 'PROCESSING' | 'DONE' | 'FAILED' }) {
  if (status === 'PROCESSING')
    return (
      <Badge variant="secondary">
        <Loader2 className="animate-spin" /> Transcribing
      </Badge>
    )
  if (status === 'FAILED') return <Badge variant="destructive">Failed</Badge>
  return <Badge variant="outline">Done</Badge>
}
