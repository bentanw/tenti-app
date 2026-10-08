import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Loader2, MailCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import logo from '#/assets/logo.png'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { signIn, signUp } from '#/server/auth'

export type AuthMode = 'login' | 'signup'

/**
 * Log in / sign up as a modal. Driven by the `?auth=` search param on the landing page,
 * so the modal is linkable and the browser back button closes it.
 */
export function AuthDialog({
  mode,
  redirectTo,
  onModeChange,
  onClose,
}: {
  mode: AuthMode | undefined
  redirectTo?: string
  onModeChange: (mode: AuthMode) => void
  onClose: () => void
}) {
  // Keep the last mode while the close animation plays.
  const [shown, setShown] = useState<AuthMode>(mode ?? 'login')
  useEffect(() => {
    if (mode) setShown(mode)
  }, [mode])

  return (
    <Dialog open={!!mode} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <AuthForm key={shown} mode={shown} redirectTo={redirectTo} onModeChange={onModeChange} />
      </DialogContent>
    </Dialog>
  )
}

function AuthForm({
  mode,
  redirectTo,
  onModeChange,
}: {
  mode: AuthMode
  redirectTo?: string
  onModeChange: (mode: AuthMode) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [confirmSent, setConfirmSent] = useState(false)
  const login = useServerFn(signIn)
  const register = useServerFn(signUp)
  const router = useRouter()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      if (mode === 'login') {
        await login({ data: { email, password } })
      } else {
        const { needsConfirmation } = await register({ data: { email, password } })
        if (needsConfirmation) {
          setConfirmSent(true)
          return
        }
      }
      await router.invalidate()
      await router.navigate({ href: safeRedirect(redirectTo) })
    } catch (err) {
      setError(readableError(err))
    } finally {
      setPending(false)
    }
  }

  if (confirmSent) {
    return (
      <div className="grid justify-items-center gap-3 py-6 text-center">
        <MailCheck className="size-10 text-muted-foreground" />
        <DialogTitle className="text-lg">Check your email</DialogTitle>
        <DialogDescription>
          We sent a confirmation link to <strong className="text-foreground">{email}</strong>. Click
          it to finish creating your account.
        </DialogDescription>
      </div>
    )
  }

  return (
    <div className="grid gap-6 pt-2">
      <DialogHeader className="items-center text-center sm:text-center">
        <img src={logo} alt="" className="mx-auto mb-1 size-12" />
        <DialogTitle className="text-xl">
          {mode === 'login' ? 'Log in to Tenti' : 'Create your Tenti account'}
        </DialogTitle>
        <DialogDescription>
          {mode === 'login'
            ? 'Welcome back. Pick up where you left off.'
            : 'Plan, transcribe and share your content in one place.'}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="auth-email">Email</Label>
          <Input
            id="auth-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="auth-password">Password</Label>
          <Input
            id="auth-password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === 'signup' && (
            <p className="text-muted-foreground text-xs">At least 8 characters.</p>
          )}
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button type="submit" disabled={pending} className="h-10">
          {pending && <Loader2 className="animate-spin" />}
          {mode === 'login' ? 'Continue' : 'Create account'}
        </Button>
      </form>

      <p className="text-center text-muted-foreground text-sm">
        {mode === 'login' ? 'New to Tenti? ' : 'Already have an account? '}
        <button
          type="button"
          className="text-foreground underline underline-offset-4"
          onClick={() => onModeChange(mode === 'login' ? 'signup' : 'login')}
        >
          {mode === 'login' ? 'Create an account' : 'Log in'}
        </button>
      </p>
    </div>
  )
}

/** Only follow same-site paths, so a crafted ?redirect= can't send people elsewhere. */
export function safeRedirect(target: string | undefined) {
  if (!target?.startsWith('/')) return '/home'
  // Let the URL parser decide: browsers treat "/\evil.com" and "/\t/evil.com" like "//evil.com".
  const url = new URL(target, 'http://same.invalid')
  return url.origin === 'http://same.invalid' ? url.pathname + url.search + url.hash : '/home'
}

/** Validation errors come back as a JSON array string; show the first message. */
function readableError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err)
  try {
    const parsed = JSON.parse(message)
    if (Array.isArray(parsed) && parsed[0]?.message) return parsed[0].message as string
  } catch {}
  return message
}
