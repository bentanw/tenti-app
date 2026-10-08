import { ArrowLeft, Check, ExternalLink, MoreHorizontal, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '#/components/ui/button'
import { Calendar } from '#/components/ui/calendar'
import { Checkbox } from '#/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover'
import {
  OPTION_COLOR_CLASSES,
  OPTION_COLORS,
  type PropertyType,
  type PropertyValue,
  parseDateValue,
  type SelectOption,
  toDateValue,
} from '#/lib/types'
import { cn } from '#/lib/utils'
import type { OptionActions } from './use-option-actions'

export type CellProperty = {
  id: string
  name: string
  type: PropertyType
  options: SelectOption[]
}

type CellProps = {
  property: CellProperty
  value: PropertyValue | undefined
  onChange: (value: PropertyValue) => void
  /** SELECT only: create, edit and delete options. */
  optionActions?: OptionActions
  className?: string
}

/** Inline editor for a single property value, styled to sit inside a table cell. */
export function PropertyCell({ property, value, onChange, optionActions, className }: CellProps) {
  switch (property.type) {
    case 'CHECKBOX':
      return (
        <div className={cn('flex h-9 items-center px-2', className)}>
          <Checkbox checked={value === true} onCheckedChange={(c) => onChange(c === true)} />
        </div>
      )
    case 'SELECT':
      return (
        <SelectCell
          property={property}
          value={typeof value === 'string' ? value : null}
          onChange={onChange}
          optionActions={optionActions}
          className={className}
        />
      )
    case 'DATE':
      return <DateCell value={value} onChange={onChange} className={className} />
    case 'NUMBER':
      return (
        <TextCell
          className={className}
          inputMode="decimal"
          value={value == null ? '' : String(value)}
          onCommit={(v) => {
            const n = Number.parseFloat(v)
            onChange(v.trim() === '' || Number.isNaN(n) ? null : n)
          }}
        />
      )
    case 'URL':
      return (
        <div className="group/url relative">
          <TextCell
            className={className}
            placeholder=""
            value={typeof value === 'string' ? value : ''}
            onCommit={(v) => onChange(v.trim() || null)}
          />
          {typeof value === 'string' && value && (
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="-translate-y-1/2 absolute top-1/2 right-1 hidden rounded bg-background p-1 text-muted-foreground shadow-sm ring-1 ring-border hover:text-foreground group-hover/url:block"
            >
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      )
    default:
      return (
        <TextCell
          className={className}
          value={typeof value === 'string' ? value : ''}
          onCommit={(v) => onChange(v || null)}
        />
      )
  }
}

function cellInputClass(className?: string) {
  return cn(
    'h-9 w-full min-w-0 bg-transparent px-2 text-sm outline-none focus:bg-accent/50',
    className,
  )
}

/** Text input that keeps local state and only saves on blur / Enter. */
export function TextCell({
  value,
  onCommit,
  className,
  ...props
}: {
  value: string
  onCommit: (value: string) => void
  className?: string
} & Omit<React.ComponentProps<'input'>, 'value' | 'onChange'>) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])

  return (
    <input
      {...props}
      className={cellInputClass(className)}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft !== value && onCommit(draft)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          setDraft(value)
          e.currentTarget.blur()
        }
      }}
    />
  )
}

export function OptionBadge({ option }: { option: SelectOption }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center truncate rounded px-1.5 py-0.5 font-medium text-xs',
        OPTION_COLOR_CLASSES[option.color] ?? OPTION_COLOR_CLASSES.gray,
      )}
    >
      {option.name}
    </span>
  )
}

