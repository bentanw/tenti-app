// Server-only transcription pipeline:
//   media (upload or URL) → ffmpeg → small mono mp3 chunks → Whisper API → merged segments
//
// Works with any OpenAI-compatible /audio/transcriptions endpoint (OpenAI, Groq, a local
// whisper server...). Configure with TRANSCRIBE_API_KEY / TRANSCRIBE_BASE_URL / TRANSCRIBE_MODEL.

import { execFile } from 'node:child_process'
import { lookup } from 'node:dns/promises'
import { createWriteStream } from 'node:fs'
import { mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { BlockList, isIP } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { promisify } from 'node:util'
import type { TranscriptSegment } from '#/lib/types'

const run = promisify(execFile)

/** Whisper APIs reject uploads over 25MB, so long audio is split into chunks. */
const MAX_UPLOAD_BYTES = 24 * 1024 * 1024
const CHUNK_SECONDS = 20 * 60

export type TranscribeSource =
  | { kind: 'file'; name: string; bytes: Uint8Array }
  | { kind: 'url'; url: string }

export type TranscribeResult = {
  text: string
  segments: TranscriptSegment[]
  language: string | null
  durationSec: number | null
}

export async function transcribe(source: TranscribeSource): Promise<TranscribeResult> {
  const config = getConfig()
  const workdir = await mkdtemp(path.join(tmpdir(), 'creator-studio-'))
  try {
    const mediaPath = await materialize(source, workdir)
    const chunks = await prepareAudio(mediaPath, workdir)

    const segments: TranscriptSegment[] = []
    const texts: string[] = []
    let language: string | null = null
    for (const chunk of chunks) {
      const result = await callWhisper(chunk.path, config)
      language ??= result.language
      texts.push(result.text.trim())
      for (const s of result.segments) {
        segments.push({
          start: s.start + chunk.offset,
          end: s.end + chunk.offset,
          text: s.text.trim(),
        })
      }
    }

    const durationSec = await probeDuration(mediaPath)
    return { text: texts.join(' ').trim(), segments, language, durationSec }
  } finally {
    await rm(workdir, { recursive: true, force: true })
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────

type Config = { apiKey: string; baseUrl: string; model: string }

function getConfig(): Config {
  const apiKey = process.env.TRANSCRIBE_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error(
      'No transcription API key. Set TRANSCRIBE_API_KEY (OpenAI or Groq) in .env.local and restart the dev server.',
    )
  }
  const baseUrl = (process.env.TRANSCRIBE_BASE_URL || 'https://api.openai.com/v1').replace(
    /\/$/,
    '',
  )
  if (!/^https?:\/\//.test(baseUrl) || /^https?:\/\//.test(apiKey)) {
    throw new Error(
      'TRANSCRIBE_BASE_URL must be a URL and TRANSCRIBE_API_KEY must be a key. They look swapped in .env.local. Fix them and restart the dev server.',
    )
  }
  return { apiKey, baseUrl, model: process.env.TRANSCRIBE_MODEL || 'whisper-1' }
}

// ─── Getting the media onto disk ──────────────────────────────────────────────

const SOCIAL_HOSTS = [
  'youtube.com',
  'youtu.be',
  'tiktok.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  'vimeo.com',
  'twitch.tv',
  'facebook.com',
]

async function materialize(source: TranscribeSource, workdir: string): Promise<string> {
  if (source.kind === 'file') {
    const ext = path.extname(source.name) || '.bin'
    const file = path.join(workdir, `input${ext}`)
    await writeFile(file, source.bytes)
    return file
  }

  const url = new URL(source.url)
  const isSocial = SOCIAL_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`))
  if (isSocial) return downloadWithYtDlp(url.toString(), workdir)

  // Direct media link (e.g. an .mp4 on a CDN or a Dropbox/Drive direct download)
  const res = await fetchPublic(url)
  if (!res.ok || !res.body) throw new Error(`Couldn't download media (HTTP ${res.status})`)
  const type = res.headers.get('content-type') ?? ''
  if (type.includes('text/html')) {
    throw new Error(
      'That link is a web page, not a media file. Paste a direct video/audio link, or a YouTube/TikTok/Instagram URL (needs yt-dlp installed).',
    )
  }
  const file = path.join(workdir, `input${path.extname(url.pathname) || '.bin'}`)
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(file))
  return file
}

// Users paste the URL, so the server must not be usable to reach localhost, the private
// network or cloud metadata endpoints. Every redirect hop is checked too.
const PRIVATE_RANGES = new BlockList()
for (const [net, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 3],
] as const)
  PRIVATE_RANGES.addSubnet(net, prefix, 'ipv4')
