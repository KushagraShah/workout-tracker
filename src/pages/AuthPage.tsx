import { useState, type FormEvent } from 'react'
import { Button, ErrorText, Field, TextInput } from '../components/ui'
import { useAuth } from '../contexts/useAuth'
import { isSupabaseConfigured } from '../lib/supabase'

type Mode = 'sign-in' | 'sign-up'

export function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>('sign-in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const isSignUp = mode === 'sign-up'
  const submitLabel = busy
    ? isSignUp
      ? 'Creating account…'
      : 'Signing in…'
    : isSignUp
      ? 'Create account'
      : 'Sign in'

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
    setNotice('')
    setName('')
    setPassword('')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)
    const fallback = isSignUp ? 'Sign up failed' : 'Sign in failed'
    try {
      if (isSignUp) {
        const { needsEmailConfirmation } = await signUp(name.trim(), email.trim(), password)
        if (needsEmailConfirmation) {
          // Confirmation is on: the account exists but has no session yet, so
          // send the user to the sign-in form with an explanation.
          setNotice(
            `Account created. Check ${email.trim()} for a confirmation link, then sign in.`,
          )
          setMode('sign-in')
          setPassword('')
        }
        // Otherwise the new session unlocks the app on its own.
      } else {
        await signIn(email.trim(), password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-4xl">💪</div>
          <h1 className="mt-2 text-2xl font-semibold text-white">Workout Tracker</h1>
          <p className="mt-1 text-sm text-slate-400">
            {isSignUp ? 'Create your account' : 'Sign in to continue'}
          </p>
        </div>

        {!isSupabaseConfigured ? (
          <div className="rounded-xl border border-amber-700/60 bg-amber-950/40 p-4 text-sm text-amber-200">
            Supabase is not configured. Add <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> to your <code>.env</code> file, then restart the dev
            server.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isSignUp ? (
              <Field label="Name">
                <TextInput
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
            ) : null}
            <Field label="Email">
              <TextInput
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Password" hint={isSignUp ? 'At least 6 characters.' : undefined}>
              <TextInput
                type="password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
                minLength={isSignUp ? 6 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <ErrorText>{error}</ErrorText>
            {notice ? <p className="text-sm text-emerald-400">{notice}</p> : null}
            <Button type="submit" disabled={busy}>
              {submitLabel}
            </Button>
          </form>
        )}

        {isSupabaseConfigured ? (
          <p className="mt-6 text-center text-sm text-slate-400">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => switchMode(isSignUp ? 'sign-in' : 'sign-up')}
              className="font-medium text-sky-400 hover:text-sky-300"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        ) : null}
      </div>
    </div>
  )
}
