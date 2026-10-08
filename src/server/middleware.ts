import { createMiddleware } from '@tanstack/react-start'
import { getSupabaseServerClient } from './supabase.server'

/**
 * Every protected server function runs behind this. Route guards only hide pages;
 * this is what actually stops unauthenticated calls. Handlers get `context.supabase`
 * (scoped to the user by RLS) and `context.user`.
 */
export const authMiddleware = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')
  return next({ context: { supabase, user } })
})
