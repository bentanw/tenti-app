import {
  ArrowRight,
  AudioLines,
  CalendarDays,
  Captions,
  Check,
  Kanban,
  Link2,
  MousePointerClick,
  Palette,
  Search,
  Slash,
  Sparkles,
  Table2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import homeShot from '#/assets/landing/home.webp'
import linkShot from '#/assets/landing/link-in-bio.webp'
import mascot from '#/assets/landing/mascot.webp'
import transcribeShot from '#/assets/landing/transcribe.webp'
import logo from '#/assets/logo.png'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import type { AuthMode } from '../auth-form'
import { TentiMascot } from './tenti-mascot'

type Props = { onAuth: (mode: AuthMode) => void }

export function LandingPage({ onAuth }: Props) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav onAuth={onAuth} />
      <main>
        <Hero onAuth={onAuth} />
        <ReplacesStrip />
        <Features />
        <HowItWorks />
        <FinalCta onAuth={onAuth} />
      </main>
      <Footer onAuth={onAuth} />
    </div>
  )
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav({ onAuth }: Props) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-background/90 backdrop-blur transition-shadow',
        scrolled && 'shadow-[0_1px_0_var(--color-border)]',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <a href="/" className="flex items-center gap-2 font-semibold text-lg">
          <img src={logo} alt="" className="size-8" />
          Tenti
        </a>
        <nav className="hidden items-center gap-1 text-sm md:flex">
          <NavLink href="#features">Features</NavLink>
          <NavLink href="#how-it-works">How it works</NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onAuth('login')}>
            Log in
          </Button>
          <Button size="sm" onClick={() => onAuth('signup')}>
            Get Tenti free
          </Button>
        </div>
      </div>
    </header>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {children}
    </a>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero({ onAuth }: Props) {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-14 pb-16 text-center sm:px-6 md:pt-20">
      <TentiMascot className="mx-auto mb-6 size-24 md:size-28" />
      <h1 className="mx-auto max-w-3xl text-balance font-bold text-5xl tracking-tight md:text-7xl">
        Your content, from idea to link in bio.
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground md:text-xl">
        Plan videos in databases, turn recordings into transcripts, and share it all from your own
        link-in-bio page. One workspace for creators.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" className="h-11 px-6 text-base" onClick={() => onAuth('signup')}>
          Get Tenti free <ArrowRight />
        </Button>
        <Button
          size="lg"
          variant="ghost"
          className="h-11 px-6 text-base"
          onClick={() => onAuth('login')}
        >
          Log in
        </Button>
      </div>

      <BrowserFrame className="mt-14 md:mt-20">
        <img
          src={homeShot}
          alt="Tenti home: stats, quick actions, recently edited pages and a content calendar"
          className="block w-full"
          width={1800}
          height={1026}
        />
      </BrowserFrame>
    </section>
  )
}

function BrowserFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-background shadow-[0_24px_80px_-24px_rgba(0,0,0,0.25)] md:rounded-2xl',
        className,
      )}
    >
      <div className="flex h-8 items-center gap-1.5 border-b bg-muted/60 px-3 md:h-10 md:px-4">
        <span className="size-2.5 rounded-full bg-red-300 md:size-3" />
        <span className="size-2.5 rounded-full bg-amber-300 md:size-3" />
        <span className="size-2.5 rounded-full bg-emerald-300 md:size-3" />
      </div>
      {children}
    </div>
  )
}

// ─── "Replaces" strip ─────────────────────────────────────────────────────────

