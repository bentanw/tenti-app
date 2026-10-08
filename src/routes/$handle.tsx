import { createFileRoute, notFound } from '@tanstack/react-router'
import { LinkPage } from '#/components/link-page'
import { getPublicProfile } from '#/server/links'

export const Route = createFileRoute('/$handle')({
  loader: async ({ params }) => {
    const profile = await getPublicProfile({ data: { handle: params.handle } })
    if (!profile) throw notFound()
    return profile
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.displayName} (@${loaderData.handle})` },
          { name: 'description', content: loaderData.bio ?? '' },
          { property: 'og:title', content: loaderData.displayName },
        ]
      : [],
  }),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      This page doesn’t exist.
    </div>
  ),
  component: PublicLinkPage,
})

function PublicLinkPage() {
  const profile = Route.useLoaderData()
  return (
    <LinkPage
      className="min-h-screen"
      profile={profile}
      links={profile.links}
      hrefFor={(link) => `/go/${link.id}`}
    />
  )
}
