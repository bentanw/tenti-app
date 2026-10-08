import {
  createFileRoute,
  Link,
  useLoaderData,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { ArrowLeft, Copy, Download, FileText, Loader2, Search, Send, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '#/components/confirm-dialog'
import { TranscriptStatusBadge } from '#/components/transcript-status'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { formatTimestamp, type TranscriptSegment } from '#/lib/types'
import {
  deleteTranscript,
  getTranscript,
  renameTranscript,
  sendTranscriptToDatabase,
} from '#/server/transcripts'

export const Route = createFileRoute('/_app/transcripts/$transcriptId')({
  loader: ({ params }) => getTranscript({ data: { id: params.transcriptId } }),
  head: ({ loaderData }) => ({ meta: [{ title: loaderData?.title ?? 'Transcript' }] }),
  component: TranscriptPage,
})

function TranscriptPage() {
  const t = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate()
  const [view, setView] = useState<'segments' | 'text'>('segments')
  const [query, setQuery] = useState('')
  const [sendOpen, setSendOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const rename = useServerFn(renameTranscript)
  const remove = useServerFn(deleteTranscript)

  // Poll while the background job runs.
  useEffect(() => {
    if (t.status !== 'PROCESSING') return
    const id = setInterval(() => router.invalidate(), 2500)
    return () => clearInterval(id)
  }, [t.status, router])

  const segments = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? t.segments.filter((s) => s.text.toLowerCase().includes(q)) : t.segments
  }, [t.segments, query])

  const hasSegments = t.segments.length > 0

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 px-6 py-8 md:px-12">
      <Link
        to="/transcripts"
        className="flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All transcripts
      </Link>

      <div className="grid gap-2">
        <div className="flex items-start gap-3">
          <input
            key={t.id}
            defaultValue={t.title}
            className="min-w-0 flex-1 bg-transparent font-bold text-3xl tracking-tight outline-none"
            onBlur={(e) => {
              const title = e.target.value.trim()
              if (title && title !== t.title)
                rename({ data: { id: t.id, title } }).then(() => router.invalidate())
            }}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
          <TranscriptStatusBadge status={t.status} />
        </div>
        <p className="truncate text-muted-foreground text-sm">
          {t.source}
          {t.durationSec != null && ` · ${formatTimestamp(t.durationSec)}`}
          {t.language && ` · ${t.language}`}
        </p>
        {t.page && (
          <p className="text-sm">
            Saved to{' '}
            <Link
              to="/pages/$pageId"
              params={{ pageId: t.page.id }}
              className="font-medium underline underline-offset-4"
            >
              {t.page.title || 'Untitled'}
            </Link>
          </p>
        )}
      </div>

      {t.status === 'PROCESSING' && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <p className="font-medium">Transcribing…</p>
          <p className="max-w-sm text-muted-foreground text-sm">
            Extracting audio and running Whisper. Long videos are processed in 20-minute chunks. You
            can leave this page.
          </p>
        </div>
      )}

      {t.status === 'FAILED' && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">Transcription failed</p>
          <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{t.error}</p>
        </div>
      )}

      {t.status === 'DONE' && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {hasSegments && (
              <Tabs value={view} onValueChange={(v) => setView(v as 'segments' | 'text')}>
                <TabsList>
                  <TabsTrigger value="segments">Timestamps</TabsTrigger>
                  <TabsTrigger value="text">Plain text</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            <div className="ml-auto flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigator.clipboard.writeText(t.text).then(() => toast.success('Copied'))
                }
              >
                <Copy /> Copy
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download /> Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => download(`${t.title}.txt`, t.text)}>
                    <FileText /> Text (.txt)
                  </DropdownMenuItem>
                  {hasSegments && (
                    <DropdownMenuItem onClick={() => download(`${t.title}.srt`, toSrt(t.segments))}>
                      <FileText /> Captions (.srt)
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" onClick={() => setSendOpen(true)}>
                <Send /> Send to database
              </Button>
            </div>
          </div>

          {view === 'segments' && hasSegments ? (
            <div className="grid gap-3">
              <div className="relative">
                <Search className="-translate-y-1/2 absolute top-1/2 left-2.5 size-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search transcript…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="grid gap-1">
                {segments.map((s) => (
                  <div
                    key={`${s.start}-${s.end}`}
                    className="grid grid-cols-[4.5rem_1fr] gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
                  >
                    <span className="pt-0.5 font-mono text-muted-foreground text-xs tabular-nums">
                      {formatTimestamp(s.start)}
                    </span>
                    <p className="text-sm leading-relaxed">
                      <Highlight text={s.text} query={query} />
                    </p>
                  </div>
                ))}
                {segments.length === 0 && (
                  <p className="py-6 text-center text-muted-foreground text-sm">No matches.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-7">{t.text}</p>
          )}
        </>
      )}

      <div className="border-t pt-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 /> Delete transcript
        </Button>
      </div>

      <SendToDatabaseDialog open={sendOpen} onOpenChange={setSendOpen} transcriptId={t.id} />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this transcript?"
        onConfirm={async () => {
          await remove({ data: { id: t.id } })
          navigate({ to: '/transcripts' })
        }}
      />
    </div>
  )
}

function SendToDatabaseDialog({
  open,
  onOpenChange,
  transcriptId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  transcriptId: string
}) {
  const { databases } = useLoaderData({ from: '/_app' })
  const [databaseId, setDatabaseId] = useState<string>('')
  const [withTimestamps, setWithTimestamps] = useState(false)
  const [sending, setSending] = useState(false)
  const send = useServerFn(sendTranscriptToDatabase)
  const navigate = useNavigate()
  const router = useRouter()

  async function onSend() {
    const target = databaseId || databases[0]?.id
    if (!target) return
    setSending(true)
    try {
      const { pageId } = await send({ data: { transcriptId, databaseId: target, withTimestamps } })
      await router.invalidate()
      navigate({ to: '/pages/$pageId', params: { pageId } })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send to database</DialogTitle>
          <DialogDescription>
            Creates a new page with the transcript as its content, ready to turn into a script, post
            or captions.
          </DialogDescription>
        </DialogHeader>
        {databases.length === 0 ? (
          <p className="text-muted-foreground text-sm">Create a database from the sidebar first.</p>
        ) : (
          <div className="grid gap-4">
            <Select value={databaseId || databases[0].id} onValueChange={setDatabaseId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {databases.map((db) => (
                  <SelectItem key={db.id} value={db.id}>
                    {db.icon} {db.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label className="font-normal">
              <Checkbox
                checked={withTimestamps}
                onCheckedChange={(c) => setWithTimestamps(c === true)}
              />
              Include timestamps
            </Label>
          </div>
        )}
        <DialogFooter>
          <Button onClick={onSend} disabled={sending || databases.length === 0}>
            {sending && <Loader2 className="animate-spin" />} Create page
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim()
  if (!q) return <>{text}</>
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: static split output
          <mark key={i} className="rounded bg-yellow-200 px-0.5">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  )
}

function toSrt(segments: TranscriptSegment[]) {
  const ts = (sec: number) => {
    const ms = Math.round(sec * 1000)
    const h = String(Math.floor(ms / 3_600_000)).padStart(2, '0')
    const m = String(Math.floor((ms % 3_600_000) / 60_000)).padStart(2, '0')
    const s = String(Math.floor((ms % 60_000) / 1000)).padStart(2, '0')
    return `${h}:${m}:${s},${String(ms % 1000).padStart(3, '0')}`
  }
  return segments.map((s, i) => `${i + 1}\n${ts(s.start)} --> ${ts(s.end)}\n${s.text}\n`).join('\n')
}

function download(filename: string, contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/plain' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
