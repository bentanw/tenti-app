import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { AudioLines, Home, Link2, Plus } from 'lucide-react'
import { useState } from 'react'
import logo from '#/assets/logo.png'
import { NavUser, type NavUserInfo } from '#/components/nav-user'
import { SidebarCalendar } from '#/components/sidebar-calendar'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '#/components/ui/sidebar'
import type { ScheduledItem } from '#/server/calendar'
import { createDatabase } from '#/server/databases'

type SidebarDatabase = { id: string; name: string; icon: string; _count: { pages: number } }

const tools = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/transcripts', label: 'Transcribe', icon: AudioLines },
  { to: '/links', label: 'Link in bio', icon: Link2 },
] as const

export function AppSidebar({
  databases,
  scheduled,
  user,
}: {
  databases: SidebarDatabase[]
  scheduled: ScheduledItem[]
  user: NavUserInfo
}) {
  const [creating, setCreating] = useState(false)

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <img src={logo} alt="" className="size-7" />
          <span className="font-semibold">Tenti</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {tools.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild>
                    <Link to={item.to} activeProps={{ 'data-active': true }}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarCalendar scheduled={scheduled} />

        <SidebarGroup>
          <SidebarGroupLabel>Databases</SidebarGroupLabel>
          <SidebarGroupAction title="New database" onClick={() => setCreating(true)}>
            <Plus />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {databases.map((db) => (
                <SidebarMenuItem key={db.id}>
                  <SidebarMenuButton asChild>
                    <Link
                      to="/databases/$databaseId"
                      params={{ databaseId: db.id }}
                      activeProps={{ 'data-active': true }}
                    >
                      <span className="text-base leading-none">{db.icon}</span>
                      <span>{db.name}</span>
                    </Link>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>{db._count.pages}</SidebarMenuBadge>
                </SidebarMenuItem>
              ))}
              {databases.length === 0 && (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setCreating(true)}>
                    <Plus />
                    <span className="text-muted-foreground">Create a database</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <NewDatabaseDialog open={creating} onOpenChange={setCreating} />
    </Sidebar>
  )
}

export function NewDatabaseDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState('')
  const create = useServerFn(createDatabase)
  const router = useRouter()
  const navigate = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const db = await create({ data: { name: name.trim(), icon: '🎬' } })
    setName('')
    onOpenChange(false)
    await router.invalidate()
    navigate({ to: '/databases/$databaseId', params: { databaseId: db.id } })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>New database</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="e.g. Content Pipeline"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <p className="text-muted-foreground text-sm">
            Starts with Status, Platform, Publish date and Link columns. You can change them later.
          </p>
          <DialogFooter>
            <Button type="submit" disabled={!name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
