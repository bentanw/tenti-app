import { LINK_THEMES, type LinkTheme } from '#/lib/types'
import { cn } from '#/lib/utils'

export type LinkPageProfile = {
  displayName: string
  handle: string
  bio: string | null
  avatarUrl: string | null
  theme: string
}

/** The public link-in-bio page. Shared by the real page and the editor's phone preview. */
export function LinkPage({
  profile,
  links,
  hrefFor,
  className,
}: {
  profile: LinkPageProfile
  links: { id: string; title: string; url: string }[]
  hrefFor: (link: { id: string; url: string }) => string
  className?: string
}) {
  const theme = LINK_THEMES[profile.theme as LinkTheme] ?? LINK_THEMES.midnight
  const initials = profile.displayName
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className={cn('flex min-h-full flex-col items-center px-5 py-12', theme.page, className)}>
      <div className="flex w-full max-w-md flex-col items-center gap-3 text-center">
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={profile.displayName}
            className="size-24 rounded-full object-cover ring-2 ring-white/20"
          />
        ) : (
          <div className="flex size-24 items-center justify-center rounded-full bg-white/15 font-semibold text-2xl ring-2 ring-white/20">
            {initials}
          </div>
        )}
        <div>
          <h1 className="font-bold text-xl">{profile.displayName}</h1>
          <p className={cn('text-sm', theme.muted)}>@{profile.handle}</p>
        </div>
        {profile.bio && <p className="max-w-sm whitespace-pre-wrap text-sm">{profile.bio}</p>}

        <div className="mt-4 grid w-full gap-3">
          {links.map((link) => (
            <a
              key={link.id}
              href={hrefFor(link)}
              target="_blank"
              rel="noreferrer"
              className={cn(
                'block w-full rounded-2xl px-5 py-4 text-center font-semibold text-sm transition-transform hover:scale-[1.02]',
                theme.button,
              )}
            >
              {link.title}
            </a>
          ))}
        </div>
      </div>
      <p className={cn('mt-auto pt-12 text-xs', theme.muted)}>Made with Tenti</p>
    </div>
  )
}
