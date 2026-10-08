import { createFileRoute } from '@tanstack/react-router'
import { trackLinkClick } from '#/server/lib/link-clicks.server'

/** Click tracking: count the click, then redirect to the real URL. Public. */
export const Route = createFileRoute('/go/$linkId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const url = await trackLinkClick(params.linkId)
        if (!url) return new Response('Link not found', { status: 404 })
        return Response.redirect(url, 302)
      },
    },
  },
})
