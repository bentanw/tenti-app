import { createServerFn } from '@tanstack/react-start'
import { getRequestUrl } from '@tanstack/react-start/server'
import { z } from 'zod'
import { getSupabaseServerClient } from './supabase.server'

/**
 * Current user, or null. Used by route guards and the sidebar profile menu
 * (name/avatar come from the link-in-bio profile when one exists).
 */
export const getCurrentUser = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('link_profiles')
    .select('display_name, avatar_url, handle')
    .eq('user_id', user.id)
    .maybeSingle()
  const email = user.email ?? ''
  return {
    id: user.id,
    email,
    name: profile?.display_name || email.split('@')[0],
    avatarUrl: profile?.avatar_url ?? null,
    handle: profile?.handle ?? null,
  }
})

const credentials = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const signIn = createServerFn({ method: 'POST' })
  .validator(credentials)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.auth.signInWithPassword(data)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

/**
 * If the project requires email confirmation, Supabase sends a link to /auth/callback
 * and no session exists yet (`needsConfirmation: true`).
 */
export const signUp = createServerFn({ method: 'POST' })
  .validator(credentials)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { origin } = getRequestUrl()
    const { data: result, error } = await supabase.auth.signUp({
      ...data,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    })
    if (error) throw new Error(error.message)
    return { needsConfirmation: !result.session }
  })

export const signOut = createServerFn({ method: 'POST' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  await supabase.auth.signOut()
  return { ok: true }
})
