import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { Tables } from '#/lib/database.types'
import { parseSort } from '#/lib/sort'
import {
  OPTION_COLORS,
  type PageValues,
  PROPERTY_TYPES,
  type PropertyType,
  type SelectOption,
} from '#/lib/types'
import { check, must } from './lib/result'
import { authMiddleware } from './middleware'

// ─── Databases ────────────────────────────────────────────────────────────────

export const listDatabases = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context: { supabase } }) => {
    const rows = must(
      await supabase
        .from('databases')
        .select('id, name, icon, pages(count)')
        .order('created_at', { ascending: true }),
    )
    return rows.map((db) => ({
      id: db.id,
      name: db.name,
      icon: db.icon,
      _count: { pages: db.pages[0]?.count ?? 0 },
    }))
  })

export const getDatabase = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context: { supabase } }) => {
    const db = must(
      await supabase
        .from('databases')
        .select(
          '*, properties(*), pages(id, title, icon, values, position, created_at, updated_at)',
        )
        .eq('id', data.id)
        .order('position', { referencedTable: 'properties', ascending: true })
        .maybeSingle(),
    )
    const pages = [...db.pages].sort(
      (a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at),
    )
    return {
      id: db.id,
      name: db.name,
      icon: db.icon,
      description: db.description,
      sort: parseSort(db.sort),
      properties: db.properties.map(serializeProperty),
      pages: pages.map((p) => ({
        id: p.id,
        title: p.title,
        icon: p.icon,
        values: p.values as PageValues,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })),
    }
  })

/** New databases start with a content-pipeline schema since that's the main use case. */
export const createDatabase = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(z.object({ name: z.string().min(1), icon: z.string().optional() }))
  .handler(async ({ data, context: { supabase } }) => {
    const db = must(
      await supabase
        .from('databases')
        .insert({ name: data.name, icon: data.icon ?? '📄' })
        .select('id')
        .single(),
    )
    const option = (name: string, color: string) => ({ id: crypto.randomUUID(), name, color })
    check(
      await supabase.from('properties').insert([
        {
          database_id: db.id,
          name: 'Status',
          type: 'SELECT',
          position: 0,
          options: [
            option('Idea', 'gray'),
            option('Scripting', 'yellow'),
            option('Filming', 'orange'),
            option('Editing', 'purple'),
            option('Published', 'green'),
          ],
        },
        {
          database_id: db.id,
          name: 'Platform',
          type: 'SELECT',
          position: 1,
          options: [
            option('YouTube', 'red'),
            option('TikTok', 'pink'),
            option('Instagram', 'purple'),
          ],
        },
        { database_id: db.id, name: 'Publish date', type: 'DATE', position: 2 },
        { database_id: db.id, name: 'Link', type: 'URL', position: 3 },
      ]),
    )
    return { id: db.id }
  })

export const updateDatabase = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      icon: z.string().optional(),
      description: z.string().nullable().optional(),
      /** null clears the sort (back to manual order) */
      sort: z
        .object({ key: z.string().min(1), direction: z.enum(['asc', 'desc']) })
        .nullable()
        .optional(),
    }),
  )
  .handler(async ({ data: { id, ...rest }, context: { supabase } }) => {
    check(await supabase.from('databases').update(rest).eq('id', id))
    return { ok: true }
  })

export const deleteDatabase = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context: { supabase } }) => {
    check(await supabase.from('databases').delete().eq('id', data.id))
    return { ok: true }
  })

// ─── Properties (columns) ─────────────────────────────────────────────────────

const selectOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.enum(OPTION_COLORS),
})

export const addProperty = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(
    z.object({ databaseId: z.string(), name: z.string().min(1), type: z.enum(PROPERTY_TYPES) }),
  )
  .handler(async ({ data, context: { supabase } }) => {
    const { count } = await supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('database_id', data.databaseId)
    const property = must(
      await supabase
        .from('properties')
        .insert({
          database_id: data.databaseId,
          name: data.name,
          type: data.type,
          position: count ?? 0,
        })
        .select()
        .single(),
    )
    return serializeProperty(property)
  })

export const updateProperty = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      options: z.array(selectOptionSchema).optional(),
    }),
  )
  .handler(async ({ data: { id, ...rest }, context: { supabase } }) => {
    check(await supabase.from('properties').update(rest).eq('id', id))
    return { ok: true }
  })

export const deleteProperty = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context: { supabase } }) => {
    check(await supabase.from('properties').delete().eq('id', data.id))
    return { ok: true }
  })

/** Removes a SELECT option and clears it from every row that had it selected. */
export const deleteSelectOption = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(z.object({ propertyId: z.string(), optionId: z.string() }))
  .handler(async ({ data, context: { supabase } }) => {
    const property = must(
      await supabase
        .from('properties')
        .select('id, database_id, options')
        .eq('id', data.propertyId)
        .maybeSingle(),
    )
    const options = (property.options as SelectOption[]).filter((o) => o.id !== data.optionId)
    check(await supabase.from('properties').update({ options }).eq('id', property.id))

    // Clear the value on rows that used it (filter on the JSON value server-side).
    const affected = must(
      await supabase
        .from('pages')
        .select('id, values')
        .eq('database_id', property.database_id)
        .eq(`values->>${data.propertyId}`, data.optionId),
    )
    for (const page of affected) {
      check(
        await supabase
          .from('pages')
          .update({ values: { ...(page.values as PageValues), [data.propertyId]: null } })
          .eq('id', page.id),
      )
    }
    return { ok: true }
  })

function serializeProperty(p: Tables<'properties'>) {
  return {
    id: p.id,
    name: p.name,
    position: p.position,
    type: p.type as PropertyType,
    options: (p.options ?? []) as SelectOption[],
  }
}
