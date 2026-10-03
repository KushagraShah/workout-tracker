import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from '../components/Modal'
import {
  Badge,
  Button,
  EmptyState,
  ErrorText,
  Field,
  PageHeader,
  Select,
  Spinner,
  TextArea,
  TextInput,
} from '../components/ui'
import {
  createExercise,
  deleteExercise,
  listExercises,
  updateExercise,
} from '../services/exercises'
import { listMuscleGroups, listMuscles } from '../services/muscles'
import {
  DAY_TAGS,
  EXERCISE_ROLES,
  TRACKING_TYPES,
  labelFor,
  type DayTag,
  type Exercise,
  type ExerciseInput,
  type ExerciseRole,
  type Muscle,
  type MuscleGroup,
  type TrackingType,
} from '../types'

export function ExerciseForm({
  exercise,
  groups,
  muscles,
  onClose,
  onSaved,
}: {
  exercise: Exercise | null
  groups: MuscleGroup[]
  muscles: Muscle[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<ExerciseInput>({
    name: exercise?.name ?? '',
    muscle_id: exercise?.muscle_id ?? null,
    role: exercise?.role ?? null,
    day_tag: exercise?.day_tag ?? null,
    tracking_type: exercise?.tracking_type ?? 'weight_reps',
    notes: exercise?.notes ?? null,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const payload: ExerciseInput = {
        ...form,
        name: form.name.trim(),
        notes: form.notes?.trim() || null,
      }
      if (exercise) await updateExercise(exercise.id, payload)
      else await createExercise(payload)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Name">
        <TextInput
          required
          autoFocus
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Rear Delt Fly"
        />
      </Field>

      <Field label="Muscle">
        <Select
          value={form.muscle_id ?? ''}
          onChange={(e) => setForm({ ...form, muscle_id: e.target.value || null })}
        >
          <option value="">— none —</option>
          {groups.map((group) => (
            <optgroup key={group.id} label={group.name}>
              {muscles
                .filter((m) => m.muscle_group_id === group.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Role">
          <Select
            value={form.role ?? ''}
            onChange={(e) =>
              setForm({ ...form, role: (e.target.value || null) as ExerciseRole | null })
            }
          >
            <option value="">— none —</option>
            {EXERCISE_ROLES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Day tag">
          <Select
            value={form.day_tag ?? ''}
            onChange={(e) => setForm({ ...form, day_tag: (e.target.value || null) as DayTag | null })}
          >
            <option value="">— none —</option>
            {DAY_TAGS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Tracking type" hint="Decides what you log for this exercise.">
        <Select
          value={form.tracking_type}
          onChange={(e) => setForm({ ...form, tracking_type: e.target.value as TrackingType })}
        >
          {TRACKING_TYPES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Notes">
        <TextArea
          value={form.notes ?? ''}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Cues, reminders, etc."
        />
      </Field>

      <ErrorText>{error}</ErrorText>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  )
}

export function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[] | null>(null)
  const [groups, setGroups] = useState<MuscleGroup[]>([])
  const [muscles, setMuscles] = useState<Muscle[]>([])
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Exercise | null>(null)

  async function refresh() {
    try {
      const [ex, gr, mu] = await Promise.all([listExercises(), listMuscleGroups(), listMuscles()])
      setExercises(ex)
      setGroups(gr)
      setMuscles(mu)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercises')
    }
  }

  useEffect(() => {
    let active = true
    Promise.all([listExercises(), listMuscleGroups(), listMuscles()])
      .then(([ex, gr, mu]) => {
        if (!active) return
        setExercises(ex)
        setGroups(gr)
        setMuscles(mu)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load exercises')
      })
    return () => {
      active = false
    }
  }, [])

  const muscleById = useMemo(() => new Map(muscles.map((m) => [m.id, m])), [muscles])
  const groupById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups])

  function muscleLabel(exercise: Exercise): string | null {
    const muscle = exercise.muscle_id ? muscleById.get(exercise.muscle_id) : undefined
    if (!muscle) return null
    const group = groupById.get(muscle.muscle_group_id)
    return group ? `${muscle.name} · ${group.name}` : muscle.name
  }

  async function toggleArchive(exercise: Exercise) {
    await updateExercise(exercise.id, { archived: !exercise.archived })
    await refresh()
  }

  async function remove(exercise: Exercise) {
    if (!window.confirm(`Delete "${exercise.name}"? This cannot be undone.`)) return
    try {
      await deleteExercise(exercise.id)
      await refresh()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const needle = query.trim().toLowerCase()
  const visible = (exercises ?? []).filter(
    (ex) => (showArchived || !ex.archived) && ex.name.toLowerCase().includes(needle),
  )

  return (
    <div>
      <PageHeader
        title="Exercises"
        action={<Button onClick={() => setCreating(true)}>Add</Button>}
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <TextInput
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label className="flex items-center gap-2 whitespace-nowrap text-sm text-slate-400">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived
        </label>
      </div>

      <ErrorText>{error}</ErrorText>

      {exercises === null ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <EmptyState title="No exercises yet" hint="Add the movements you train." />
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((exercise) => (
            <li
              key={exercise.id}
              className="rounded-xl border border-slate-800 bg-slate-900 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <Link to={`/exercises/${exercise.id}`} className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-white">{exercise.name}</span>
                    {exercise.archived ? <Badge>Archived</Badge> : null}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {muscleLabel(exercise) ? <Badge>{muscleLabel(exercise)}</Badge> : null}
                    {labelFor(EXERCISE_ROLES, exercise.role) ? (
                      <Badge>{labelFor(EXERCISE_ROLES, exercise.role)}</Badge>
                    ) : null}
                    {labelFor(DAY_TAGS, exercise.day_tag) ? (
                      <Badge>{labelFor(DAY_TAGS, exercise.day_tag)}</Badge>
                    ) : null}
                  </div>
                </Link>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Button variant="ghost" onClick={() => setEditing(exercise)}>
                    Edit
                  </Button>
                  <Button variant="ghost" onClick={() => void toggleArchive(exercise)}>
                    {exercise.archived ? 'Restore' : 'Archive'}
                  </Button>
                  <Button variant="ghost" onClick={() => void remove(exercise)}>
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {creating ? (
        <Modal title="New exercise" onClose={() => setCreating(false)}>
          <ExerciseForm
            exercise={null}
            groups={groups}
            muscles={muscles}
            onClose={() => setCreating(false)}
            onSaved={refresh}
          />
        </Modal>
      ) : null}

      {editing ? (
        <Modal title="Edit exercise" onClose={() => setEditing(null)}>
          <ExerciseForm
            exercise={editing}
            groups={groups}
            muscles={muscles}
            onClose={() => setEditing(null)}
            onSaved={refresh}
          />
        </Modal>
      ) : null}
    </div>
  )
}

