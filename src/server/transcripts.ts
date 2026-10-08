import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { Json } from '#/lib/database.types'
import type { TranscriptSegment } from '#/lib/types'
import { formatTimestamp } from '#/lib/types'
import { check, must } from './lib/result'
import { type TranscribeSource, transcribe } from './lib/transcribe.server'
import { authMiddleware } from './middleware'
import { getSupabaseAdmin } from './supabase.server'

type TranscriptStatus = 'PROCESSING' | 'DONE' | 'FAILED'

export const listTranscripts = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context: { supabase } }) => {
    const rows = must(
      await supabase
        .from('transcripts')
        .select('id, title, source, status, duration_sec, created_at, page:pages(id, title)')
        .order('created_at', { ascending: false }),
    )
    return rows.map((t) => ({
      id: t.id,
      title: t.title,
      source: t.source,
      status: t.status as TranscriptStatus,
      durationSec: t.duration_sec,
      createdAt: t.created_at,
      page: t.page,
    }))
  })

export const getTranscript = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context: { supabase } }) => {
    const t = must(
      await supabase
        .from('transcripts')
        .select('*, page:pages(id, title, database_id)')
        .eq('id', data.id)
        .maybeSingle(),
    )
    return {
      id: t.id,
      title: t.title,
      source: t.source,
      status: t.status as TranscriptStatus,
      error: t.error,
      language: t.language,
      durationSec: t.duration_sec,
      text: t.text,
      segments: t.segments as TranscriptSegment[],
      createdAt: t.created_at,
      page: t.page ? { id: t.page.id, title: t.page.title, databaseId: t.page.database_id } : null,
    }
  })

/**
 * Accepts FormData with either `file` (video/audio upload) or `url`.
 * Creates the transcript row immediately and transcribes in the background;
 * the UI polls `getTranscript` until status leaves PROCESSING.
 */
export const startTranscription = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error('Expected FormData')
    const file = data.get('file')
    const url = data.get('url')
    const title = data.get('title')
    const t = typeof title === 'string' ? title : ''
    if (file instanceof File && file.size > 0) {
      return { kind: 'file' as const, file, title: t }
    }
    if (typeof url === 'string' && url.trim()) {
      return {
        kind: 'url' as const,
        url: z.url({ protocol: /^https?$/ }).parse(url.trim()),
        title: t,
      }
    }
    throw new Error('Upload a file or paste a URL')
  })
  .handler(async ({ data, context: { supabase, user } }) => {
    let source: TranscribeSource
    let sourceLabel: string
    if (data.kind === 'file') {
      source = {
        kind: 'file',
        name: data.file.name,
        bytes: new Uint8Array(await data.file.arrayBuffer()),
      }
      sourceLabel = data.file.name
    } else {
      source = { kind: 'url', url: data.url }
      sourceLabel = data.url
    }

    const transcript = must(
      await supabase
        .from('transcripts')
        .insert({ title: data.title.trim() || defaultTitle(sourceLabel), source: sourceLabel })
        .select('id')
        .single(),
    )

    // Fire-and-forget: fine for a single long-running Node server. Swap for a
    // queue (e.g. Inngest, BullMQ) if you deploy to serverless.
    void runTranscription(transcript.id, user.id, source)

    return { id: transcript.id }
  })

/**
 * Runs after the request has finished, so there's no user session/cookies to write to.
 * Uses the admin client, scoped to this transcript and its owner.
 */
async function runTranscription(id: string, userId: string, source: TranscribeSource) {
  const admin = getSupabaseAdmin()
  try {
    const result = await transcribe(source)
    check(
      await admin
        .from('transcripts')
        .update({
          status: 'DONE',
          text: result.text,
          segments: result.segments as unknown as Json,
          language: result.language,
          duration_sec: result.durationSec,
        })
        .eq('id', id)
        .eq('user_id', userId),
    )
  } catch (err) {
    console.error('[transcribe]', err)
    await admin
      .from('transcripts')
      .update({ status: 'FAILED', error: err instanceof Error ? err.message : String(err) })
      .eq('id', id)
      .eq('user_id', userId)
  }
}

function defaultTitle(source: string) {
  try {
    const url = new URL(source)
    return `${url.hostname.replace(/^www\./, '')} video`
  } catch {
    return source.replace(/\.[^.]+$/, '')
  }
}

export const renameTranscript = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string(), title: z.string().min(1) }))
  .handler(async ({ data, context: { supabase } }) => {
    check(await supabase.from('transcripts').update({ title: data.title }).eq('id', data.id))
    return { ok: true }
  })

export const deleteTranscript = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context: { supabase } }) => {
    check(await supabase.from('transcripts').delete().eq('id', data.id))
    return { ok: true }
  })

/**
 * Bridges Otter → Notion: creates a new row in a database whose page body is the
 * transcript, so it can be turned into a script, captions, blog post, etc.
 */
export const sendTranscriptToDatabase = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(
    z.object({
      transcriptId: z.string(),
      databaseId: z.string(),
      withTimestamps: z.boolean().default(false),
    }),
  )
  .handler(async ({ data, context: { supabase } }) => {
    const t = must(
      await supabase.from('transcripts').select('*').eq('id', data.transcriptId).maybeSingle(),
    )
    const segments = t.segments as TranscriptSegment[]

    const body =
      data.withTimestamps && segments.length > 0
        ? segments.map((s) => ({
            type: 'paragraph',
            content: [
              { type: 'text', text: `[${formatTimestamp(s.start)}] `, styles: { bold: true } },
              { type: 'text', text: s.text, styles: {} },
            ],
          }))
        : splitParagraphs(t.text).map((p) => ({ type: 'paragraph', content: p }))

    const content = [
      { type: 'heading', props: { level: 2 }, content: 'Transcript' },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: `Source: ${t.source}`, styles: { italic: true } }],
      },
      ...body,
    ]

    const { data: last } = await supabase
      .from('pages')
      .select('position')
      .eq('database_id', data.databaseId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()
    const page = must(
      await supabase
        .from('pages')
        .insert({
          database_id: data.databaseId,
          title: t.title,
          icon: '🎙️',
          content: content as Json,
          position: (last?.position ?? -1) + 1,
        })
        .select('id')
        .single(),
    )
    check(await supabase.from('transcripts').update({ page_id: page.id }).eq('id', t.id))
    return { pageId: page.id }
  })

/** Groups sentences into ~600 char paragraphs so long transcripts stay readable. */
function splitParagraphs(text: string) {
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [text]
  const paragraphs: string[] = []
  let current = ''
  for (const s of sentences) {
    current += s
    if (current.length > 600) {
      paragraphs.push(current.trim())
      current = ''
    }
  }
  if (current.trim()) paragraphs.push(current.trim())
  return paragraphs
}
