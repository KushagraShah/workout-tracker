import { supabase } from '../lib/supabase'
import type {
  Session,
  SessionExercise,
  SessionExerciseInput,
  SessionExerciseStatus,
  SessionStatus,
  SetEntry,
  SetEntryInput,
} from '../types'

export interface StartSessionInput {
  routine_id: string
  routine_day_id: string
  day_name: string
  round_number: number
  exercises: Omit<SessionExerciseInput, 'session_id'>[]
}

export async function findInProgressSession(routineId?: string): Promise<Session | null> {
  let query = supabase
    .from('sessions')
    .select('*')
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false })
    .limit(1)
  if (routineId) query = query.eq('routine_id', routineId)
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return (data ?? null) as Session | null
}

export async function getSession(id: string): Promise<Session> {
  const { data, error } = await supabase.from('sessions').select('*').eq('id', id).single()
  if (error) throw error
  return data as Session
}

export async function startSession(input: StartSessionInput): Promise<Session> {
  const { exercises, ...sessionInput } = input
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert(sessionInput)
    .select()
    .single()
  if (sessionError) throw sessionError

  if (exercises.length) {
    const { error: exerciseError } = await supabase
      .from('session_exercises')
      .insert(exercises.map((exercise) => ({ ...exercise, session_id: session.id })))
    if (exerciseError) {
      await supabase.from('sessions').delete().eq('id', session.id)
      throw exerciseError
    }
  }

  return session as Session
}

export async function listSessionExercises(sessionId: string): Promise<SessionExercise[]> {
  const { data, error } = await supabase
    .from('session_exercises')
    .select('*')
    .eq('session_id', sessionId)
    .order('order_index')
  if (error) throw error
  return (data ?? []) as SessionExercise[]
}

export async function updateSessionExercise(
  id: string,
  input: Partial<Omit<SessionExerciseInput, 'session_id'>> & { status?: SessionExerciseStatus },
): Promise<SessionExercise> {
  const { data, error } = await supabase.from('session_exercises').update(input).eq('id', id).select().single()
  if (error) throw error
  return data as SessionExercise
}

export async function listSets(sessionExerciseId: string): Promise<SetEntry[]> {
  const { data, error } = await supabase
    .from('sets')
    .select('*')
    .eq('session_exercise_id', sessionExerciseId)
    .order('set_index')
  if (error) throw error
  return (data ?? []) as SetEntry[]
}

export async function createSet(input: SetEntryInput): Promise<SetEntry> {
  const { data, error } = await supabase.from('sets').insert(input).select().single()
  if (error) throw error
  return data as SetEntry
}

export async function updateSet(id: string, input: Partial<SetEntryInput>): Promise<SetEntry> {
  const { data, error } = await supabase.from('sets').update(input).eq('id', id).select().single()
  if (error) throw error
  return data as SetEntry
}

export async function deleteSet(id: string): Promise<void> {
  const { error } = await supabase.from('sets').delete().eq('id', id)
  if (error) throw error
}

export async function finishSession(id: string, status: Extract<SessionStatus, 'completed' | 'abandoned'>): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({ status, completed_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}