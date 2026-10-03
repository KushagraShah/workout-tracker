import { supabase } from '../lib/supabase'
import type { Exercise, ExerciseInput } from '../types'

const TABLE = 'exercises'

export async function listExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase.from(TABLE).select('*').order('name')
  if (error) throw error
  return (data ?? []) as Exercise[]
}

export async function getExercise(id: string): Promise<Exercise> {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single()
  if (error) throw error
  return data as Exercise
}

export async function createExercise(input: ExerciseInput): Promise<Exercise> {
  const { data, error } = await supabase.from(TABLE).insert(input).select().single()
  if (error) throw error
  return data as Exercise
}

export async function updateExercise(
  id: string,
  input: Partial<ExerciseInput>,
): Promise<Exercise> {
  const { data, error } = await supabase.from(TABLE).update(input).eq('id', id).select().single()
  if (error) throw error
  return data as Exercise
}

export async function setExerciseArchived(id: string, archived: boolean): Promise<void> {
  const { error } = await supabase.from(TABLE).update({ archived }).eq('id', id)
  if (error) throw error
}

export async function deleteExercise(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}
