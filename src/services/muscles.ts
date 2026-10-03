import { supabase } from '../lib/supabase'
import type { Muscle, MuscleGroup } from '../types'

const GROUPS = 'muscle_groups'
const MUSCLES = 'muscles'

// --- Muscle groups ---------------------------------------------------------

export async function listMuscleGroups(): Promise<MuscleGroup[]> {
  const { data, error } = await supabase
    .from(GROUPS)
    .select('*')
    .order('order_index')
    .order('name')
  if (error) throw error
  return (data ?? []) as MuscleGroup[]
}

export async function createMuscleGroup(name: string, orderIndex = 0): Promise<MuscleGroup> {
  const { data, error } = await supabase
    .from(GROUPS)
    .insert({ name, order_index: orderIndex })
    .select()
    .single()
  if (error) throw error
  return data as MuscleGroup
}

export async function updateMuscleGroup(id: string, name: string): Promise<void> {
  const { error } = await supabase.from(GROUPS).update({ name }).eq('id', id)
  if (error) throw error
}

export async function deleteMuscleGroup(id: string): Promise<void> {
  const { error } = await supabase.from(GROUPS).delete().eq('id', id)
  if (error) throw error
}

// --- Muscles ---------------------------------------------------------------

export async function listMuscles(): Promise<Muscle[]> {
  const { data, error } = await supabase
    .from(MUSCLES)
    .select('*')
    .order('order_index')
    .order('name')
  if (error) throw error
  return (data ?? []) as Muscle[]
}

export async function createMuscle(
  muscleGroupId: string,
  name: string,
  orderIndex = 0,
): Promise<Muscle> {
  const { data, error } = await supabase
    .from(MUSCLES)
    .insert({ muscle_group_id: muscleGroupId, name, order_index: orderIndex })
    .select()
    .single()
  if (error) throw error
  return data as Muscle
}

export async function updateMuscle(id: string, name: string): Promise<void> {
  const { error } = await supabase.from(MUSCLES).update({ name }).eq('id', id)
  if (error) throw error
}

export async function deleteMuscle(id: string): Promise<void> {
  const { error } = await supabase.from(MUSCLES).delete().eq('id', id)
  if (error) throw error
}
