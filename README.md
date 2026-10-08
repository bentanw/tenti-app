# Tenti

One app to replace three creator subscriptions:

| Replaces | Module | Where |
| --- | --- | --- |
| **Notion** | Databases with table + kanban board views. Every row is a page with a block editor (slash commands, checklists, headings…). | `/databases/:id`, `/pages/:id` |
| **Otter.ai** | Upload a video or paste a link → Whisper transcript with timestamps, search, `.txt`/`.srt` export, and **Send to database** (turns a transcript into a page). | `/transcripts` |
| **Linktree** | Link-in-bio editor with live phone preview, themes, view + click analytics. Public page at `/<handle>`. | `/links`, `/:handle` |

Stack: TanStack Start · React 19 · Tailwind v4 · shadcn/ui · BlockNote · Supabase (Postgres + Auth).

## Quick start

```bash
pnpm install
pnpm dev           # http://localhost:3000 → sign up at /signup
```

The database and auth are the Supabase project **tenti**. `.env.local` holds `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (server-only) and `SUPABASE_DB_PASSWORD` (CLI only). Nothing runs locally besides the app.

### Changing the schema

Schema changes are SQL migrations in `supabase/migrations/`:

```bash
pnpm db:new add_tags      # creates supabase/migrations/<timestamp>_add_tags.sql
pnpm db:push              # applies new migrations to Supabase
pnpm db:types             # regenerates src/lib/database.types.ts
```

Avoid `supabase start`, `db dump` and `db diff`: those need Docker.

### Auth settings (Supabase dashboard → Authentication)

- **Email confirmation** is on by default. New users get a link that lands on `/auth/callback`. Add `http://localhost:3000/auth/callback` (and your production URL later) under **URL Configuration → Redirect URLs**. Or, for local use, turn off **Confirm email** under Sign In / Providers → Email.
- Supabase's built-in email sender is rate-limited (a few emails per hour). Add your own SMTP before inviting real users.

### Transcription setup

Add a key to `.env.local`, then restart `pnpm dev`:

```bash
# OpenAI (whisper-1, about $0.006/min)
TRANSCRIBE_API_KEY="sk-..."

# or Groq (whisper-large-v3-turbo: faster, cheaper, has a free tier)
TRANSCRIBE_API_KEY="gsk_..."
TRANSCRIBE_BASE_URL="https://api.groq.com/openai/v1"
TRANSCRIBE_MODEL="whisper-large-v3-turbo"
```

Any OpenAI-compatible `/audio/transcriptions` endpoint works, including a self-hosted Whisper server.

System tools:
- **ffmpeg** (`brew install ffmpeg`): strips the video and makes a 16kHz mono mp3, so a 1GB video becomes a few MB. Long recordings are split into 20-minute chunks to stay under the API's 25MB limit. Without ffmpeg, only files under 25MB work.
- **yt-dlp** (`brew install yt-dlp`): only needed for YouTube / TikTok / Instagram / X links. Direct media links (`.mp4` URLs) and uploads work without it.

## Project layout

```
supabase/migrations/          SQL schema + row-level security policies
src/server/                   all server functions (createServerFn)
  supabase.server.ts          Supabase clients (user session via cookies; admin for background jobs)
  middleware.ts               authMiddleware: every protected server function runs behind it
  auth.ts                     sign up / sign in / sign out / current user
  databases.ts  pages.ts      Notion: databases, columns, rows/pages, page content
  transcripts.ts              Otter: start job, poll, send to database
  lib/transcribe.server.ts    ffmpeg + yt-dlp + Whisper pipeline (server-only)
  links.ts                    Linktree: profile, links, public page
  dashboard.ts  calendar.ts   home page stats, sidebar calendar
src/routes/
  login.tsx  signup.tsx       auth pages
  auth/callback.ts            email-confirmation landing (exchanges code for a session)
  _app.tsx                    signed-in layout + route guard (redirects to /login)
  _app/…                      home, databases, pages, transcripts, links
  $handle.tsx                 public link-in-bio page
  go/$linkId.ts               click-tracking redirect (server route)
src/components/               app components (database views, editor, link page)
src/components/ui/            shadcn components
```

## How it works

- **Database properties:** a page's property values are stored as JSON (`{ [propertyId]: value }`), so adding a column doesn't need a migration. Select options live on the property. The value stores the option id, so renaming an option doesn't break existing rows.
- **Page content:** this is BlockNote's JSON document, autosaved 700ms after you stop typing. The editor is client-only (`ClientOnly` + `lazy`).
- **Transcription:** jobs run in the background inside the Node server process, and the transcript page polls until the job finishes. This is fine for one long-running server. If you deploy to serverless, move it to a queue (Inngest, Trigger.dev, BullMQ).
- **Auth and access control:** there are three layers. The `_app` route guard redirects signed-out visitors to `/login`. `authMiddleware` rejects any server-function call without a session. Row-level security in Postgres limits every query to the signed-in user's own rows, even if someone calls Supabase's API directly with the public key. Public by design: `/login`, `/signup`, `/auth/callback`, `/<handle>`, and `/go/*` (click counts go through security-definer functions).
- **Link profiles:** each user gets one, created on first visit to `/links` with a handle based on their email.

## Scripts

| | |
| --- | --- |
| `pnpm dev` | dev server (loads `.env.local`) |
| `pnpm db:new <name>` | new SQL migration |
| `pnpm db:push` | apply migrations to Supabase |
| `pnpm db:types` | regenerate TypeScript types from the schema |
| `pnpm typecheck` / `pnpm check` | tsc / biome |
