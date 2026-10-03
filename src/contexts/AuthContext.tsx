import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { AuthContext, type AuthContextValue } from './auth-context'

/** Reads the name captured at sign-up out of the user's metadata. */
function nameFrom(user: User | null): string | null {
  const value = user?.user_metadata?.display_name
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    const user = session?.user ?? null

    return {
      session,
      user,
      displayName: nameFrom(user),
      loading,
      async signIn(email: string, password: string) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      },
      async signUp(name: string, email: string, password: string) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name } },
        })
        if (error) throw error
        // Supabase returns a user without a session when email confirmation is
        // required; otherwise the session lands here and unlocks the app.
        return { needsEmailConfirmation: Boolean(data.user) && !data.session }
      },
      async signOut() {
        await supabase.auth.signOut()
      },
    }
  }, [session, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
