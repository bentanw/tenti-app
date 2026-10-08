// Server-only Supabase clients. Never import this from client code.
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { getCookies, setCookie } from '@tanstack/react-start/server'
import type { Database } from '#/lib/database.types'

function env(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is missing from .env.local`)
  return value
}

/**
 * Supabase client acting as the signed-in user (session read from / written to cookies).
 * All queries go through row-level security, so users only ever see their own rows.
 */
export function getSupabaseServerClient() {
  return createServerClient<Database>(env('SUPABASE_URL'), env('SUPABASE_PUBLISHABLE_KEY'), {
    cookies: {
      getAll: () => Object.entries(getCookies()).map(([name, value]) => ({ name, value })),
      setAll: (cookies) => {
        for (const { name, value, options } of cookies) setCookie(name, value, options)
      },
    },
  })
}

/**
 * For server routes that build their own Response (e.g. a redirect): session cookies are
 * collected into `setCookieHeaders` so the caller can attach them to that Response.
 */
export function getSupabaseForRequest(request: Request) {
  const setCookieHeaders: string[] = []
  const supabase = createServerClient<Database>(
    env('SUPABASE_URL'),
    env('SUPABASE_PUBLISHABLE_KEY'),
    {
      cookies: {
        getAll: () =>
          parseCookieHeader(request.headers.get('cookie') ?? '').map(({ name, value }) => ({
            name,
            value: value ?? '',
          })),
        setAll: (cookies) => {
          for (const { name, value, options } of cookies)
            setCookieHeaders.push(serializeCookieHeader(name, value, options))
        },
      },
    },
  )
  return { supabase, setCookieHeaders }
}

/**
 * Client with the secret key: bypasses RLS. Only for work that runs outside a request,
 * like the background transcription job. Always scope queries by id/user yourself.
 */
export function getSupabaseAdmin() {
  return createClient<Database>(env('SUPABASE_URL'), env('SUPABASE_SECRET_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
