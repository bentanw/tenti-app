import { createHash } from 'node:crypto'
import { chmod, mkdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const VERSION = '2026.08.19'
const SHA256 = '58162f9bfdc27458ea47bfcb311cf47028f17d8154a8bf7d689861d46399230a'
const URL = `https://github.com/yt-dlp/yt-dlp/releases/download/${VERSION}/yt-dlp_linux`
const FUNCTION_DIR = path.resolve('.vercel/output/functions/__server.func')

export async function packageYtDlp(url, expectedSha256, functionDir) {
  await stat(path.join(functionDir, '.vc-config.json'))
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) })
  if (!response.ok) throw new Error(`yt-dlp download failed (HTTP ${response.status})`)

  const bytes = Buffer.from(await response.arrayBuffer())
  const actualSha256 = createHash('sha256').update(bytes).digest('hex')
  if (actualSha256 !== expectedSha256) {
    throw new Error(`yt-dlp checksum mismatch: expected ${expectedSha256}, got ${actualSha256}`)
  }

  const binDir = path.join(functionDir, 'bin')
  const destination = path.join(binDir, 'yt-dlp')
  const temporary = path.join(binDir, `yt-dlp-${process.pid}.tmp`)
  await mkdir(binDir, { recursive: true })
  try {
    await writeFile(temporary, bytes)
    await chmod(temporary, 0o755)
    await rename(temporary, destination)
  } finally {
    await rm(temporary, { force: true })
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.env.VERCEL === '1') {
  await packageYtDlp(URL, SHA256, FUNCTION_DIR)
}
