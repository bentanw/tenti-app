import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, AudioLines, Eye, FileText, Link2, MousePointerClick, Plus } from 'lucide-react'
import { useState } from 'react'
import { NewDatabaseDialog } from '#/components/app-sidebar'
import { TranscriptStatusBadge } from '#/components/transcript-status'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { getDashboard } from '#/server/dashboard'

export const Route = createFileRoute('/_app/home')({
  head: () => ({ meta: [{ title: 'Home · Tenti' }] }),
  loader: () => getDashboard(),
  component: Dashboard,
})

function Dashboard() {
  const data = Route.useLoaderData()
  const [creating, setCreating] = useState(false)

  const stats = [
    { label: 'Pages', value: data.stats.pages, icon: FileText },
    { label: 'Transcripts', value: data.stats.transcripts, icon: AudioLines },
    { label: 'Link views', value: data.stats.linkViews, icon: Eye },
    { label: 'Link clicks', value: data.stats.linkClicks, icon: MousePointerClick },
  ]

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 px-6 py-10 md:px-12">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Home</h1>
        <p className="mt-1 text-muted-foreground">Plan, transcribe and share your content.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="gap-1 py-4">
            <CardContent className="px-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <s.icon className="size-4" /> {s.label}
              </div>
              <div className="mt-1 font-semibold text-2xl tabular-nums">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <QuickAction
          title="New database"
          description="A content pipeline with table + board views"
          icon={Plus}
          onClick={() => setCreating(true)}
        />
        <QuickAction
          title="Transcribe a video"
          description="Upload or paste a link, get a transcript"
          icon={AudioLines}
          to="/transcripts"
        />
        <QuickAction
          title="Edit link in bio"
          description={data.handle ? `Live at /${data.handle}` : 'Set up your public page'}
          icon={Link2}
          to="/links"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recently edited</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1">
            {data.recentPages.length === 0 && (
              <p className="text-muted-foreground text-sm">Nothing yet.</p>
            )}
            {data.recentPages.map((p) => (
              <Link
                key={p.id}
                to="/pages/$pageId"
                params={{ pageId: p.id }}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              >
                <span>{p.icon ?? '📄'}</span>
                <span className="truncate font-medium">{p.title || 'Untitled'}</span>
                <span className="ml-auto shrink-0 text-muted-foreground text-xs">
                  {p.database.icon} {p.database.name}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent transcripts</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1">
            {data.recentTranscripts.length === 0 && (
              <p className="text-muted-foreground text-sm">Nothing yet.</p>
            )}
            {data.recentTranscripts.map((t) => (
              <Link
                key={t.id}
                to="/transcripts/$transcriptId"
                params={{ transcriptId: t.id }}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              >
                <span className="truncate font-medium">{t.title}</span>
                <span className="ml-auto shrink-0">
                  <TranscriptStatusBadge status={t.status} />
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <NewDatabaseDialog open={creating} onOpenChange={setCreating} />
    </div>
  )
}

function QuickAction({
  title,
  description,
  icon: Icon,
  to,
  onClick,
}: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  to?: '/transcripts' | '/links'
  onClick?: () => void
}) {
  const inner = (
    <>
      <div className="flex size-9 items-center justify-center rounded-md bg-muted">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="font-medium text-sm">{title}</div>
        <div className="truncate text-muted-foreground text-xs">{description}</div>
      </div>
      <ArrowRight className="size-4 text-muted-foreground" />
    </>
  )
  const className = 'flex h-auto items-center gap-3 rounded-lg border p-3 hover:bg-accent/50'
  return to ? (
    <Link to={to} className={className}>
      {inner}
    </Link>
  ) : (
    <Button variant="ghost" className={className} onClick={onClick}>
      {inner}
    </Button>
  )
}
