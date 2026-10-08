import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { cn } from '#/lib/utils'
import { type CellProperty, OptionBadge } from './property-cell'
import type { DatabaseActions, TableRow } from './table-view'

/** Kanban grouped by a SELECT property. Cards are dragged between columns with native DnD. */
export function BoardView({
  groupBy,
  properties,
  rows,
  actions,
}: {
  groupBy: CellProperty
  properties: CellProperty[]
  rows: TableRow[]
  actions: DatabaseActions
}) {
  const [dragOver, setDragOver] = useState<string | null>(null)
  const columns = [
    { id: null as string | null, label: `No ${groupBy.name}`, option: null },
    ...groupBy.options.map((o) => ({ id: o.id as string | null, label: o.name, option: o })),
  ]
  const otherSelects = properties.filter((p) => p.type === 'SELECT' && p.id !== groupBy.id)
  const dateProp = properties.find((p) => p.type === 'DATE')

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {columns.map((col) => {
        const key = col.id ?? '__none'
        const cards = rows.filter((r) => {
          const v = r.values[groupBy.id]
          return col.id === null ? !groupBy.options.some((o) => o.id === v) : v === col.id
        })
        if (col.id === null && cards.length === 0) return null
        return (
          // biome-ignore lint/a11y/noStaticElementInteractions: column is a drop target for cards
          <div
            key={key}
            className={cn(
              'flex w-64 shrink-0 flex-col gap-2 rounded-lg p-1.5 transition-colors',
              dragOver === key ? 'bg-accent' : 'bg-muted/40',
            )}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(key)
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(null)
              const pageId = e.dataTransfer.getData('text/page-id')
              if (pageId) actions.updateValue(pageId, groupBy.id, col.id)
            }}
          >
            <div className="flex items-center gap-2 px-1.5 pt-1 text-sm">
              {col.option ? (
                <OptionBadge option={col.option} />
              ) : (
                <span className="text-muted-foreground">{col.label}</span>
              )}
              <span className="text-muted-foreground text-xs">{cards.length}</span>
            </div>
            {cards.map((row) => (
              <Link
                key={row.id}
                to="/pages/$pageId"
                params={{ pageId: row.id }}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/page-id', row.id)}
                className="grid gap-1.5 rounded-md border bg-background p-2.5 text-sm shadow-xs hover:bg-accent/40"
              >
                <span className="font-medium">
                  {row.icon && <span className="mr-1">{row.icon}</span>}
                  {row.title || <span className="text-muted-foreground">Untitled</span>}
                </span>
                <div className="flex flex-wrap gap-1">
                  {otherSelects.map((p) => {
                    const opt = p.options.find((o) => o.id === row.values[p.id])
                    return opt ? <OptionBadge key={p.id} option={opt} /> : null
                  })}
                </div>
                {dateProp &&
                  typeof row.values[dateProp.id] === 'string' &&
                  row.values[dateProp.id] && (
                    <span className="text-muted-foreground text-xs">
                      {new Date(`${row.values[dateProp.id]}T00:00:00`).toLocaleDateString(
                        undefined,
                        {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        },
                      )}
                    </span>
                  )}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => actions.addRow(col.id ? { [groupBy.id]: col.id } : undefined)}
              className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-muted-foreground text-sm hover:bg-accent"
            >
              <Plus className="size-4" /> New
            </button>
          </div>
        )
      })}
    </div>
  )
}
