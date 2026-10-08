import { getSupabaseServerClient } from '../supabase.server'

/** Click tracking for /go/$linkId: counts the click and returns the destination (null if missing/disabled). */
export async function trackLinkClick(linkId: string) {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.rpc('track_link_click', { p_link_id: linkId })
  return data ?? null
}
