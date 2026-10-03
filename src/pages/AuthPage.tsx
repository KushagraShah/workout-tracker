import { useState, type FormEvent } from 'react'
import { Button, ErrorText, Field, TextInput } from '../components/ui'
import { useAuth } from '../contexts/useAuth'
import { isSupabaseConfigured } from '../lib/supabase'

export function AuthPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signIn(email.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
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
          <p className="mt-1 text-sm text-slate-400">Sign in to continue</p>
        </div>

        {!isSupabaseConfigured ? (
          <div className="rounded-xl border border-amber-700/60 bg-amber-950/40 p-4 text-sm text-amber-200">
            Supabase is not configured. Add <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> to your <code>.env</code> file, then restart the dev
            server.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Email">
              <TextInput
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Password">
              <TextInput
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <ErrorText>{error}</ErrorText>
            <Button type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-slate-500">
          Single-user app. Accounts are created in the Supabase dashboard.
        </p>
      </div>
    </div>
  )
}
