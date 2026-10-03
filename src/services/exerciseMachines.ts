import { supabase } from '../lib/supabase'
import type { ExerciseMachine, ExerciseMachineInput } from '../types'

const TABLE = 'exercise_machines'

export async function listExerciseMachines(exerciseId: string): Promise<ExerciseMachine[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('exercise_id', exerciseId)
    .order('is_default', { ascending: false })
    .order('created_at')
  if (error) throw error
  return (data ?? []) as ExerciseMachine[]
}

/** All machine links available to the signed-in account, for routine/session pickers. */
export async function listAllExerciseMachines(): Promise<ExerciseMachine[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at')
  if (error) throw error
  return (data ?? []) as ExerciseMachine[]
}

export async function createExerciseMachine(
  input: ExerciseMachineInput,
): Promise<ExerciseMachine> {
  const { data, error } = await supabase.from(TABLE).insert(input).select().single()
  if (error) throw error
  return data as ExerciseMachine
}

export async function updateExerciseMachine(
  id: string,
  input: Partial<ExerciseMachineInput>,
): Promise<ExerciseMachine> {
  const { data, error } = await supabase.from(TABLE).update(input).eq('id', id).select().single()
  if (error) throw error
  return data as ExerciseMachine
}

export async function deleteExerciseMachine(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}

/** Make one link the default machine for an exercise (clearing the others). */
export async function setDefaultExerciseMachine(
  exerciseId: string,
  linkId: string,
): Promise<void> {
  const { error: clearError } = await supabase
    .from(TABLE)
    .update({ is_default: false })
    .eq('exercise_id', exerciseId)
  if (clearError) throw clearError

  const { error } = await supabase.from(TABLE).update({ is_default: true }).eq('id', linkId)
  if (error) throw error
}
