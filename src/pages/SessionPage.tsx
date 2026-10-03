import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, EmptyState, ErrorText, Spinner, TextInput } from '../components/ui'
import { listExercises } from '../services/exercises'
import { listMachines } from '../services/machines'
import { listRoutineDays, updateRoutine } from '../services/routines'
import {
  createSet,
  deleteSet,
  finishSession,
  getSession,
  listSessionExercises,
  listSets,
  updateSessionExercise,
} from '../services/sessions'
import type { Exercise, Machine, Session, SessionExercise, SetEntry, TrackingType } from '../types'

function formatElapsed(startedAt: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remaining = seconds % 60
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}` : `${minutes}:${String(remaining).padStart(2, '0')}`
}

function fieldsFor(type: TrackingType) {
  return {
    weight: type === 'weight_reps' || type === 'weight_duration',
    reps: type === 'weight_reps' || type === 'reps_only',
    duration: type === 'duration' || type === 'weight_duration',
    distance: type === 'distance',
  }
}

export function SessionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [sessionExercises, setSessionExercises] = useState<SessionExercise[] | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sets, setSets] = useState<SetEntry[]>([])
  const [loadingSets, setLoadingSets] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [duration, setDuration] = useState('')
  const [distance, setDistance] = useState('')
  const [warmup, setWarmup] = useState(false)
  const [savingSet, setSavingSet] = useState(false)

  const selected = sessionExercises?.find((exercise) => exercise.id === selectedId) ?? null
  const exerciseById = useMemo(() => new Map(exercises.map((exercise) => [exercise.id, exercise])), [exercises])
  const machineById = useMemo(() => new Map(machines.map((machine) => [machine.id, machine])), [machines])
  const exercise = selected?.exercise_id ? exerciseById.get(selected.exercise_id) : undefined
  const tracking = fieldsFor(exercise?.tracking_type ?? 'weight_reps')
  const canEdit = session?.status === 'in_progress'

  async function refreshExercises() {
    if (!id) return
    const next = await listSessionExercises(id)
    setSessionExercises(next)
    setSelectedId((current) => (current && next.some((entry) => entry.id === current) ? current : next[0]?.id ?? null))
  }

  async function refreshSets(sessionExerciseId: string) {
    setLoadingSets(true)
    try {
      const nextSets = await listSets(sessionExerciseId)
      setSets(nextSets)
      const previous = nextSets.at(-1)
      setWeight(previous?.weight?.toString() ?? '')
      setReps(previous?.reps?.toString() ?? '')
      setDuration(previous?.duration_seconds?.toString() ?? '')
      setDistance(previous?.distance_meters?.toString() ?? '')
      setWarmup(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load sets')
    } finally {
      setLoadingSets(false)
    }
  }

  useEffect(() => {
    if (!id) return
    let active = true
    Promise.all([getSession(id), listSessionExercises(id), listExercises(), listMachines()])
      .then(([nextSession, nextSessionExercises, nextExercises, nextMachines]) => {
        if (!active) return
        setSession(nextSession)
        setSessionExercises(nextSessionExercises)
        setSelectedId(nextSessionExercises[0]?.id ?? null)
        setExercises(nextExercises)
        setMachines(nextMachines)
      })
      .catch((err) => active && setError(err instanceof Error ? err.message : 'Could not load workout'))
    return () => { active = false }
  }, [id])

  useEffect(() => {
    if (!selectedId) {
      setSets([])
      return
    }
    void refreshSets(selectedId)
  }, [selectedId])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  async function addSet(event: FormEvent) {
    event.preventDefault()
    if (!selected || !canEdit) return
    const numeric = (value: string) => (value.trim() === '' ? null : Number(value))
    const nextWeight = numeric(weight)
    const nextReps = numeric(reps)
    const nextDuration = numeric(duration)
    const nextDistance = numeric(distance)
    const values = [nextWeight, nextReps, nextDuration, nextDistance]
    if (values.every((value) => value === null) || values.some((value) => value !== null && (!Number.isFinite(value) || value < 0))) {
      setError('Enter at least one valid, non-negative result.')
      return
    }
    setSavingSet(true)
    setError('')
    try {
      await createSet({
        session_exercise_id: selected.id,
        set_index: sets.reduce((highest, entry) => Math.max(highest, entry.set_index), -1) + 1,
        weight: nextWeight,
        reps: nextReps === null ? null : Math.round(nextReps),
        duration_seconds: nextDuration === null ? null : Math.round(nextDuration),
        distance_meters: nextDistance,
        is_warmup: warmup,
      })
      await refreshSets(selected.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save set')
    } finally {
      setSavingSet(false)
    }
  }

  async function changeStatus(status: 'done' | 'skipped') {
    if (!selected || !canEdit) return
    try {
      setError('')
      await updateSessionExercise(selected.id, { status })
      const next = await listSessionExercises(selected.session_id)
      setSessionExercises(next)
      const nextPending = next.find((entry) => entry.status === 'pending')
      if (nextPending) setSelectedId(nextPending.id)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not update exercise') }
  }

  async function removeSet(entry: SetEntry) {
    if (!session || session.status !== 'in_progress' || !selected || !window.confirm('Delete this set?')) return
    try {
      await deleteSet(entry.id)
      await refreshSets(selected.id)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not delete set') }
  }

  async function finish() {
    if (!session || session.status !== 'in_progress') return
    if (!window.confirm('Finish and save this workout?')) return
    try {
      setError('')
      await finishSession(session.id, 'completed')
      if (session.routine_id && session.routine_day_id) {
        const days = await listRoutineDays(session.routine_id)
        const index = days.findIndex((day) => day.id === session.routine_day_id)
        if (index >= 0 && days.length) await updateRoutine(session.routine_id, { current_day_index: (index + 1) % days.length })
      }
      navigate('/')
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not finish workout') }
  }

  if (!session || !sessionExercises) return <Spinner />
  const completedCount = sessionExercises.filter((entry) => entry.status === 'done' || entry.status === 'skipped').length

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <button type="button" onClick={() => navigate('/')} className="mb-1 text-sm text-sky-400 hover:text-sky-300">← {canEdit ? 'Save & leave' : 'Back to Today'}</button>
          <p className="text-xs font-medium uppercase tracking-wider text-sky-400">Round {session.round_number}</p>
          <h1 className="text-2xl font-semibold text-white">{session.day_name ?? 'Workout'}</h1>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-sm text-slate-200">{formatElapsed(session.started_at, now)}</div>
      </div>
      <div className="mb-4 flex items-center justify-between text-sm text-slate-400"><span>{completedCount} / {sessionExercises.length} complete</span>{canEdit ? <button type="button" onClick={() => void finish()} className="font-medium text-emerald-300 hover:text-emerald-200">Finish workout</button> : <span className="font-medium text-slate-300">{session.status}</span>}</div>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
        {sessionExercises.map((entry, index) => {
          const entryExercise = entry.exercise_id ? exerciseById.get(entry.exercise_id) : undefined
          return <button type="button" key={entry.id} onClick={() => setSelectedId(entry.id)} className={`min-w-24 rounded-lg border px-3 py-2 text-left text-xs ${entry.id === selectedId ? 'border-sky-400 bg-sky-400/10 text-white' : 'border-slate-800 bg-slate-900 text-slate-400'} ${entry.status === 'done' ? 'opacity-60' : ''}`}><span className="block text-slate-500">{index + 1} · {entry.status}</span><span className="mt-1 block truncate font-medium">{entryExercise?.name ?? 'Exercise'}</span></button>
        })}
      </div>

      {!selected ? <EmptyState title="No exercises in this workout" /> : (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div><h2 className="text-xl font-semibold text-white">{exercise?.name ?? 'Exercise'}</h2><p className="mt-1 text-sm text-slate-400">{selected.machine_id ? machineById.get(selected.machine_id)?.name ?? 'Selected machine' : 'No machine selected'}</p>{selected.notes ? <p className="mt-2 text-sm text-slate-500">{selected.notes}</p> : null}</div>
            <span className={`rounded-full px-2 py-1 text-xs font-medium ${selected.status === 'done' ? 'bg-emerald-400/10 text-emerald-300' : selected.status === 'skipped' ? 'bg-slate-800 text-slate-400' : 'bg-amber-400/10 text-amber-300'}`}>{selected.status}</span>
          </div>

          {canEdit && selected.status === 'pending' ? <form onSubmit={addSet} className="mb-5 border-y border-slate-800 py-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {tracking.weight ? <MetricInput label="Weight" value={weight} onChange={setWeight} suffix="lb" step="0.5" /> : null}
              {tracking.reps ? <MetricInput label="Reps" value={reps} onChange={setReps} step="1" /> : null}
              {tracking.duration ? <MetricInput label="Seconds" value={duration} onChange={setDuration} step="1" /> : null}
              {tracking.distance ? <MetricInput label="Meters" value={distance} onChange={setDistance} suffix="m" step="1" /> : null}
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={warmup} onChange={(event) => setWarmup(event.target.checked)} className="h-4 w-4 accent-sky-400" /> Warm-up set</label>
            <Button type="submit" disabled={savingSet} className="mt-3 w-full">{savingSet ? 'Saving…' : `+ Log set ${sets.length + 1}`}</Button>
          </form> : null}

          <ErrorText>{error}</ErrorText>
          {loadingSets ? <Spinner /> : sets.length === 0 ? <p className="py-3 text-sm text-slate-500">No sets logged yet.</p> : <SetTable sets={sets} tracking={tracking} onDelete={canEdit ? removeSet : undefined} />}

          {canEdit && selected.status === 'pending' ? <div className="mt-5 grid grid-cols-2 gap-3"><Button onClick={() => void changeStatus('done')}>Done</Button><Button variant="secondary" onClick={() => void changeStatus('skipped')}>Skip</Button></div> : canEdit ? <Button variant="secondary" className="mt-5 w-full" onClick={() => void updateSessionExercise(selected.id, { status: 'pending' }).then(() => refreshExercises())}>Mark pending</Button> : null}
        </section>
      )}
    </div>
  )
}

function MetricInput({ label, value, onChange, suffix, step }: { label: string; value: string; onChange: (value: string) => void; suffix?: string; step: string }) {
  return <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-400">{label}{suffix ? ` (${suffix})` : ''}</span><TextInput type="number" min="0" step={step} inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} /></label>
}

function SetTable({ sets, tracking, onDelete }: { sets: SetEntry[]; tracking: ReturnType<typeof fieldsFor>; onDelete?: (entry: SetEntry) => void }) {
  return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500"><tr><th className="pb-2 pr-3">Set</th>{tracking.weight ? <th className="pb-2 pr-3">Weight</th> : null}{tracking.reps ? <th className="pb-2 pr-3">Reps</th> : null}{tracking.duration ? <th className="pb-2 pr-3">Seconds</th> : null}{tracking.distance ? <th className="pb-2 pr-3">Meters</th> : null}{onDelete ? <th className="pb-2" aria-label="Actions" /> : null}</tr></thead><tbody>{sets.map((entry, index) => <tr key={entry.id} className="border-b border-slate-800/70 text-slate-200"><td className="py-3 pr-3">{index + 1}{entry.is_warmup ? <span className="ml-1 text-xs text-amber-300">W</span> : null}</td>{tracking.weight ? <td className="py-3 pr-3">{entry.weight ?? '—'}</td> : null}{tracking.reps ? <td className="py-3 pr-3">{entry.reps ?? '—'}</td> : null}{tracking.duration ? <td className="py-3 pr-3">{entry.duration_seconds ?? '—'}</td> : null}{tracking.distance ? <td className="py-3 pr-3">{entry.distance_meters ?? '—'}</td> : null}{onDelete ? <td className="py-3 text-right"><button type="button" onClick={() => onDelete(entry)} className="rounded px-1 text-slate-500 hover:text-rose-300" aria-label={`Delete set ${index + 1}`}>×</button></td> : null}</tr>)}</tbody></table></div>
}