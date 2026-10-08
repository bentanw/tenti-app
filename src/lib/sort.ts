import type { PageValues, PropertyType, SelectOption } from './types'

/** `key` is a property id, or one of the built-in row fields. */
export type SortKey = 'title' | 'created_at' | 'updated_at' | (string & {})
export type SortDirection = 'asc' | 'desc'
export type DatabaseSort = { key: SortKey; direction: SortDirection }

type SortableRow = {
  title: string
  values: PageValues
  createdAt?: string
  updatedAt?: string
}
type SortableProperty = { id: string; type: PropertyType; options: SelectOption[] }

export const BUILT_IN_SORT_KEYS: { key: SortKey; label: string }[] = [
  { key: 'title', label: 'Name' },
  { key: 'created_at', label: 'Created' },
  { key: 'updated_at', label: 'Last edited' },
]

/**
 * Notion-style sort: text is case-insensitive, selects follow their option order,
 * and empty values always sink to the bottom regardless of direction.
 */
export function sortRows<T extends SortableRow>(
  rows: T[],
  properties: SortableProperty[],
  sort: DatabaseSort | null,
): T[] {
  if (!sort) return rows
  const property = properties.find((p) => p.id === sort.key)
  if (!property && !BUILT_IN_SORT_KEYS.some((k) => k.key === sort.key)) return rows

  const sortValue = (row: T): string | number | null => {
    if (sort.key === 'title') return row.title.trim() || null
    if (sort.key === 'created_at') return row.createdAt ?? null
    if (sort.key === 'updated_at') return row.updatedAt ?? null
    if (!property) return null
    const v = row.values[property.id]
    switch (property.type) {
      case 'NUMBER':
        return typeof v === 'number' ? v : null
      case 'CHECKBOX':
        return v === true ? 1 : 0
      case 'SELECT': {
        const index = property.options.findIndex((o) => o.id === v)
        return index === -1 ? null : index
      }
      default:
        return typeof v === 'string' && v.trim() ? v : null
    }
  }

  const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true })
  const factor = sort.direction === 'asc' ? 1 : -1

  // Stable sort: ties keep their manual order.
  return [...rows].sort((a, b) => {
    const va = sortValue(a)
    const vb = sortValue(b)
    if (va === null && vb === null) return 0
    if (va === null) return 1
    if (vb === null) return -1
    const cmp =
      typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : collator.compare(String(va), String(vb))
    return cmp * factor
  })
}

export function parseSort(value: unknown): DatabaseSort | null {
  if (!value || typeof value !== 'object') return null
  const { key, direction } = value as Record<string, unknown>
  if (typeof key !== 'string' || (direction !== 'asc' && direction !== 'desc')) return null
  return { key, direction }
}
