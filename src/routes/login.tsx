import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'

/** Kept so old /login links still work: auth now lives in a modal on the landing page. */
export const Route = createFileRoute('/login')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/', search: { auth: 'login', redirect: search.redirect } })
  },
})
