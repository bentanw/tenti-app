import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { AuthDialog } from '#/components/auth-form'
import { LandingPage } from '#/components/landing/landing-page'
import { getCurrentUser } from '#/server/auth'

/** Public landing page. Signed-in users go straight to their workspace. */
export const Route = createFileRoute('/')({
  validateSearch: z.object({
    auth: z.enum(['login', 'signup']).optional(),
    redirect: z.string().optional(),
  }),
  beforeLoad: async ({ location }) => {
    // Supabase falls back to the site root (/?code=…) if /auth/callback isn't an allowed
    // redirect URL in the project settings; finish the sign-in there instead of losing the code.
    const code = new URLSearchParams(location.searchStr).get('code')
    if (code)
      throw redirect({
        href: `/auth/callback?code=${encodeURIComponent(code)}`,
        reloadDocument: true,
      })

    if (await getCurrentUser()) throw redirect({ to: '/home' })
  },
  head: () => ({
    meta: [
      { title: 'Tenti: plan, transcribe and share your content' },
      {
        name: 'description',
        content:
          'Plan videos in databases, turn recordings into transcripts, and share everything from your own link-in-bio page.',
      },
    ],
  }),
  component: Landing,
})

function Landing() {
  const { auth, redirect: redirectTo } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <>
      <LandingPage
        onAuth={(mode) => navigate({ search: (s) => ({ ...s, auth: mode }), resetScroll: false })}
      />
      <AuthDialog
        mode={auth}
        redirectTo={redirectTo}
        onModeChange={(mode) =>
          navigate({ search: (s) => ({ ...s, auth: mode }), replace: true, resetScroll: false })
        }
        onClose={() => navigate({ search: (s) => ({ ...s, auth: undefined }), resetScroll: false })}
      />
    </>
  )
}
