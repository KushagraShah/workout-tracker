import { supabase } from '../lib/supabase'
import type { Machine, MachineInput } from '../types'

const TABLE = 'machines'

export async function listMachines(): Promise<Machine[]> {
  const { data, error } = await supabase.from(TABLE).select('*').order('name')
  if (error) throw error
  return (data ?? []) as Machine[]
}

export async function getMachine(id: string): Promise<Machine> {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single()
  if (error) throw error
  return data as Machine
}

export async function createMachine(input: MachineInput): Promise<Machine> {
  const { data, error } = await supabase.from(TABLE).insert(input).select().single()
  if (error) throw error
  return data as Machine
}

export async function updateMachine(id: string, input: Partial<MachineInput>): Promise<Machine> {
  const { data, error } = await supabase.from(TABLE).update(input).eq('id', id).select().single()
  if (error) throw error
  return data as Machine
}

export async function setMachineArchived(id: string, archived: boolean): Promise<void> {
  const { error } = await supabase.from(TABLE).update({ archived }).eq('id', id)
  if (error) throw error
}

export async function deleteMachine(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}
