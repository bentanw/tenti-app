import { Link } from '@tanstack/react-router'
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckSquare,
  ChevronDown,
  CircleDot,
  Hash,
  Link2,
  Maximize2,
  Plus,
  Trash2,
  Type,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Input } from '#/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover'
import type { DatabaseSort, SortDirection } from '#/lib/sort'
import {
  type PageValues,
  PROPERTY_TYPE_LABELS,
  PROPERTY_TYPES,
  type PropertyType,
  type PropertyValue,
} from '#/lib/types'
import { type CellProperty, PropertyCell, TextCell } from './property-cell'
import type { OptionActions } from './use-option-actions'

export const PROPERTY_ICONS: Record<PropertyType, React.ComponentType<{ className?: string }>> = {
  TEXT: Type,
  NUMBER: Hash,
  SELECT: CircleDot,
  DATE: Calendar,
  CHECKBOX: CheckSquare,
  URL: Link2,
}

export type TableRow = {
  id: string
  title: string
  icon: string | null
  values: PageValues
  createdAt?: string
  updatedAt?: string
}

export type DatabaseActions = {
  addRow: (values?: PageValues) => void
  updateTitle: (pageId: string, title: string) => void
  updateValue: (pageId: string, propertyId: string, value: PropertyValue) => void
  deleteRow: (pageId: string) => void
  addProperty: (name: string, type: PropertyType) => void
  renameProperty: (propertyId: string, name: string) => void
  deleteProperty: (propertyId: string) => void
  optionActions: (propertyId: string) => OptionActions
  setSort: (sort: DatabaseSort | null) => void
}

export function TableView({
  properties,
  rows,
  sort,
  actions,
}: {
  properties: CellProperty[]
  rows: TableRow[]
  sort: DatabaseSort | null
  actions: DatabaseActions
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-y text-muted-foreground">
            <th className="w-72 min-w-56 p-0 text-left font-normal">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex w-full items-center gap-1.5 px-2 py-2 hover:bg-muted/50">
                  <Type className="size-3.5" /> Name
                  <SortIndicator direction={sort?.key === 'title' ? sort.direction : undefined} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <SortItems sortKey="title" sort={sort} onSort={actions.setSort} />
                </DropdownMenuContent>
              </DropdownMenu>
            </th>
            {properties.map((p) => (
              <th key={p.id} className="min-w-40 border-l p-0 text-left font-normal">
                <PropertyHeader property={p} sort={sort} actions={actions} />
              </th>
            ))}
            <th className="w-10 border-l p-0">
              <AddPropertyButton onAdd={actions.addProperty} />
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="group border-b hover:bg-muted/30">
              <td className="p-0">
                <div className="flex items-center">
                  {row.icon && <span className="pl-2">{row.icon}</span>}
                  <TextCell
                    className="font-medium"
                    placeholder="Untitled"
                    value={row.title}
                    onCommit={(v) => actions.updateTitle(row.id, v)}
                  />
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="mr-1 h-6 gap-1 px-1.5 text-muted-foreground text-xs opacity-0 group-hover:opacity-100"
                  >
                    <Link to="/pages/$pageId" params={{ pageId: row.id }}>
                      <Maximize2 className="size-3" /> Open
                    </Link>
                  </Button>
                </div>
              </td>
              {properties.map((p) => (
                <td key={p.id} className="border-l p-0">
                  <PropertyCell
                    property={p}
                    value={row.values[p.id]}
                    onChange={(v) => actions.updateValue(row.id, p.id, v)}
                    optionActions={actions.optionActions(p.id)}
                  />
                </td>
              ))}
              <td className="border-l p-0 text-center">
                <button
                  type="button"
                  title="Delete row"
                  className="p-2 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                  onClick={() => actions.deleteRow(row.id)}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={() => actions.addRow()}
        className="flex w-full items-center gap-1.5 border-b px-2 py-2 text-muted-foreground text-sm hover:bg-muted/40"
      >
        <Plus className="size-4" /> New
      </button>
    </div>
  )
}

function PropertyHeader({
  property,
  sort,
  actions,
}: {
  property: CellProperty
  sort: DatabaseSort | null
  actions: DatabaseActions
}) {
  const Icon = PROPERTY_ICONS[property.type]
  const [name, setName] = useState(property.name)
  return (
    <DropdownMenu onOpenChange={(open) => open && setName(property.name)}>
      <DropdownMenuTrigger className="flex w-full items-center gap-1.5 px-2 py-2 hover:bg-muted/50">
        <Icon className="size-3.5" />
        <span className="truncate">{property.name}</span>
        <SortIndicator direction={sort?.key === property.id ? sort.direction : undefined} />
        <ChevronDown className="ml-auto size-3 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <div className="p-1">
          <Input
            className="h-8"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter' && name.trim()) actions.renameProperty(property.id, name.trim())
            }}
            onBlur={() =>
              name.trim() &&
              name !== property.name &&
              actions.renameProperty(property.id, name.trim())
            }
          />
        </div>
        <DropdownMenuLabel className="font-normal text-muted-foreground text-xs">
          Type: {PROPERTY_TYPE_LABELS[property.type]}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <SortItems sortKey={property.id} sort={sort} onSort={actions.setSort} />
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => actions.deleteProperty(property.id)}>
          <Trash2 /> Delete property
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SortIndicator({ direction }: { direction?: SortDirection }) {
  if (!direction) return null
  const Icon = direction === 'asc' ? ArrowUp : ArrowDown
  return <Icon className="size-3.5 text-foreground" />
}

/** "Sort ascending / descending" menu items; picking the active one again clears the sort. */
function SortItems({
  sortKey,
  sort,
  onSort,
}: {
  sortKey: string
  sort: DatabaseSort | null
  onSort: (sort: DatabaseSort | null) => void
}) {
  const active = sort?.key === sortKey ? sort.direction : undefined
  return (
    <>
      {(['asc', 'desc'] as const).map((direction) => (
        <DropdownMenuItem
          key={direction}
          onClick={() => onSort(active === direction ? null : { key: sortKey, direction })}
        >
          {direction === 'asc' ? <ArrowUp /> : <ArrowDown />}
          Sort {direction === 'asc' ? 'ascending' : 'descending'}
          {active === direction && (
            <span className="ml-auto text-muted-foreground text-xs">On</span>
          )}
        </DropdownMenuItem>
      ))}
    </>
  )
}

export function AddPropertyButton({
  onAdd,
}: {
  onAdd: (name: string, type: PropertyType) => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<PropertyType>('TEXT')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Add property"
          className="flex h-9 w-full items-center justify-center text-muted-foreground hover:bg-muted/50"
        >
          <Plus className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim()) return
            onAdd(name.trim(), type)
            setName('')
            setType('TEXT')
            setOpen(false)
          }}
        >
          <Input
            autoFocus
            placeholder="Property name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-1">
            {PROPERTY_TYPES.map((t) => {
              const Icon = PROPERTY_ICONS[t]
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  data-selected={t === type}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent data-[selected=true]:bg-accent data-[selected=true]:font-medium"
                >
                  <Icon className="size-3.5" /> {PROPERTY_TYPE_LABELS[t]}
                </button>
              )
            })}
          </div>
          <Button type="submit" size="sm" disabled={!name.trim()}>
            Add property
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}
