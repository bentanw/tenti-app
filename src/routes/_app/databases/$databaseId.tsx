import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Kanban, MoreHorizontal, Table2, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { ConfirmDialog } from '#/components/confirm-dialog'
import { BoardView } from '#/components/database/board-view'
import { SortMenu } from '#/components/database/sort-menu'
import { type DatabaseActions, TableView } from '#/components/database/table-view'
import { useOptionActions } from '#/components/database/use-option-actions'
import { EmojiPicker } from '#/components/emoji-picker'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { type DatabaseSort, sortRows } from '#/lib/sort'
import {
  addProperty,
  deleteDatabase,
  deleteProperty,
  getDatabase,
  updateDatabase,
  updateProperty,
} from '#/server/databases'
import { createPage, deletePage, updatePage } from '#/server/pages'

export const Route = createFileRoute('/_app/databases/$databaseId')({
  validateSearch: z.object({
    view: z.enum(['table', 'board']).optional(),
    groupBy: z.string().optional(),
  }),
  loader: ({ params }) => getDatabase({ data: { id: params.databaseId } }),
  head: ({ loaderData }) => ({ meta: [{ title: loaderData?.name ?? 'Database' }] }),
  component: DatabasePage,
})

function DatabasePage() {
  const db = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const router = useRouter()

  // Local copy for optimistic updates; re-synced whenever the loader refetches.
  const [rows, setRows] = useState(db.pages)
  const [confirmDelete, setConfirmDelete] = useState(false)
  useEffect(() => setRows(db.pages), [db.pages])
  const [sort, setSortState] = useState<DatabaseSort | null>(db.sort)
  useEffect(() => setSortState(db.sort), [db.sort])

  const fns = {
    createPage: useServerFn(createPage),
    updatePage: useServerFn(updatePage),
    deletePage: useServerFn(deletePage),
    addProperty: useServerFn(addProperty),
    updateProperty: useServerFn(updateProperty),
    deleteProperty: useServerFn(deleteProperty),
    updateDatabase: useServerFn(updateDatabase),
    deleteDatabase: useServerFn(deleteDatabase),
  }

  const refresh = () => router.invalidate()
  const onError = (err: unknown) => {
    toast.error(err instanceof Error ? err.message : 'Something went wrong')
    refresh()
  }

  const optionActions = useOptionActions(db.properties)

  const actions: DatabaseActions = {
    addRow: (values) => {
      fns.createPage({ data: { databaseId: db.id, values } }).then(refresh, onError)
    },
    updateTitle: (pageId, title) => {
      setRows((rs) => rs.map((r) => (r.id === pageId ? { ...r, title } : r)))
      fns.updatePage({ data: { id: pageId, title } }).catch(onError)
    },
    updateValue: (pageId, propertyId, value) => {
      setRows((rs) =>
        rs.map((r) =>
          r.id === pageId ? { ...r, values: { ...r.values, [propertyId]: value } } : r,
        ),
      )
      // Refetch so the sidebar calendar and board stay in sync
      fns
        .updatePage({ data: { id: pageId, values: { [propertyId]: value } } })
        .then(refresh, onError)
    },
    deleteRow: (pageId) => {
      setRows((rs) => rs.filter((r) => r.id !== pageId))
      fns.deletePage({ data: { id: pageId } }).then(refresh, onError)
    },
    addProperty: (name, type) => {
      fns.addProperty({ data: { databaseId: db.id, name, type } }).then(refresh, onError)
    },
    renameProperty: (id, name) => {
      fns.updateProperty({ data: { id, name } }).then(refresh, onError)
    },
    deleteProperty: (id) => {
      fns.deleteProperty({ data: { id } }).then(refresh, onError)
    },
    optionActions,
    setSort: (next) => {
      setSortState(next)
      fns.updateDatabase({ data: { id: db.id, sort: next } }).catch(onError)
    },
  }

  const sortedRows = sortRows(rows, db.properties, sort)

  const selectProps = db.properties.filter((p) => p.type === 'SELECT')
  const groupBy = selectProps.find((p) => p.id === search.groupBy) ?? selectProps[0]
  const view = search.view === 'board' && groupBy ? 'board' : (search.view ?? 'table')

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 md:px-12">
      <div className="mb-6 flex items-start gap-3">
        <EmojiPicker
          className="p-1 text-4xl"
          value={db.icon}
          onChange={(icon) => fns.updateDatabase({ data: { id: db.id, icon } }).then(refresh)}
        />
        <div className="min-w-0 flex-1">
          <input
            key={db.id}
            defaultValue={db.name}
            className="w-full bg-transparent font-bold text-3xl tracking-tight outline-none"
            onBlur={(e) => {
              const name = e.target.value.trim()
              if (name && name !== db.name)
                fns.updateDatabase({ data: { id: db.id, name } }).then(refresh)
            }}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
          <input
            key={`${db.id}-desc`}
            defaultValue={db.description ?? ''}
            placeholder="Add a description…"
            className="mt-1 w-full bg-transparent text-muted-foreground text-sm outline-none"
            onBlur={(e) => {
              const description = e.target.value.trim() || null
              if (description !== db.description)
                fns.updateDatabase({ data: { id: db.id, description } }).then(refresh)
            }}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 /> Delete database
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`Delete "${db.name}"?`}
          description="This deletes the database and every page in it."
          onConfirm={async () => {
            await fns.deleteDatabase({ data: { id: db.id } })
            await router.invalidate()
            navigate({ to: '/home' })
          }}
        />
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-3">
        <Tabs
          value={view}
          onValueChange={(v) =>
            navigate({ search: (s) => ({ ...s, view: v as 'table' | 'board' }) })
          }
        >
          <TabsList>
            <TabsTrigger value="table">
              <Table2 /> Table
            </TabsTrigger>
            <TabsTrigger value="board" disabled={!groupBy}>
              <Kanban /> Board
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {view === 'board' && selectProps.length > 1 && groupBy && (
          <Select
            value={groupBy.id}
            onValueChange={(id) => navigate({ search: (s) => ({ ...s, groupBy: id }) })}
          >
            <SelectTrigger size="sm" className="w-44">
              <span className="text-muted-foreground">Group by</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {selectProps.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="ml-auto flex items-center gap-2">
          <SortMenu sort={sort} properties={db.properties} onChange={actions.setSort} />
          <Button size="sm" onClick={() => actions.addRow()}>
            New page
          </Button>
        </div>
      </div>

      {view === 'board' && groupBy ? (
        <BoardView
          groupBy={groupBy}
          properties={db.properties}
          rows={sortedRows}
          actions={actions}
        />
      ) : (
        <TableView properties={db.properties} rows={sortedRows} sort={sort} actions={actions} />
      )}
    </div>
  )
}
