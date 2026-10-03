import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export interface SignUpResult {
  /**
   * True when Supabase created the account but withheld a session because the
   * project requires email confirmation. The caller should tell the user to
   * check their inbox rather than assume they are signed in.
   */
  needsEmailConfirmation: boolean
}

export interface AuthContextValue {
  session: Session | null
  user: User | null
  /** The name captured at sign-up, or null if the user never supplied one. */
  displayName: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<SignUpResult>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
