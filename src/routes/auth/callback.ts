import { createFileRoute } from '@tanstack/react-router'
import { getSupabaseForRequest } from '#/server/supabase.server'

/**
 * Where Supabase's email-confirmation link lands. Exchanges the one-time `code` for a
 * session cookie, then sends the user into the app.
 */
export const Route = createFileRoute('/auth/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const code = url.searchParams.get('code')
        const { supabase, setCookieHeaders } = getSupabaseForRequest(request)
        const ok = code ? !(await supabase.auth.exchangeCodeForSession(code)).error : false

        const headers = new Headers({
          Location: new URL(ok ? '/home' : '/?auth=login', url).toString(),
        })
        for (const cookie of setCookieHeaders) headers.append('Set-Cookie', cookie)
        return new Response(null, { status: 302, headers })
      },
    },
  },
})
