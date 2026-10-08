// Client-only: load with React.lazy inside <ClientOnly> (BlockNote touches the DOM on import).
import '@blocknote/shadcn/style.css'
import type { PartialBlock } from '@blocknote/core'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/shadcn'
import { useEffect, useRef } from 'react'

export default function Editor({
  initialContent,
  onSave,
}: {
  initialContent: unknown[] | null
  onSave: (blocks: unknown[]) => void
}) {
  const editor = useCreateBlockNote({
    initialContent:
      initialContent && initialContent.length > 0 ? (initialContent as PartialBlock[]) : undefined,
  })

  // Debounced autosave; flush pending changes when leaving the page.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef(false)
  const save = useRef(onSave)
  save.current = onSave

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
      if (pending.current) save.current(editor.document)
    }
  }, [editor])

  return (
    <BlockNoteView
      editor={editor}
      theme="light"
      className="-mx-12 min-h-[50vh]"
      onChange={() => {
        pending.current = true
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => {
          pending.current = false
          save.current(editor.document)
        }, 700)
      }}
    />
  )
}
