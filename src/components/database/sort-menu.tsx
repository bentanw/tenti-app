import { ArrowDown, ArrowUp, ArrowUpDown, X } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { BUILT_IN_SORT_KEYS, type DatabaseSort } from '#/lib/sort'
import { cn } from '#/lib/utils'
import type { CellProperty } from './property-cell'

export function sortLabel(sort: DatabaseSort, properties: CellProperty[]) {
  return (
    BUILT_IN_SORT_KEYS.find((k) => k.key === sort.key)?.label ??
    properties.find((p) => p.id === sort.key)?.name ??
    'Unknown'
  )
}

/** Toolbar control: pick what to sort by and which direction, or clear it. */
export function SortMenu({
  sort,
  properties,
  onChange,
}: {
  sort: DatabaseSort | null
  properties: CellProperty[]
  onChange: (sort: DatabaseSort | null) => void
}) {
  const DirectionIcon = sort?.direction === 'desc' ? ArrowDown : ArrowUp

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(sort && 'bg-accent text-accent-foreground')}
        >
          {sort ? <DirectionIcon /> : <ArrowUpDown />}
          {sort ? sortLabel(sort, properties) : 'Sort'}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="grid w-72 gap-2 p-2">
        <div className="flex items-center gap-2">
          <Select
            value={sort?.key ?? ''}
            onValueChange={(key) => onChange({ key, direction: sort?.direction ?? 'asc' })}
          >
            <SelectTrigger size="sm" className="min-w-0 flex-1">
              <SelectValue placeholder="Sort by…" />
            </SelectTrigger>
            <SelectContent>
              {BUILT_IN_SORT_KEYS.map((k) => (
                <SelectItem key={k.key} value={k.key}>
                  {k.label}
                </SelectItem>
              ))}
              {properties.length > 0 && <SelectSeparator />}
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sort?.direction ?? 'asc'}
            disabled={!sort}
            onValueChange={(direction) =>
              sort && onChange({ ...sort, direction: direction as 'asc' | 'desc' })
            }
          >
            <SelectTrigger size="sm" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Ascending</SelectItem>
              <SelectItem value="desc">Descending</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {sort ? (
          <Button
            variant="ghost"
            size="sm"
            className="justify-start text-muted-foreground"
            onClick={() => onChange(null)}
          >
            <X /> Remove sort
          </Button>
        ) : (
          <p className="px-1 text-muted-foreground text-xs">
            Rows are in manual order until you pick a sort.
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}
