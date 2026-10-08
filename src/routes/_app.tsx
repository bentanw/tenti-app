import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AppSidebar } from '#/components/app-sidebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '#/components/ui/sidebar'
import { getCurrentUser } from '#/server/auth'
import { getScheduledContent } from '#/server/calendar'
import { listDatabases } from '#/server/databases'

/**
 * Every dashboard route lives under this layout, so this guard protects all of them.
 * (Server functions are protected separately by authMiddleware.)
 */
export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ location }) => {
    const user = await getCurrentUser()
    if (!user) throw redirect({ to: '/', search: { auth: 'login', redirect: location.href } })
    return { user }
  },
  loader: async () => {
    const [databases, scheduled] = await Promise.all([listDatabases(), getScheduledContent()])
    return { databases, scheduled }
  },
  component: AppLayout,
})

function AppLayout() {
  const { databases, scheduled } = Route.useLoaderData()
  const { user } = Route.useRouteContext()
  return (
    <SidebarProvider>
      <AppSidebar databases={databases} scheduled={scheduled} user={user} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-12 items-center gap-2 bg-background/80 px-3 backdrop-blur md:hidden">
          <SidebarTrigger />
          <span className="font-semibold text-sm">Tenti</span>
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
