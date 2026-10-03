import { supabase } from '../lib/supabase'
import type { Routine, RoutineDay, RoutineDayInput, RoutineInput, RoutineItem, RoutineItemInput } from '../types'

export async function listRoutines(): Promise<Routine[]> {
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .order('is_active', { ascending: false })
    .order('created_at')
  if (error) throw error
  return (data ?? []) as Routine[]
}

export async function getRoutine(id: string): Promise<Routine> {
  const { data, error } = await supabase.from('routines').select('*').eq('id', id).single()
  if (error) throw error
  return data as Routine
}

export async function createRoutine(input: RoutineInput): Promise<Routine> {
  const { data, error } = await supabase.from('routines').insert(input).select().single()
  if (error) throw error
  return data as Routine
}

export async function updateRoutine(id: string, input: Partial<RoutineInput>): Promise<Routine> {
  const { data, error } = await supabase.from('routines').update(input).eq('id', id).select().single()
  if (error) throw error
  return data as Routine
}

export async function deleteRoutine(id: string): Promise<void> {
  const { error } = await supabase.from('routines').delete().eq('id', id)
  if (error) throw error
}

/** Makes this the only routine offered on the Home screen. */
export async function setActiveRoutine(id: string): Promise<void> {
  const { error: clearError } = await supabase.from('routines').update({ is_active: false }).eq('is_active', true)
  if (clearError) throw clearError
  const { error } = await supabase.from('routines').update({ is_active: true }).eq('id', id)
  if (error) throw error
}

export async function listRoutineDays(routineId: string): Promise<RoutineDay[]> {
  const { data, error } = await supabase
    .from('routine_days')
    .select('*')
    .eq('routine_id', routineId)
    .order('order_index')
  if (error) throw error
  return (data ?? []) as RoutineDay[]
}

export async function createRoutineDay(input: RoutineDayInput): Promise<RoutineDay> {
  const { data, error } = await supabase.from('routine_days').insert(input).select().single()
  if (error) throw error
  return data as RoutineDay
}

export async function updateRoutineDay(
  id: string,
  input: Partial<Omit<RoutineDayInput, 'routine_id'>>,
): Promise<RoutineDay> {
  const { data, error } = await supabase.from('routine_days').update(input).eq('id', id).select().single()
  if (error) throw error
  return data as RoutineDay
}

export async function deleteRoutineDay(id: string): Promise<void> {
  const { error } = await supabase.from('routine_days').delete().eq('id', id)
  if (error) throw error
}

/** Swap one workout day with its adjacent neighbour without violating the unique order index. */
export async function moveRoutineDay(days: RoutineDay[], dayId: string, direction: -1 | 1): Promise<void> {
  const ordered = [...days].sort((a, b) => a.order_index - b.order_index)
  const index = ordered.findIndex((day) => day.id === dayId)
  const target = ordered[index + direction]
  const source = ordered[index]
  if (!source || !target) return

  const temporaryIndex = Math.max(...ordered.map((day) => day.order_index), 0) + 10_000
  const { error: temporaryError } = await supabase
    .from('routine_days')
    .update({ order_index: temporaryIndex })
    .eq('id', source.id)
  if (temporaryError) throw temporaryError
  const { error: targetError } = await supabase
    .from('routine_days')
    .update({ order_index: source.order_index })
    .eq('id', target.id)
  if (targetError) throw targetError
  const { error: sourceError } = await supabase
    .from('routine_days')
    .update({ order_index: target.order_index })
    .eq('id', source.id)
  if (sourceError) throw sourceError
}

export async function listRoutineItems(dayId: string): Promise<RoutineItem[]> {
  const { data, error } = await supabase
    .from('routine_items')
    .select('*')
    .eq('routine_day_id', dayId)
    .order('order_index')
    .order('round_number', { ascending: true })
  if (error) throw error
  return (data ?? []) as RoutineItem[]
}

export async function createRoutineItem(input: RoutineItemInput): Promise<RoutineItem> {
  const { data, error } = await supabase.from('routine_items').insert(input).select().single()
  if (error) throw error
  return data as RoutineItem
}

export async function updateRoutineItem(
  id: string,
  input: Partial<Omit<RoutineItemInput, 'routine_day_id'>>,
): Promise<RoutineItem> {
  const { data, error } = await supabase.from('routine_items').update(input).eq('id', id).select().single()
  if (error) throw error
  return data as RoutineItem
}

export async function deleteRoutineItem(id: string): Promise<void> {
  const { error } = await supabase.from('routine_items').delete().eq('id', id)
  if (error) throw error
}

/** Moves a whole logical slot, keeping all of its round-specific variants together. */
export async function moveRoutineItemSlot(
  items: RoutineItem[],
  orderIndex: number,
  direction: -1 | 1,
): Promise<void> {
  const orderIndexes = [...new Set(items.map((item) => item.order_index))].sort((a, b) => a - b)
  const index = orderIndexes.indexOf(orderIndex)
  const targetOrderIndex = orderIndexes[index + direction]
  if (targetOrderIndex === undefined) return

  const sourceItems = items.filter((item) => item.order_index === orderIndex)
  const targetItems = items.filter((item) => item.order_index === targetOrderIndex)
  const temporaryBase = Math.max(...orderIndexes, 0) + 10_000
  const allItems = [...sourceItems, ...targetItems]

  for (let index = 0; index < allItems.length; index += 1) {
    const { error } = await supabase
      .from('routine_items')
      .update({ order_index: temporaryBase + index })
      .eq('id', allItems[index].id)
    if (error) throw error
  }
  for (const item of sourceItems) {
    const { error } = await supabase.from('routine_items').update({ order_index: targetOrderIndex }).eq('id', item.id)
    if (error) throw error
  }
  for (const item of targetItems) {
    const { error } = await supabase.from('routine_items').update({ order_index: orderIndex }).eq('id', item.id)
    if (error) throw error
  }
}