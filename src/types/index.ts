// Shared domain types. These mirror the tables created by
// scripts/001_schema.sql.

export type ExerciseRole = 'stretch' | 'cardio' | 'anchor' | 'accessory' | 'isolation'
export type DayTag = 'push' | 'pull' | 'other' | 'leg'
export type TrackingType = 'weight_reps' | 'reps_only' | 'duration' | 'distance' | 'weight_duration'
export type MachineType = 'free_weight' | 'basic_machine' | 'fancy_machine' | 'cable_machine'

export interface MuscleGroup {
  id: string
  user_id: string
  name: string
  order_index: number
  created_at: string
}

export interface Muscle {
  id: string
  user_id: string
  muscle_group_id: string
  name: string
  order_index: number
  created_at: string
}

export interface Exercise {
  id: string
  user_id: string
  name: string
  muscle_id: string | null
  role: ExerciseRole | null
  day_tag: DayTag | null
  tracking_type: TrackingType
  notes: string | null
  archived: boolean
  created_at: string
  updated_at: string
}

export interface ExerciseInput {
  name: string
  muscle_id: string | null
  role: ExerciseRole | null
  day_tag: DayTag | null
  tracking_type: TrackingType
  notes: string | null
  archived?: boolean
}

export interface Machine {
  id: string
  user_id: string
  name: string
  type: MachineType | null
  notes: string | null
  archived: boolean
  created_at: string
  updated_at: string
}

export interface MachineInput {
  name: string
  type: MachineType | null
  notes: string | null
  archived?: boolean
}

export interface ParameterPair {
  label: string
  value: string
}

export interface ExerciseMachine {
  id: string
  user_id: string
  exercise_id: string
  machine_id: string
  parameters: ParameterPair[]
  reference_url: string | null
  notes: string | null
  is_default: boolean
  created_at: string
}

export interface ExerciseMachineInput {
  exercise_id: string
  machine_id: string
  parameters: ParameterPair[]
  reference_url: string | null
  notes: string | null
  is_default: boolean
}

export const EXERCISE_ROLES: { value: ExerciseRole; label: string }[] = [
  { value: 'anchor', label: 'Anchor' },
  { value: 'accessory', label: 'Accessory' },
  { value: 'isolation', label: 'Isolation' },
  { value: 'stretch', label: 'Stretch' },
  { value: 'cardio', label: 'Cardio' },
]

export const DAY_TAGS: { value: DayTag; label: string }[] = [
  { value: 'push', label: 'Push' },
  { value: 'pull', label: 'Pull' },
  { value: 'other', label: 'Other' },
  { value: 'leg', label: 'Leg' },
]

export const TRACKING_TYPES: { value: TrackingType; label: string }[] = [
  { value: 'weight_reps', label: 'Weight × Reps' },
  { value: 'reps_only', label: 'Reps only' },
  { value: 'duration', label: 'Duration' },
  { value: 'distance', label: 'Distance' },
  { value: 'weight_duration', label: 'Weight × Duration' },
]

export const MACHINE_TYPES: { value: MachineType; label: string }[] = [
  { value: 'free_weight', label: 'Free Weight' },
  { value: 'basic_machine', label: 'Basic Machine' },
  { value: 'fancy_machine', label: 'Fancy Machine' },
  { value: 'cable_machine', label: 'Cable Machine' },
]

export function labelFor<T extends string>(
  options: { value: T; label: string }[],
  value: T | null | undefined,
): string | null {
  if (!value) return null
  return options.find((o) => o.value === value)?.label ?? value
}
