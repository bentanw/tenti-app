import { ClientOnly, createFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { AudioLines, ChevronRight, Trash2 } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '#/components/confirm-dialog'
import { PropertyCell } from '#/components/database/property-cell'
import { PROPERTY_ICONS } from '#/components/database/table-view'
import { useOptionActions } from '#/components/database/use-option-actions'
import { EmojiPicker } from '#/components/emoji-picker'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import type { PropertyValue } from '#/lib/types'
import { deletePage, getPage, savePageContent, updatePage } from '#/server/pages'

const Editor = lazy(() => import('#/components/editor'))

export const Route = createFileRoute('/_app/pages/$pageId')({
  loader: ({ params }) => getPage({ data: { id: params.pageId } }),
  head: ({ loaderData }) => ({ meta: [{ title: loaderData?.title || 'Untitled' }] }),
  component: PageView,
})

function PageView() {
  const page = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate()
  const [values, setValues] = useState(page.values)
  const [confirmDelete, setConfirmDelete] = useState(false)
  useEffect(() => setValues(page.values), [page.values])

  const update = useServerFn(updatePage)
  const saveContent = useServerFn(savePageContent)
  const optionActions = useOptionActions(page.database.properties)
  const remove = useServerFn(deletePage)

  function setValue(propertyId: string, value: PropertyValue) {
    setValues((v) => ({ ...v, [propertyId]: value }))
    update({ data: { id: page.id, values: { [propertyId]: value } } }).then(
      () => router.invalidate(),
      () => toast.error('Could not save'),
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8 md:px-12">
      <div className="mb-10 flex items-center gap-1 text-muted-foreground text-sm">
        <Link
          to="/databases/$databaseId"
          params={{ databaseId: page.database.id }}
          className="rounded px-1 hover:bg-accent hover:text-foreground"
        >
          {page.database.icon} {page.database.name}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="truncate text-foreground">{page.title || 'Untitled'}</span>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto size-8"
          title="Delete page"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <EmojiPicker
        className="-ml-1 mb-2 p-1 text-5xl"
        value={page.icon}
        onChange={(icon) => update({ data: { id: page.id, icon } }).then(() => router.invalidate())}
      />
      <input
        key={page.id}
        defaultValue={page.title}
        placeholder="Untitled"
        className="w-full bg-transparent font-bold text-4xl tracking-tight outline-none placeholder:text-muted-foreground/50"
        onBlur={(e) => {
          if (e.target.value !== page.title)
            update({ data: { id: page.id, title: e.target.value } }).then(() => router.invalidate())
        }}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />

      <div className="mt-6 grid gap-0.5">
        {page.database.properties.map((p) => {
          const Icon = PROPERTY_ICONS[p.type]
          return (
            <div key={p.id} className="grid grid-cols-[10rem_1fr] items-center text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Icon className="size-3.5" /> {p.name}
              </span>
              <PropertyCell
                className="rounded-md"
                property={p}
                value={values[p.id]}
                onChange={(v) => setValue(p.id, v)}
                optionActions={optionActions(p.id)}
              />
            </div>
          )
        })}
        {page.transcripts.map((t) => (
          <div key={t.id} className="grid grid-cols-[10rem_1fr] items-center text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <AudioLines className="size-3.5" /> Transcript
            </span>
            <Link
              to="/transcripts/$transcriptId"
              params={{ transcriptId: t.id }}
              className="h-9 px-2 leading-9 underline-offset-4 hover:underline"
            >
              {t.title}
            </Link>
          </div>
        ))}
      </div>

      <hr className="my-6" />

      <ClientOnly fallback={<EditorSkeleton />}>
        <Suspense fallback={<EditorSkeleton />}>
          <Editor
            key={page.id}
            initialContent={page.content}
            onSave={(content) =>
              saveContent({ data: { id: page.id, content } }).catch(() =>
                toast.error('Could not save page'),
              )
            }
          />
        </Suspense>
      </ClientOnly>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this page?"
        onConfirm={async () => {
          await remove({ data: { id: page.id } })
          navigate({ to: '/databases/$databaseId', params: { databaseId: page.database.id } })
        }}
      />
    </div>
  )
}

function EditorSkeleton() {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-5 w-2/3" />
    </div>
  )
}