for (const [net, prefix] of [
  ['::', 127],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const)
  PRIVATE_RANGES.addSubnet(net, prefix, 'ipv6')

function isPrivateAddress(address: string) {
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1]
  if (mapped) return PRIVATE_RANGES.check(mapped, 'ipv4')
  return PRIVATE_RANGES.check(address, isIP(address) === 6 ? 'ipv6' : 'ipv4')
}

async function fetchPublic(url: URL, redirectsLeft = 5): Promise<Response> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:')
    throw new Error('Only http(s) links are supported')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address)
  if (addresses.some(isPrivateAddress)) throw new Error("That link isn't publicly reachable")

  const res = await fetch(url, { redirect: 'manual' })
  const location = res.headers.get('location')
  if (res.status >= 300 && res.status < 400 && location) {
    if (redirectsLeft === 0) throw new Error('Too many redirects')
    return fetchPublic(new URL(location, url), redirectsLeft - 1)
  }
  return res
}

async function downloadWithYtDlp(url: string, workdir: string): Promise<string> {
  if (!(await hasBinary('yt-dlp'))) {
    throw new Error(
      'Transcribing YouTube/TikTok/Instagram links needs yt-dlp. Install it with `brew install yt-dlp`, or upload the video file instead.',
    )
  }
  await run(
    'yt-dlp',
    ['-f', 'bestaudio/best', '--no-playlist', '-o', path.join(workdir, 'input.%(ext)s'), url],
    { maxBuffer: 16 * 1024 * 1024 },
  )
  const file = (await readdir(workdir)).find((f) => f.startsWith('input.'))
  if (!file) throw new Error('yt-dlp did not produce a file')
  return path.join(workdir, file)
}

// ─── Audio preparation ────────────────────────────────────────────────────────

type Chunk = { path: string; offset: number }

/**
 * Strips video and downsamples to 16kHz mono mp3 (what Whisper uses internally anyway),
 * which shrinks a typical video ~50-100x, then splits into fixed-length chunks.
 */
async function prepareAudio(mediaPath: string, workdir: string): Promise<Chunk[]> {
  if (!(await hasBinary('ffmpeg'))) {
    const { size } = await stat(mediaPath)
    if (size > MAX_UPLOAD_BYTES) {
      throw new Error(
        'File is over 25MB. Install ffmpeg (`brew install ffmpeg`) so audio can be extracted and chunked.',
      )
    }
    return [{ path: mediaPath, offset: 0 }]
  }

  await run('ffmpeg', [
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    mediaPath,
    '-vn',
    '-ac',
    '1',
    '-ar',
    '16000',
    '-b:a',
    '32k',
    '-f',
    'segment',
    '-segment_time',
    String(CHUNK_SECONDS),
    '-reset_timestamps',
    '1',
    path.join(workdir, 'chunk-%03d.mp3'),
  ])

  const files = (await readdir(workdir)).filter((f) => f.startsWith('chunk-')).sort()
  if (files.length === 0) throw new Error('No audio track found in that file')
  return files.map((f, i) => ({ path: path.join(workdir, f), offset: i * CHUNK_SECONDS }))
}

async function probeDuration(file: string): Promise<number | null> {
  if (!(await hasBinary('ffprobe'))) return null
  try {
    const { stdout } = await run('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      file,
    ])
    const n = Number.parseFloat(stdout.trim())
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

// ffmpeg/ffprobe take `-version`; yt-dlp only accepts `--version`.
const VERSION_FLAG: Record<string, string> = { 'yt-dlp': '--version' }

// Only successes are cached, so installing a tool works without restarting the server.
const foundBinaries = new Set<string>()
async function hasBinary(name: string) {
  if (foundBinaries.has(name)) return true
  try {
    await run(name, [VERSION_FLAG[name] ?? '-version'])
    foundBinaries.add(name)
    return true
  } catch {
    return false
  }
}

// ─── Whisper API ──────────────────────────────────────────────────────────────

type WhisperResponse = {
  text: string
  language?: string
  segments?: Array<{ start: number; end: number; text: string }>
}

async function callWhisper(file: string, config: Config) {
  // gpt-4o-*-transcribe models only return plain json (no timestamps)
  const supportsVerbose = !config.model.startsWith('gpt-4o')

  const form = new FormData()
  form.append('file', new Blob([await readFile(file)]), path.basename(file))
  form.append('model', config.model)
  form.append('response_format', supportsVerbose ? 'verbose_json' : 'json')
  if (supportsVerbose) form.append('timestamp_granularities[]', 'segment')

  const res = await fetch(`${config.baseUrl}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiKey}` },
    body: form,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Transcription API error (${res.status}): ${body.slice(0, 300)}`)
  }
  const json = (await res.json()) as WhisperResponse
  return {
    text: json.text ?? '',
    language: json.language ?? null,
    segments: json.segments ?? [],
  }
}
