import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'

/** Kept so old /signup links still work: auth now lives in a modal on the landing page. */
export const Route = createFileRoute('/signup')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/', search: { auth: 'signup', redirect: search.redirect } })
  },
})
