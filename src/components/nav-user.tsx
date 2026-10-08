import { Link, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { ChevronsUpDown, ExternalLink, Link2, LogOut } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '#/components/ui/sidebar'
import { signOut } from '#/server/auth'

export type NavUserInfo = {
  name: string
  email: string
  avatarUrl: string | null
  handle: string | null
}

/** shadcn's sidebar "NavUser": profile button that opens an account menu with Log out. */
export function NavUser({ user }: { user: NavUserInfo }) {
  const { isMobile } = useSidebar()
  const logout = useServerFn(signOut)
  const router = useRouter()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <UserAvatar user={user} />
              <UserText user={user} />
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <UserAvatar user={user} />
                <UserText user={user} />
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to="/links">
                  <Link2 /> Edit link in bio
                </Link>
              </DropdownMenuItem>
              {user.handle && (
                <DropdownMenuItem asChild>
                  <a href={`/${user.handle}`} target="_blank" rel="noreferrer">
                    <ExternalLink /> View public page
                  </a>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await logout()
                await router.invalidate()
                router.navigate({ to: '/' })
              }}
            >
              <LogOut /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function UserAvatar({ user }: { user: NavUserInfo }) {
  return (
    <Avatar className="size-8 rounded-lg">
      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
      <AvatarFallback className="rounded-lg">{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
    </Avatar>
  )
}

function UserText({ user }: { user: NavUserInfo }) {
  return (
    <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
      <span className="truncate font-medium">{user.name}</span>
      <span className="truncate text-muted-foreground text-xs">{user.email}</span>
    </div>
  )
}
