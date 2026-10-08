import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Eye,
  MousePointerClick,
  Plus,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { LinkPage } from '#/components/link-page'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'
import { Textarea } from '#/components/ui/textarea'
import { LINK_THEMES, type LinkTheme } from '#/lib/types'
import { cn } from '#/lib/utils'
import {
  createLink,
  deleteLink,
  getMyProfile,
  reorderLinks,
  updateLink,
  updateProfile,
} from '#/server/links'

export const Route = createFileRoute('/_app/links')({
  loader: () => getMyProfile(),
  head: () => ({ meta: [{ title: 'Link in bio' }] }),
  component: LinksPage,
})

function LinksPage() {
  const profile = Route.useLoaderData()
  const router = useRouter()
  const refresh = () => router.invalidate()

  // Drafts drive the live preview; they're persisted on blur.
  const [draft, setDraft] = useState(profile)
  useEffect(() => setDraft(profile), [profile])
  const [host, setHost] = useState('')
  useEffect(() => setHost(window.location.host), [])

  const saveProfile = useServerFn(updateProfile)
  const fns = {
    create: useServerFn(createLink),
    update: useServerFn(updateLink),
    remove: useServerFn(deleteLink),
    reorder: useServerFn(reorderLinks),
  }

  const onError = (err: unknown) => {
    toast.error(readableError(err))
    refresh()
  }

  function persist(patch: Omit<ProfilePatch, 'id'>) {
    saveProfile({ data: { id: profile.id, ...patch } }).then(refresh, onError)
  }

  function move(index: number, dir: -1 | 1) {
    const j = index + dir
    if (j < 0 || j >= draft.links.length) return
    const links = [...draft.links]
    ;[links[index], links[j]] = [links[j], links[index]]
    setDraft((d) => ({ ...d, links }))
    fns.reorder({ data: { ids: links.map((l) => l.id) } }).then(refresh, onError)
  }

  const totalClicks = profile.links.reduce((sum, l) => sum + l.clicks, 0)
  const publicPath = `/${profile.handle}`

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-10 md:px-12 lg:grid-cols-[1fr_360px]">
      <div className="grid content-start gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-bold text-3xl tracking-tight">Link in bio</h1>
            <a
              href={publicPath}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
            >
              {host}
              {publicPath} <ExternalLink className="size-3" />
            </a>
          </div>
          <div className="flex gap-4 text-sm">
            <Stat icon={Eye} label="Views" value={profile.views} />
            <Stat icon={MousePointerClick} label="Clicks" value={totalClicks} />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Display name">
              <Input
                value={draft.displayName}
                onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
                onBlur={() =>
                  draft.displayName.trim() &&
                  draft.displayName !== profile.displayName &&
                  persist({ displayName: draft.displayName.trim() })
                }
              />
            </Field>
            <Field label="Handle">
              <div className="flex items-center rounded-md border pl-3 focus-within:ring-[3px] focus-within:ring-ring/50">
                <span className="text-muted-foreground text-sm">/</span>
                <input
                  className="h-9 min-w-0 flex-1 bg-transparent pr-3 pl-0.5 text-sm outline-none"
                  value={draft.handle}
                  onChange={(e) => setDraft({ ...draft, handle: e.target.value.toLowerCase() })}
                  onBlur={() =>
                    draft.handle !== profile.handle && persist({ handle: draft.handle })
                  }
                />
              </div>
            </Field>
            <Field label="Bio" className="sm:col-span-2">
              <Textarea
                rows={2}
                value={draft.bio ?? ''}
                onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                onBlur={() => draft.bio !== profile.bio && persist({ bio: draft.bio || null })}
              />
            </Field>
            <Field label="Avatar URL" className="sm:col-span-2">
              <Input
                placeholder="https://…"
                value={draft.avatarUrl ?? ''}
                onChange={(e) => setDraft({ ...draft, avatarUrl: e.target.value })}
                onBlur={() =>
                  (draft.avatarUrl ?? '') !== (profile.avatarUrl ?? '') &&
                  persist({ avatarUrl: draft.avatarUrl ?? '' })
                }
              />
            </Field>
            <Field label="Theme" className="sm:col-span-2">
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(LINK_THEMES) as LinkTheme[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setDraft({ ...draft, theme: key })
                      persist({ theme: key })
                    }}
                    className={cn(
                      'grid gap-1.5 rounded-lg p-1.5 text-xs ring-1 ring-border',
                      draft.theme === key && 'ring-2 ring-primary',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-12 items-center justify-center rounded-md',
                        LINK_THEMES[key].page,
                      )}
                    >
                      <div className={cn('h-3 w-10 rounded-full', LINK_THEMES[key].button)} />
                    </div>
                    {LINK_THEMES[key].label}
                  </button>
                ))}
              </div>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Links</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <AddLinkForm
              onAdd={(title, url) =>
                fns.create({ data: { profileId: profile.id, title, url } }).then(refresh, onError)
              }
            />
            {draft.links.map((link, i) => (
              <div key={link.id} className="flex items-start gap-2 rounded-lg border p-3">
                <div className="flex flex-col">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    disabled={i === draft.links.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                </div>
                <div className="grid min-w-0 flex-1 gap-1">
                  <input
                    className="bg-transparent font-medium text-sm outline-none"
                    value={link.title}
                    onChange={(e) => updateDraftLink(setDraft, link.id, { title: e.target.value })}
                    onBlur={(e) => {
                      const original = profile.links.find((l) => l.id === link.id)
                      if (e.target.value.trim() && e.target.value !== original?.title)
                        fns
                          .update({ data: { id: link.id, title: e.target.value.trim() } })
                          .then(refresh, onError)
                    }}
                  />
                  <input
                    className="bg-transparent text-muted-foreground text-xs outline-none"
                    value={link.url}
                    onChange={(e) => updateDraftLink(setDraft, link.id, { url: e.target.value })}
                    onBlur={(e) => {
                      const original = profile.links.find((l) => l.id === link.id)
                      if (e.target.value !== original?.url)
                        fns
                          .update({ data: { id: link.id, url: e.target.value.trim() } })
                          .then(refresh, onError)
                    }}
                  />
                  <span className="text-muted-foreground text-xs">{link.clicks} clicks</span>
                </div>
                <Switch
                  checked={link.enabled}
                  onCheckedChange={(enabled) => {
                    updateDraftLink(setDraft, link.id, { enabled })
                    fns.update({ data: { id: link.id, enabled } }).then(refresh, onError)
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => fns.remove({ data: { id: link.id } }).then(refresh, onError)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Phone preview */}
      <div className="hidden lg:block">
        <div className="sticky top-8">
          <div className="mx-auto h-[680px] w-[340px] overflow-hidden rounded-[2.5rem] border-[10px] border-zinc-900 shadow-xl">
            <div className="h-full overflow-y-auto">
              <LinkPage
                className="min-h-full"
                profile={draft}
                links={draft.links.filter((l) => l.enabled)}
                hrefFor={(l) => l.url}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

type Profile = Awaited<ReturnType<typeof getMyProfile>>
type ProfilePatch = Parameters<typeof updateProfile>[0]['data']
function updateDraftLink(
  setDraft: React.Dispatch<React.SetStateAction<Profile>>,
  id: string,
  patch: Partial<Profile['links'][number]>,
) {
  setDraft((d) => ({ ...d, links: d.links.map((l) => (l.id === id ? { ...l, ...patch } : l)) }))
}

function AddLinkForm({ onAdd }: { onAdd: (title: string, url: string) => void }) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim() || !url.trim()) return
        const normalized = /^https?:\/\//.test(url.trim()) ? url.trim() : `https://${url.trim()}`
        onAdd(title.trim(), normalized)
        setTitle('')
        setUrl('')
      }}
    >
      <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Input placeholder="youtube.com/@you" value={url} onChange={(e) => setUrl(e.target.value)} />
      <Button type="submit" disabled={!title.trim() || !url.trim()}>
        <Plus /> Add
      </Button>
    </form>
  )
}

function Field({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
      <Icon className="size-4 text-muted-foreground" />
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  )
}

/** Zod errors come back as a JSON array string; show the first message. */
function readableError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err)
  try {
    const parsed = JSON.parse(message)
    if (Array.isArray(parsed) && parsed[0]?.message) return parsed[0].message as string
  } catch {}
  return message
}
