import { createServerFn } from '@tanstack/react-start'
import { must } from './lib/result'
import { authMiddleware } from './middleware'

export const getDashboard = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context: { supabase, user } }) => {
    const [pages, transcripts, profile, recentPages, recentTranscripts] = await Promise.all([
      supabase.from('pages').select('id', { count: 'exact', head: true }),
      supabase
        .from('transcripts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'DONE'),
      supabase
        .from('link_profiles')
        .select('handle, views, links(clicks)')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('pages')
        .select('id, title, icon, updated_at, database:databases(name, icon)')
        .order('updated_at', { ascending: false })
        .limit(6),
      supabase
        .from('transcripts')
        .select('id, title, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    return {
      stats: {
        pages: pages.count ?? 0,
        transcripts: transcripts.count ?? 0,
        linkViews: profile.data?.views ?? 0,
        linkClicks: profile.data?.links.reduce((sum, l) => sum + l.clicks, 0) ?? 0,
      },
      handle: profile.data?.handle ?? null,
      recentPages: must(recentPages).map((p) => ({
        id: p.id,
        title: p.title,
        icon: p.icon,
        updatedAt: p.updated_at,
        database: { name: p.database?.name ?? '', icon: p.database?.icon ?? '📄' },
      })),
      recentTranscripts: must(recentTranscripts).map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status as 'PROCESSING' | 'DONE' | 'FAILED',
        createdAt: t.created_at,
      })),
    }
  })
