import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
import { getExercise } from '../services/exercises'
import {
  createExerciseMachine,
  deleteExerciseMachine,
  listExerciseMachines,
  setDefaultExerciseMachine,
  updateExerciseMachine,
} from '../services/exerciseMachines'
import { listMachines } from '../services/machines'
import { listMuscleGroups, listMuscles } from '../services/muscles'
import {
  DAY_TAGS,
  EXERCISE_ROLES,
  labelFor,
  type Exercise,
  type ExerciseMachine,
  type Machine,
  type Muscle,
  type MuscleGroup,
  type ParameterPair,
} from '../types'
import { ExerciseForm } from './ExercisesPage'

function ParametersEditor({
  value,
  onChange,
}: {
  value: ParameterPair[]
  onChange: (value: ParameterPair[]) => void
}) {
  function update(index: number, patch: Partial<ParameterPair>) {
    onChange(value.map((pair, i) => (i === index ? { ...pair, ...patch } : pair)))
  }
  return (
    <div className="flex flex-col gap-2">
      {value.map((pair, index) => (
        <div key={index} className="flex gap-2">
          <TextInput
            value={pair.label}
            placeholder="Label"
            onChange={(e) => update(index, { label: e.target.value })}
          />
          <TextInput
            value={pair.value}
            placeholder="Value"
            onChange={(e) => update(index, { value: e.target.value })}
          />
          <Button
            type="button"
            variant="ghost"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            ✕
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() => onChange([...value, { label: '', value: '' }])}
      >
        Add parameter
      </Button>
    </div>
  )
}

function MachineLinkForm({
  exerciseId,
  link,
  machines,
  onClose,
  onSaved,
}: {
  exerciseId: string
  link: ExerciseMachine | null
  machines: Machine[]
  onClose: () => void
  onSaved: () => void
}) {
  const [machineId, setMachineId] = useState(link?.machine_id ?? '')
  const [parameters, setParameters] = useState<ParameterPair[]>(link?.parameters ?? [])
  const [referenceUrl, setReferenceUrl] = useState(link?.reference_url ?? '')
  const [notes, setNotes] = useState(link?.notes ?? '')
  const [isDefault, setIsDefault] = useState(link?.is_default ?? false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!machineId) {
      setError('Choose a machine')
      return
    }
    setError('')
    setBusy(true)
    try {
      const payload = {
        exercise_id: exerciseId,
        machine_id: machineId,
        parameters: parameters.filter((p) => p.label.trim() || p.value.trim()),
        reference_url: referenceUrl.trim() || null,
        notes: notes.trim() || null,
        is_default: isDefault,
      }
      if (link) await updateExerciseMachine(link.id, payload)
      else await createExerciseMachine(payload)
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
      <Field label="Machine">
        <Select required value={machineId} onChange={(e) => setMachineId(e.target.value)}>
          <option value="">— select —</option>
          {machines.map((machine) => (
            <option key={machine.id} value={machine.id}>
              {machine.name}
            </option>
          ))}
        </Select>
      </Field>

      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-300">Setup parameters</p>
        <ParametersEditor value={parameters} onChange={setParameters} />
      </div>

      <Field label="Reference URL" hint="Video or article showing the movement.">
        <TextInput
          type="url"
          value={referenceUrl}
          onChange={(e) => setReferenceUrl(e.target.value)}
          placeholder="https://…"
        />
      </Field>

      <Field label="Notes">
        <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
        Use as default machine for this exercise
      </label>

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

export function ExerciseDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()

  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [links, setLinks] = useState<ExerciseMachine[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [groups, setGroups] = useState<MuscleGroup[]>([])
  const [muscles, setMuscles] = useState<Muscle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingExercise, setEditingExercise] = useState(false)
  const [addingLink, setAddingLink] = useState(false)
  const [editingLink, setEditingLink] = useState<ExerciseMachine | null>(null)

  async function refresh() {
    try {
      const [ex, lk, mc] = await Promise.all([
        getExercise(id),
        listExerciseMachines(id),
        listMachines(),
      ])
      setExercise(ex)
      setLinks(lk)
      setMachines(mc)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercise')
    }
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([
      getExercise(id),
      listExerciseMachines(id),
      listMachines(),
      listMuscleGroups(),
      listMuscles(),
    ])
      .then(([ex, lk, mc, gr, mu]) => {
        if (!active) return
        setExercise(ex)
        setLinks(lk)
        setMachines(mc)
        setGroups(gr)
        setMuscles(mu)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Failed to load exercise')
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  const muscleById = useMemo(() => new Map(muscles.map((m) => [m.id, m])), [muscles])
  const groupById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups])
  const machineById = useMemo(() => new Map(machines.map((m) => [m.id, m])), [machines])

  const muscle = exercise?.muscle_id ? muscleById.get(exercise.muscle_id) : undefined
  const group = muscle ? groupById.get(muscle.muscle_group_id) : undefined

  async function makeDefault(link: ExerciseMachine) {
    await setDefaultExerciseMachine(id, link.id)
    await refresh()
  }

  async function removeLink(link: ExerciseMachine) {
    if (!window.confirm('Remove this machine link?')) return
    await deleteExerciseMachine(link.id)
    await refresh()
  }

  if (loading) return <Spinner />
  if (error) return <ErrorText>{error}</ErrorText>
  if (!exercise) return <EmptyState title="Exercise not found" />

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/exercises')}
        className="mb-2 text-sm text-slate-400 hover:text-white"
      >
        ← Exercises
      </button>

      <PageHeader
        title={exercise.name}
        action={
          <Button variant="secondary" onClick={() => setEditingExercise(true)}>
            Edit
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {muscle ? <Badge>{group ? `${muscle.name} · ${group.name}` : muscle.name}</Badge> : null}
        {labelFor(EXERCISE_ROLES, exercise.role) ? (
          <Badge>{labelFor(EXERCISE_ROLES, exercise.role)}</Badge>
        ) : null}
        {labelFor(DAY_TAGS, exercise.day_tag) ? (
          <Badge>{labelFor(DAY_TAGS, exercise.day_tag)}</Badge>
        ) : null}
        {exercise.archived ? <Badge>Archived</Badge> : null}
      </div>

      {exercise.notes ? (
        <p className="mb-6 whitespace-pre-wrap text-sm text-slate-300">{exercise.notes}</p>
      ) : null}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Machines</h2>
        <Button onClick={() => setAddingLink(true)}>Add machine</Button>
      </div>

      {links.length === 0 ? (
        <EmptyState
          title="No machines linked"
          hint="Link the machines you perform this exercise on and store their setup."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {links.map((link) => (
            <li key={link.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-white">
                      {machineById.get(link.machine_id)?.name ?? 'Unknown machine'}
                    </span>
                    {link.is_default ? <Badge>Default</Badge> : null}
                  </div>
                  {link.parameters.length > 0 ? (
                    <ul className="mt-2 list-inside list-disc text-sm text-slate-300">
                      {link.parameters.map((pair, index) => (
                        <li key={index}>
                          {pair.label}: {pair.value}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {link.notes ? <p className="mt-2 text-sm text-slate-400">{link.notes}</p> : null}
                  {link.reference_url ? (
                    <a
                      href={link.reference_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-sm text-sky-400 hover:underline"
                    >
                      Reference ↗
                    </a>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Button variant="ghost" onClick={() => setEditingLink(link)}>
                    Edit
                  </Button>
                  {link.is_default ? null : (
                    <Button variant="ghost" onClick={() => void makeDefault(link)}>
                      Set default
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => void removeLink(link)}>
                    Remove
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editingExercise ? (
        <Modal title="Edit exercise" onClose={() => setEditingExercise(false)}>
          <ExerciseForm
            exercise={exercise}
            groups={groups}
            muscles={muscles}
            onClose={() => setEditingExercise(false)}
            onSaved={refresh}
          />
        </Modal>
      ) : null}

      {addingLink ? (
        <Modal title="Add machine" onClose={() => setAddingLink(false)}>
          <MachineLinkForm
            exerciseId={id}
            link={null}
            machines={machines}
            onClose={() => setAddingLink(false)}
            onSaved={refresh}
          />
        </Modal>
      ) : null}

      {editingLink ? (
        <Modal title="Edit machine link" onClose={() => setEditingLink(null)}>
          <MachineLinkForm
            exerciseId={id}
            link={editingLink}
            machines={machines}
            onClose={() => setEditingLink(null)}
            onSaved={refresh}
          />
        </Modal>
      ) : null}
    </div>
  )
}

