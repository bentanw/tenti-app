import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { Json } from '#/lib/database.types'
import type { PageValues, PropertyType, SelectOption } from '#/lib/types'
import { check, must } from './lib/result'
import { authMiddleware } from './middleware'

const valueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])

export const getPage = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context: { supabase } }) => {
    const page = must(
      await supabase
        .from('pages')
        .select(
          '*, database:databases(id, name, icon, properties(*)), transcripts(id, title, created_at)',
        )
        .eq('id', data.id)
        .maybeSingle(),
    )
    if (!page.database) throw new Error('Page not found')
    return {
      id: page.id,
      title: page.title,
      icon: page.icon,
      values: page.values as PageValues,
      content: page.content as Json[] | null,
      transcripts: page.transcripts.map((t) => ({
        id: t.id,
        title: t.title,
        createdAt: t.created_at,
      })),
      database: {
        id: page.database.id,
        name: page.database.name,
        icon: page.database.icon,
        properties: [...page.database.properties]
          .sort((a, b) => a.position - b.position)
          .map((p) => ({
            id: p.id,
            name: p.name,
            position: p.position,
            type: p.type as PropertyType,
            options: p.options as SelectOption[],
          })),
      },
    }
  })

export const createPage = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(
    z.object({
      databaseId: z.string(),
      title: z.string().optional(),
      values: z.record(z.string(), valueSchema).optional(),
    }),
  )
  .handler(async ({ data, context: { supabase } }) => {
    const { data: last } = await supabase
      .from('pages')
      .select('position')
      .eq('database_id', data.databaseId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()
    return must(
      await supabase
        .from('pages')
        .insert({
          database_id: data.databaseId,
          title: data.title ?? '',
          values: data.values ?? {},
          position: (last?.position ?? -1) + 1,
        })
        .select('id')
        .single(),
    )
  })

export const updatePage = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.string(),
      title: z.string().optional(),
      icon: z.string().nullable().optional(),
      /** Merged into existing values, so callers can patch a single property. */
      values: z.record(z.string(), valueSchema).optional(),
    }),
  )
  .handler(async ({ data: { id, values, ...rest }, context: { supabase } }) => {
    let mergedValues: PageValues | undefined
    if (values) {
      const current = must(await supabase.from('pages').select('values').eq('id', id).maybeSingle())
      mergedValues = { ...(current.values as PageValues), ...values }
    }
    check(
      await supabase
        .from('pages')
        .update({ ...rest, ...(mergedValues ? { values: mergedValues } : {}) })
        .eq('id', id),
    )
    return { ok: true }
  })

export const savePageContent = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string(), content: z.array(z.unknown()) }))
  .handler(async ({ data, context: { supabase } }) => {
    check(
      await supabase
        .from('pages')
        .update({ content: data.content as Json[] })
        .eq('id', data.id),
    )
    return { ok: true }
  })

export const deletePage = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context: { supabase } }) => {
    check(await supabase.from('pages').delete().eq('id', data.id))
    return { ok: true }
  })
