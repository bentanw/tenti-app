import { createServerFn } from '@tanstack/react-start'
import type { PageValues } from '#/lib/types'
import { must } from './lib/result'
import { authMiddleware } from './middleware'

export type ScheduledItem = {
  pageId: string
  title: string
  icon: string | null
  /** YYYY-MM-DD */
  date: string
  databaseName: string
  databaseIcon: string
}

/** Every page that has a value in any DATE property, for the sidebar calendar. */
export const getScheduledContent = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context: { supabase } }) => {
    const dateProps = must(
      await supabase
        .from('properties')
        .select('id, database_id, database:databases(name, icon)')
        .eq('type', 'DATE'),
    )
    if (dateProps.length === 0) return []

    const pages = must(
      await supabase
        .from('pages')
        .select('id, title, icon, values, database_id')
        .in('database_id', [...new Set(dateProps.map((p) => p.database_id))]),
    )

    const items: ScheduledItem[] = []
    for (const page of pages) {
      const values = page.values as PageValues
      for (const prop of dateProps) {
        if (prop.database_id !== page.database_id || !prop.database) continue
        const date = values[prop.id]
        if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
          items.push({
            pageId: page.id,
            title: page.title,
            icon: page.icon,
            date,
            databaseName: prop.database.name,
            databaseIcon: prop.database.icon,
          })
        }
      }
    }
    return items.sort((a, b) => a.date.localeCompare(b.date))
  })