function DateCell({
  value,
  onChange,
  className,
}: {
  value: PropertyValue | undefined
  onChange: (value: PropertyValue) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = parseDateValue(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-9 w-full items-center px-2 text-left text-sm hover:bg-accent/50',
            className,
          )}
        >
          {selected?.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          captionLayout="dropdown"
          onSelect={(date) => {
            onChange(date ? toDateValue(date) : null)
            setOpen(false)
          }}
        />
        {selected && (
          <div className="border-t p-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground"
              onClick={() => {
                onChange(null)
                setOpen(false)
              }}
            >
              <X /> Clear date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

function SelectCell({
  property,
  value,
  onChange,
  optionActions,
  className,
}: {
  property: CellProperty
  value: string | null
  onChange: (value: PropertyValue) => void
  optionActions?: OptionActions
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const selected = property.options.find((o) => o.id === value)
  const editing = property.options.find((o) => o.id === editingId)
  const filtered = property.options.filter((o) =>
    o.name.toLowerCase().includes(query.toLowerCase()),
  )
  const exactMatch = property.options.some(
    (o) => o.name.toLowerCase() === query.trim().toLowerCase(),
  )

  async function create() {
    if (!optionActions || !query.trim()) return
    const option = await optionActions.create(query.trim())
    onChange(option.id)
    setQuery('')
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setEditingId(null)
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-9 w-full items-center px-2 text-left hover:bg-accent/50',
            className,
          )}
        >
          {selected && <OptionBadge option={selected} />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1" align="start">
        {editing && optionActions ? (
          <OptionEditor
            option={editing}
            actions={optionActions}
            onBack={() => setEditingId(null)}
          />
        ) : (
          <>
            <input
              // biome-ignore lint/a11y/noAutofocus: focus the search box when the popover opens
              autoFocus
              className="mb-1 h-8 w-full rounded-sm bg-muted px-2 text-sm outline-none"
              placeholder="Search or create…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (filtered.length === 1 && query) {
                    onChange(filtered[0].id)
                    setOpen(false)
                  } else if (!exactMatch) create()
                }
              }}
            />
            <div className="max-h-64 overflow-y-auto">
              {filtered.map((option) => (
                <div
                  key={option.id}
                  className="group/option flex items-center rounded-sm hover:bg-accent"
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5"
                    onClick={() => {
                      onChange(option.id)
                      setOpen(false)
                    }}
                  >
                    <OptionBadge option={option} />
                    {option.id === value && <Check className="size-4 text-muted-foreground" />}
                  </button>
                  {optionActions && (
                    <button
                      type="button"
                      title="Edit option"
                      className="mr-1 rounded p-1 text-muted-foreground opacity-0 hover:bg-background hover:text-foreground group-hover/option:opacity-100"
                      onClick={() => setEditingId(option.id)}
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  )}
                </div>
              ))}
              {query.trim() && !exactMatch && optionActions && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                  onClick={create}
                >
                  <Plus className="size-4" /> Create <strong>{query.trim()}</strong>
                </button>
              )}
              {value && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-muted-foreground text-sm hover:bg-accent"
                  onClick={() => {
                    onChange(null)
                    setOpen(false)
                  }}
                >
                  <X className="size-4" /> Clear
                </button>
              )}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

/** Rename, recolor or delete one option. Deleting clears it from every row. */
function OptionEditor({
  option,
  actions,
  onBack,
}: {
  option: SelectOption
  actions: OptionActions
  onBack: () => void
}) {
  const [name, setName] = useState(option.name)
  const [confirming, setConfirming] = useState(false)
  const rename = () => {
    if (name.trim() && name.trim() !== option.name) actions.update({ ...option, name: name.trim() })
  }

  return (
    <div className="grid gap-1">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => {
            rename()
            onBack()
          }}
        >
          <ArrowLeft />
        </Button>
        <input
          // biome-ignore lint/a11y/noAutofocus: editing starts in the name field
          autoFocus
          className="h-8 min-w-0 flex-1 rounded-sm bg-muted px-2 text-sm outline-none"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={rename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              rename()
              onBack()
            }
          }}
        />
      </div>
      <div className="px-2 pt-1 text-muted-foreground text-xs">Color</div>
      <div className="grid">
        {OPTION_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className="flex items-center gap-2 rounded-sm px-2 py-1 text-sm capitalize hover:bg-accent"
            onClick={() => actions.update({ ...option, color })}
          >
            <span className={cn('size-4 rounded', OPTION_COLOR_CLASSES[color])} />
            {color}
            {option.color === color && <Check className="ml-auto size-4 text-muted-foreground" />}
          </button>
        ))}
      </div>
      <div className="border-t pt-1">
        {confirming ? (
          <div className="grid gap-1 p-1">
            <p className="px-1 text-muted-foreground text-xs">
              Delete “{option.name}”? Rows using it will be cleared.
            </p>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="flex-1"
                onClick={() => setConfirming(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  actions.remove(option.id)
                  onBack()
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-destructive text-sm hover:bg-destructive/10"
            onClick={() => setConfirming(true)}
          >
            <Trash2 className="size-4" /> Delete option
          </button>
        )}
      </div>
    </div>
  )
}