function ReplacesStrip() {
  const items = [
    { icon: Table2, title: 'Docs & databases', text: 'Plan every video like a pro team.' },
    { icon: AudioLines, title: 'Transcription', text: 'Turn any video into text in minutes.' },
    { icon: Link2, title: 'Link in bio', text: 'One link for everything you make.' },
  ]
  return (
    <section className="border-y bg-stone-50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <p className="text-center font-medium text-muted-foreground text-sm">
          Three tools you'd normally pay for separately, in one place
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-3 rounded-xl bg-background p-4 ring-1 ring-border"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-stone-100">
                <item.icon className="size-4" />
              </div>
              <div>
                <div className="font-semibold text-sm">{item.title}</div>
                <div className="text-muted-foreground text-sm">{item.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Features ─────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    eyebrow: 'Plan',
    icon: Kanban,
    title: 'Your whole content pipeline, in one database.',
    points: [
      { icon: Table2, text: 'Table and board views, sortable by any column' },
      { icon: Slash, text: 'Pages with slash commands, checklists and headings' },
      { icon: CalendarDays, text: 'A calendar of everything you have scheduled' },
    ],
    image: homeShot,
    alt: 'Tenti home with a content calendar and recently edited pages',
    tile: 'bg-sky-50',
  },
  {
    eyebrow: 'Transcribe',
    icon: AudioLines,
    title: 'Paste a link. Get a transcript.',
    points: [
      { icon: Search, text: 'Search inside every transcript' },
      { icon: Captions, text: 'Export plain text or .srt captions' },
      { icon: Sparkles, text: 'Send it straight into a database page to edit' },
    ],
    image: transcribeShot,
    alt: 'Tenti transcription screen with upload and paste-link options',
    tile: 'bg-amber-50',
  },
  {
    eyebrow: 'Share',
    icon: Link2,
    title: 'A link in bio that is actually yours.',
    points: [
      { icon: Palette, text: 'Themes that match your brand' },
      { icon: MousePointerClick, text: 'View and click counts for every link' },
      { icon: Check, text: 'Turn links on or off without deleting them' },
    ],
    image: linkShot,
    alt: 'Tenti link-in-bio editor with a live phone preview',
    tile: 'bg-rose-50',
  },
]

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 md:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-balance font-bold text-4xl tracking-tight md:text-5xl">
          Everything you need to make content.
        </h2>
      </div>

      <div className="mt-16 grid gap-20 md:mt-24 md:gap-28">
        {FEATURES.map((f, i) => (
          <div
            key={f.eyebrow}
            className={cn(
              'grid items-center gap-8 md:gap-14',
              i % 2 === 1 ? 'md:grid-cols-[3fr_2fr]' : 'md:grid-cols-[2fr_3fr]',
            )}
          >
            <div className={cn(i % 2 === 1 && 'md:order-2')}>
              <div className="inline-flex items-center gap-2 font-semibold text-muted-foreground text-sm">
                <f.icon className="size-4" /> {f.eyebrow}
              </div>
              <h3 className="mt-3 text-balance font-bold text-3xl tracking-tight md:text-4xl">
                {f.title}
              </h3>
              <ul className="mt-6 grid gap-3">
                {f.points.map((p) => (
                  <li key={p.text} className="flex items-start gap-3 text-[15px]">
                    <p.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    {p.text}
                  </li>
                ))}
              </ul>
            </div>
            {/* Screenshot bleeds off the bottom-right of a pastel tile, like Notion's feature cards */}
            <div className={cn('overflow-hidden rounded-2xl pt-8 pl-8 md:pt-12 md:pl-12', f.tile)}>
              <img
                src={f.image}
                alt={f.alt}
                loading="lazy"
                className="block w-full rounded-tl-xl border-t border-l bg-background shadow-xl"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── How it works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      title: 'Plan the idea',
      text: 'Add it to your content database, write the hook and outline, and set a publish date.',
    },
    {
      title: 'Transcribe the video',
      text: 'Upload the recording or paste the link once it is live. The transcript lands in Tenti.',
    },
    {
      title: 'Share the link',
      text: 'Add it to your link-in-bio page and watch the views and clicks come in.',
    },
  ]
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-stone-50 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-center font-bold text-4xl tracking-tight md:text-5xl">How it works</h2>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.title} className="rounded-2xl bg-background p-6 ring-1 ring-border">
              <div className="flex size-9 items-center justify-center rounded-full bg-foreground font-semibold text-background text-sm">
                {i + 1}
              </div>
              <h3 className="mt-5 font-semibold text-xl">{step.title}</h3>
              <p className="mt-2 text-muted-foreground">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Final CTA + footer ───────────────────────────────────────────────────────

function FinalCta({ onAuth }: Props) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 md:py-28">
      <img src={mascot} alt="" className="mx-auto size-28 md:size-36" />
      <h2 className="mx-auto mt-6 max-w-2xl text-balance font-bold text-4xl tracking-tight md:text-6xl">
        Start creating with Tenti.
      </h2>
      <p className="mt-4 text-lg text-muted-foreground">Set up your workspace in under a minute.</p>
      <Button size="lg" className="mt-8 h-11 px-6 text-base" onClick={() => onAuth('signup')}>
        Get Tenti free <ArrowRight />
      </Button>
    </section>
  )
}

function Footer({ onAuth }: Props) {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-8 text-muted-foreground text-sm sm:px-6">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <img src={logo} alt="" className="size-6" /> Tenti
        </div>
        <span>© {new Date().getFullYear()} Tenti</span>
        <div className="ml-auto flex gap-4">
          <a href="#features" className="hover:text-foreground">
            Features
          </a>
          <button type="button" className="hover:text-foreground" onClick={() => onAuth('login')}>
            Log in
          </button>
          <button type="button" className="hover:text-foreground" onClick={() => onAuth('signup')}>
            Sign up
          </button>
        </div>
      </div>
    </footer>
  )
}
