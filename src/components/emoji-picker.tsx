import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover'
import { cn } from '#/lib/utils'

const EMOJIS = [
  '📄',
  '📝',
  '🎬',
  '🎥',
  '🎙️',
  '🎧',
  '📸',
  '🎨',
  '✍️',
  '💡',
  '🚀',
  '🔥',
  '⭐',
  '📈',
  '💰',
  '🧠',
  '📚',
  '🗓️',
  '✅',
  '📌',
  '🎯',
  '🧪',
  '🛠️',
  '💬',
  '❤️',
  '🌱',
  '🌍',
  '🎮',
  '🍿',
  '🏆',
]

export function EmojiPicker({
  value,
  onChange,
  className,
}: {
  value: string | null
  onChange: (emoji: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Change icon"
          className={cn('rounded-md leading-none hover:bg-accent', className)}
        >
          {value || '📄'}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="grid w-auto grid-cols-10 gap-0.5 p-2">
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            className="flex size-8 items-center justify-center rounded text-lg hover:bg-accent"
            onClick={() => {
              onChange(e)
              setOpen(false)
            }}
          >
            {e}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
