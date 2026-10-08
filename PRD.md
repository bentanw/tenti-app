# Tenti: Product Requirements

> One workspace for creators: plan content like Notion, transcribe videos like Otter, and share links like Linktree.

| | |
| --- | --- |
| **Status** | v1 prototype built |
| **Platform** | Web app |
| **Updated** | October 2026 |

---

## 🎯 Overview

**Problem:** Creators pay for three separate tools to plan content, transcribe videos, and share links, and none of them talk to each other.

**Solution:** Tenti puts all three in one app, and they work together. A transcript can become a page in your content database. Publish dates appear on a calendar. Link clicks show up on your home dashboard.

**Who it's for:** Solo creators on YouTube, TikTok, and Instagram who want one simple, low-cost tool.

### Goals

- Replace Notion databases, Otter.ai, and Linktree for a solo creator
- Make the three tools work together, not just sit side by side
- Keep costs near zero (Supabase free tier, Groq's free Whisper tier)

### Not in v1

- Team collaboration or sharing pages
- Mobile apps
- Storing video files (only transcripts are kept)
- Payments

---

## ✨ Features

### 1. Landing page and accounts

- A Notion-style landing page: hero, product screenshots, feature sections, "how it works", and a closing call to action
- **Log in** and **Sign up** open as a modal on the landing page
- Email and password accounts, with optional email confirmation
- Every page except the landing page and public link pages requires an account
- Signed-out visitors to a protected page see the login modal, then land on that page after logging in

### 2. Workspace

- **Sidebar:**
  - Home, Transcribe, and Link in bio
  - A calendar of scheduled content
  - Your list of databases
  - A profile menu with Log out
- **Home dashboard:** page, transcript, view and click counts; quick actions; recent pages and transcripts

### 3. Databases (replaces Notion)

- Create databases to track content. Each starts with **Status**, **Platform**, **Publish date**, and **Link** columns.
- Column types: Text, Number, Select, Date, Checkbox, URL
- **Table view:** edit any cell inline; add, rename and delete columns
- **Board view:** cards grouped by a select column (like Status); drag cards between columns
- **Sorting:** by any column, ascending or descending, saved per database
- **Select options:** create, rename, recolor, and delete
- **Pages:** every row opens as a page with a block editor (slash commands, headings, checklists) that saves automatically

### 4. Transcribe (replaces Otter.ai)

- Upload a video or audio file, or paste a YouTube, TikTok, or Instagram link
- Get a transcript with timestamps, powered by Whisper
- Long videos are split into chunks automatically
- Search the transcript, copy it, or export it as `.txt` or `.srt` captions
- **Send to database:** turn a transcript into a page in your content database

### 5. Link in bio (replaces Linktree)

- Edit your name, handle, bio, avatar, and theme (Midnight, Paper, Sunset, Forest)
- Add, edit, reorder, hide, and delete links
- A live phone preview updates as you type
- Public page at `yoursite.com/yourhandle`
- Tracks page views and clicks on each link

---

## 🔁 Core user flow

1. Sign up from the landing page
2. Create a content database and add video ideas
3. Move ideas across the board as you script, film, and edit
4. Transcribe the finished video and send the transcript to its page
5. Add the video to your link-in-bio page and watch the clicks

---

## 🗺️ Pages

| Page | URL | Access |
| --- | --- | --- |
| Landing (with login/signup modal) | `/` | Public |
| Home dashboard | `/home` | Signed in |
| Database | `/databases/:id` | Signed in |
| Page editor | `/pages/:id` | Signed in |
| Transcribe | `/transcripts` | Signed in |
| Link in bio editor | `/links` | Signed in |
| Public link page | `/:handle` | Public |

---

## 🗄️ Data

| Table | Stores |
| --- | --- |
| `databases` | Name, icon, description, saved sort |
| `properties` | Columns: name, type, select options |
| `pages` | Rows: title, icon, column values, page content |
| `transcripts` | Source, status, text, timestamped segments, linked page |
| `link_profiles` | Handle, name, bio, avatar, theme, view count |
| `links` | Title, URL, enabled, click count, order |

Every row belongs to a user. Database security rules make sure each user can only see and edit their own data. Link pages are the only public data.

---

## 🛠️ Tech stack

| Area | Choice |
| --- | --- |
| Framework | TanStack Start (React 19) |
| UI | Tailwind CSS v4 + shadcn/ui |
| Editor | BlockNote |
| Database and auth | Supabase (Postgres, Auth, row-level security) |
| Transcription | Whisper API (Groq or OpenAI) + ffmpeg + yt-dlp |

**How it's organized:**

- All backend logic lives in server functions in `src/server/`
- Database changes are SQL migrations in `supabase/migrations/`
- Security has three layers:
  - Pages redirect signed-out users
  - Server functions reject requests without a session
  - The database itself blocks access to other users' data

**Environment variables:** `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_DB_PASSWORD`, `TRANSCRIBE_API_KEY`, `TRANSCRIBE_BASE_URL`, `TRANSCRIBE_MODEL`

---

## ⚠️ Known limitations

- Transcription runs on the app server, so it needs a job queue before deploying to serverless hosting
- Large video uploads use a lot of memory
- Only one sort at a time
- Supabase's built-in email is rate-limited (add custom SMTP for real users)
- Instagram sometimes blocks downloads

---

## 🚀 Roadmap

- **Next:** filters and multi-sort, database templates, image uploads
- **Later:** AI summaries and captions from transcripts, a calendar view, public pages, custom domains, deployment

---

## ✅ Build plan

### Phase 1: Foundation

- [ ] Set up TanStack Start, Tailwind, and shadcn
- [ ] Create the Supabase project, tables, and security rules
- [ ] Add accounts: login/signup modal and protected pages

### Phase 2: Databases

- [ ] Databases and columns
- [ ] Table and board views
- [ ] Sorting and select options
- [ ] Pages with the block editor

### Phase 3: Transcribe

- [ ] Upload and link input
- [ ] Whisper transcription pipeline
- [ ] Transcript viewer, export, and send to database

### Phase 4: Link in bio

- [ ] Profile and link editor with live preview
- [ ] Public page with view and click tracking

### Phase 5: Polish

- [ ] Sidebar, calendar, and profile menu
- [ ] Home dashboard
- [ ] Landing page

---

## ❓ Open questions

- Stay free, or charge for transcription?
- Keep email confirmation on, or turn it off for faster sign-up?
- Where to host it?
