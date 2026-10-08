import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { Database, Tables } from '#/lib/database.types'
import { LINK_THEMES, RESERVED_HANDLES } from '#/lib/types'
import { check } from './lib/result'
import { authMiddleware } from './middleware'
import { getSupabaseServerClient } from './supabase.server'

type Client = SupabaseClient<Database>

/** Links and avatars render as href/src, so only web URLs (plain z.url() accepts javascript:). */
const webUrl = z.url({ protocol: /^https?$/ })

function serializeProfile(p: Tables<'link_profiles'> & { links: Tables<'links'>[] }) {
  return {
    id: p.id,
    handle: p.handle,
    displayName: p.display_name,
    bio: p.bio,
    avatarUrl: p.avatar_url,
    theme: p.theme,
    views: p.views,
    links: [...p.links]
      .sort((a, b) => a.position - b.position)
      .map((l) => ({ id: l.id, title: l.title, url: l.url, enabled: l.enabled, clicks: l.clicks })),
  }
}

/** Each user gets one profile, created on first visit with a handle based on their email. */
async function getOrCreateProfile(supabase: Client, user: User) {
  const { data: existing } = await supabase
    .from('link_profiles')
    .select('*, links(*)')
    .eq('user_id', user.id)
    .maybeSingle()
  if (existing) return serializeProfile(existing)

  const base =
    (user.email ?? 'creator')
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, '')
      .slice(0, 24) || 'creator'
  for (let attempt = 0; attempt < 5; attempt++) {
    const handle =
      attempt === 0 && base.length >= 2 && !RESERVED_HANDLES.includes(base)
        ? base
        : `${base}-${Math.floor(1000 + Math.random() * 9000)}`
    const { data, error } = await supabase
      .from('link_profiles')
      .insert({ handle, display_name: base })
      .select('*, links(*)')
      .single()
    if (data) return serializeProfile(data)
    if (error?.code !== '23505') throw new Error(error?.message ?? 'Could not create profile')
    // 23505 = handle already taken; try another
  }
  throw new Error('Could not pick a free handle')
}

export const getMyProfile = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(({ context: { supabase, user } }) => getOrCreateProfile(supabase, user))

const handleSchema = z
  .string()
  .min(2)
  .max(30)
  .regex(/^[a-z0-9_.-]+$/, 'Lowercase letters, numbers, _ . - only')
  .refine((h) => !RESERVED_HANDLES.includes(h), 'That handle is reserved')

export const updateProfile = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.string(),
      handle: handleSchema.optional(),
      displayName: z.string().min(1).optional(),
      bio: z.string().nullable().optional(),
      avatarUrl: z
        .union([webUrl, z.literal('')])
        .nullable()
        .optional(),
      theme: z.enum(Object.keys(LINK_THEMES) as [keyof typeof LINK_THEMES]).optional(),
    }),
  )
  .handler(async ({ data, context: { supabase } }) => {
    const { error } = await supabase
      .from('link_profiles')
      .update({
        handle: data.handle,
        display_name: data.displayName,
        bio: data.bio,
        theme: data.theme,
        ...(data.avatarUrl !== undefined ? { avatar_url: data.avatarUrl || null } : {}),
      })
      .eq('id', data.id)
    if (error?.code === '23505') throw new Error('That handle is already taken')
    check({ error })
    return { ok: true }
  })

export const createLink = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(z.object({ profileId: z.string(), title: z.string().min(1), url: webUrl }))
  .handler(async ({ data, context: { supabase } }) => {
    const { count } = await supabase
      .from('links')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', data.profileId)
    check(
      await supabase.from('links').insert({
        profile_id: data.profileId,
        title: data.title,
        url: data.url,
        position: count ?? 0,
      }),
    )
    return { ok: true }
  })

export const updateLink = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.string(),
      title: z.string().min(1).optional(),
      url: webUrl.optional(),
      enabled: z.boolean().optional(),
    }),
  )
  .handler(async ({ data: { id, ...rest }, context: { supabase } }) => {
    check(await supabase.from('links').update(rest).eq('id', id))
    return { ok: true }
  })

export const deleteLink = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context: { supabase } }) => {
    check(await supabase.from('links').delete().eq('id', data.id))
    return { ok: true }
  })

export const reorderLinks = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(z.object({ ids: z.array(z.string()) }))
  .handler(async ({ data, context: { supabase } }) => {
    await Promise.all(
      data.ids.map(async (id, position) =>
        check(await supabase.from('links').update({ position }).eq('id', id)),
      ),
    )
    return { ok: true }
  })

/** Public page data (no sign-in needed). Also counts the view. */
export const getPublicProfile = createServerFn({ method: 'GET' })
  .validator(z.object({ handle: z.string() }))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { data: profile } = await supabase
      .from('link_profiles')
      .select(
        'handle, display_name, bio, avatar_url, theme, links(id, title, url, enabled, position)',
      )
      .eq('handle', data.handle)
      .maybeSingle()
    if (!profile) return null
    await supabase.rpc('record_profile_view', { p_handle: data.handle })
    return {
      handle: profile.handle,
      displayName: profile.display_name,
      bio: profile.bio,
      avatarUrl: profile.avatar_url,
      theme: profile.theme,
      links: profile.links
        .filter((l) => l.enabled)
        .sort((a, b) => a.position - b.position)
        .map((l) => ({ id: l.id, title: l.title, url: l.url })),
    }
  })
