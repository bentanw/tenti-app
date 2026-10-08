import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { FileVideo, Link2, Loader2, UploadCloud } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { TranscriptStatusBadge } from '#/components/transcript-status'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { formatTimestamp } from '#/lib/types'
import { cn } from '#/lib/utils'
import { listTranscripts, startTranscription } from '#/server/transcripts'

export const Route = createFileRoute('/_app/transcripts/')({
  loader: () => listTranscripts(),
  head: () => ({ meta: [{ title: 'Transcribe' }] }),
  component: TranscriptsPage,
})

function TranscriptsPage() {
  const transcripts = Route.useLoaderData()

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-8 px-6 py-10 md:px-12">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Transcribe</h1>
        <p className="mt-1 text-muted-foreground">
          Drop in a video or paste a link. Whisper turns it into a timestamped transcript you can
          send straight into a database.
        </p>
      </div>

      <NewTranscriptCard />

      <section>
        <h2 className="mb-3 font-semibold">Recent</h2>
        {transcripts.length === 0 ? (
          <p className="text-muted-foreground text-sm">No transcripts yet.</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {transcripts.map((t) => (
              <Link
                key={t.id}
                to="/transcripts/$transcriptId"
                params={{ transcriptId: t.id }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
              >
                <FileVideo className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-sm">{t.title}</div>
                  <div className="truncate text-muted-foreground text-xs">
                    {new Date(t.createdAt).toLocaleString()}
                    {t.durationSec != null && ` · ${formatTimestamp(t.durationSec)}`}
                    {t.page && ` · in “${t.page.title || 'Untitled'}”`}
                  </div>
                </div>
                <TranscriptStatusBadge status={t.status} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function NewTranscriptCard() {
  const [mode, setMode] = useState<'file' | 'url'>('file')
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [dragging, setDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const start = useServerFn(startTranscription)
  const navigate = useNavigate()

  const canSubmit = mode === 'file' ? !!file : url.trim().length > 0

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    const form = new FormData()
    if (mode === 'file' && file) form.append('file', file)
    else form.append('url', url.trim())
    form.append('title', title)
    setSubmitting(true)
    try {
      const { id } = await start({ data: form })
      navigate({ to: '/transcripts/$transcriptId', params: { transcriptId: id } })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New transcript</CardTitle>
        <CardDescription>
          Video or audio files (mp4, mov, mp3, m4a, wav…), direct media links, or YouTube / TikTok /
          Instagram URLs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'file' | 'url')}>
            <TabsList>
              <TabsTrigger value="file">
                <UploadCloud /> Upload
              </TabsTrigger>
              <TabsTrigger value="url">
                <Link2 /> Paste link
              </TabsTrigger>
            </TabsList>
            <TabsContent value="file" className="mt-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragging(false)
                  const dropped = e.dataTransfer.files[0]
                  if (dropped) setFile(dropped)
                }}
                className={cn(
                  'flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors',
                  dragging ? 'border-primary bg-accent' : 'hover:bg-muted/40',
                )}
              >
                <UploadCloud className="size-8 text-muted-foreground" />
                {file ? (
                  <span className="font-medium text-sm">
                    {file.name}{' '}
                    <span className="text-muted-foreground">
                      ({(file.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground text-sm">
                    Drag a video here or <span className="text-foreground underline">browse</span>
                  </span>
                )}
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="video/*,audio/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </TabsContent>
            <TabsContent value="url" className="mt-3">
              <Input
                placeholder="https://www.youtube.com/watch?v=…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </TabsContent>
          </Tabs>
          <Input
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Button type="submit" disabled={!canSubmit || submitting} className="justify-self-start">
            {submitting && <Loader2 className="animate-spin" />}
            {submitting ? 'Uploading…' : 'Transcribe'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
