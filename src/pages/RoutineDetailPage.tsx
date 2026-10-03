import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Modal } from '../components/Modal'
import { Button, EmptyState, ErrorText, Field, Select, Spinner, TextArea, TextInput } from '../components/ui'
import { isVariantSlot, roundsForDay, slotsForDay, validateDayItems } from '../lib/rounds'
import { listAllExerciseMachines } from '../services/exerciseMachines'
import { listExercises } from '../services/exercises'
import { listMachines } from '../services/machines'
import {
  createRoutineDay,
  createRoutineItem,
  deleteRoutineDay,
  deleteRoutineItem,
  getRoutine,
  listRoutineDays,
  listRoutineItems,
  moveRoutineDay,
  moveRoutineItemSlot,
  updateRoutineDay,
  updateRoutineItem,
} from '../services/routines'
import type { Exercise, ExerciseMachine, Machine, Routine, RoutineDay, RoutineItem } from '../types'

function DayForm({
  routineId,
  day,
  items,
  nextIndex,
  onClose,
  onSaved,
}: {
  routineId: string
  day: RoutineDay | null
  items: RoutineItem[]
  nextIndex: number
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(day?.name ?? '')
  const [roundCount, setRoundCount] = useState(String(day?.round_count ?? 1))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const rounds = Number(roundCount)
    if (!Number.isInteger(rounds) || rounds < 1 || rounds > 8) {
      setError('Rounds must be a whole number from 1 to 8.')
      return
    }
    const highestUsedRound = Math.max(1, ...items.map((item) => item.round_number ?? 1))
    if (rounds < highestUsedRound) {
      setError(`This day already uses Round ${highestUsedRound}. Remove or change those exercises first.`)
      return
    }
    setBusy(true)
    setError('')
    try {
      if (day) await updateRoutineDay(day.id, { name: name.trim(), round_count: rounds })
      else await createRoutineDay({ routine_id: routineId, name: name.trim(), order_index: nextIndex, round_count: rounds })
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save workout day')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Workout day name">
        <TextInput autoFocus required value={name} placeholder="e.g. Push" onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field label="Rounds" hint="Use rounds when exercises rotate between versions of this workout day.">
        <TextInput type="number" min="1" max="8" inputMode="numeric" value={roundCount} onChange={(event) => setRoundCount(event.target.value)} />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" disabled={busy}>{busy ? 'Saving…' : day ? 'Save day' : 'Add day'}</Button>
    </form>
  )
}

function ItemForm({
  day,
  item,
  items,
  exercises,
  machines,
  links,
  onClose,
  onSaved,
}: {
  day: RoutineDay
  item: RoutineItem | null
  items: RoutineItem[]
  exercises: Exercise[]
  machines: Machine[]
  links: ExerciseMachine[]
  onClose: () => void
  onSaved: () => void
}) {
  const [exerciseId, setExerciseId] = useState(item?.exercise_id ?? '')
  const [machineId, setMachineId] = useState(item?.machine_id ?? '')
  const [round, setRound] = useState(item?.round_number === null ? 'fixed' : String(item?.round_number))
  const [slotTarget, setSlotTarget] = useState('new')
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const slots = slotsForDay(items)
  const nextOrder = slots.length ? Math.max(...slots.map((slot) => slot.orderIndex)) + 1 : 0

  const allowedMachineIds = useMemo(
    () => links.filter((link) => link.exercise_id === exerciseId).map((link) => link.machine_id),
    [exerciseId, links],
  )
  const availableMachines = machines.filter((machine) => !machine.archived && allowedMachineIds.includes(machine.id))
  const compatibleSlots = useMemo(() => {
    if (round === 'fixed') return []
    const roundNumber = Number(round)
    return slots.filter((slot) => slot.fixed === null && !slot.byRound.has(roundNumber))
  }, [round, slots])

  function pickExercise(id: string) {
    setExerciseId(id)
    const defaultLink = links.find((link) => link.exercise_id === id && link.is_default)
    setMachineId(defaultLink?.machine_id ?? '')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!exerciseId) {
      setError('Choose an exercise.')
      return
    }
    const roundNumber = round === 'fixed' ? null : Number(round)
    if (roundNumber !== null && (!Number.isInteger(roundNumber) || roundNumber < 1 || roundNumber > day.round_count)) {
      setError('Choose a valid round.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const payload = {
        order_index: item?.order_index ?? (slotTarget === 'new' ? nextOrder : Number(slotTarget)),
        round_number: roundNumber,
        exercise_id: exerciseId,
        machine_id: machineId || null,
        notes: notes.trim() || null,
      }
      const candidateItems = item
        ? items.map((existing) => (existing.id === item.id ? { ...existing, ...payload } : existing))
        : [...items, { ...payload, id: 'new-item' } as RoutineItem]
      const problems = validateDayItems(day, candidateItems)
      if (problems.length) {
        setError(problems[0])
        return
      }
      if (item) await updateRoutineItem(item.id, payload)
      else await createRoutineItem({ routine_day_id: day.id, ...payload })
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save exercise')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Exercise">
        <Select required autoFocus value={exerciseId} onChange={(event) => pickExercise(event.target.value)}>
          <option value="">Choose an exercise…</option>
          {exercises.filter((exercise) => !exercise.archived).map((exercise) => (
            <option key={exercise.id} value={exercise.id}>{exercise.name}</option>
          ))}
        </Select>
      </Field>
      <Field label="Appears in">
        <Select value={round} onChange={(event) => { setRound(event.target.value); setSlotTarget('new') }}>
          <option value="fixed">Fixed — every round</option>
          {Array.from({ length: day.round_count }, (_, index) => index + 1).map((number) => (
            <option key={number} value={number}>Round {number} only</option>
          ))}
        </Select>
      </Field>
      {!item && round !== 'fixed' && compatibleSlots.length > 0 ? (
        <Field label="Training slot" hint="Use an existing slot when this exercise replaces another one in a different round.">
          <Select value={slotTarget} onChange={(event) => setSlotTarget(event.target.value)}>
            <option value="new">New slot at end of workout</option>
            {compatibleSlots.map((slot) => (
              <option key={slot.orderIndex} value={slot.orderIndex}>Slot {slot.orderIndex + 1} · add as this round&apos;s variant</option>
            ))}
          </Select>
        </Field>
      ) : null}
      <Field label="Preferred machine" hint={exerciseId && availableMachines.length === 0 ? 'No machines linked to this exercise yet.' : undefined}>
        <Select value={machineId} onChange={(event) => setMachineId(event.target.value)}>
          <option value="">No machine / choose during workout</option>
          {availableMachines.map((machine) => <option key={machine.id} value={machine.id}>{machine.name}</option>)}
        </Select>
      </Field>
      <Field label="Exercise note" hint="Optional cue for this workout day.">
        <TextArea value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" disabled={busy}>{busy ? 'Saving…' : item ? 'Save exercise' : 'Add to end of workout'}</Button>
    </form>
  )
}

export function RoutineDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [routine, setRoutine] = useState<Routine | null>(null)
  const [days, setDays] = useState<RoutineDay[] | null>(null)
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null)
  const [items, setItems] = useState<RoutineItem[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [links, setLinks] = useState<ExerciseMachine[]>([])
  const [error, setError] = useState('')
  const [addingDay, setAddingDay] = useState(false)
  const [editingDay, setEditingDay] = useState<RoutineDay | null>(null)
  const [addingItem, setAddingItem] = useState(false)
  const [editingItem, setEditingItem] = useState<RoutineItem | null>(null)

  const selectedDay = days?.find((day) => day.id === selectedDayId) ?? null
  const exerciseById = useMemo(() => new Map(exercises.map((exercise) => [exercise.id, exercise])), [exercises])
  const machineById = useMemo(() => new Map(machines.map((machine) => [machine.id, machine])), [machines])

  async function loadDays(routineId: string) {
    const nextDays = await listRoutineDays(routineId)
    setDays(nextDays)
    setSelectedDayId((current) => (current && nextDays.some((day) => day.id === current) ? current : nextDays[0]?.id ?? null))
  }

  async function refreshItems(dayId: string) {
    setItems(await listRoutineItems(dayId))
  }

  useEffect(() => {
    if (!id) return
    let active = true
    Promise.all([getRoutine(id), listRoutineDays(id), listExercises(), listMachines(), listAllExerciseMachines()])
      .then(([nextRoutine, nextDays, nextExercises, nextMachines, nextLinks]) => {
        if (!active) return
        setRoutine(nextRoutine)
        setDays(nextDays)
        setSelectedDayId(nextDays[0]?.id ?? null)
        setExercises(nextExercises)
        setMachines(nextMachines)
        setLinks(nextLinks)
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Could not load routine')
          setDays([])
        }
      })
    return () => { active = false }
  }, [id])

  useEffect(() => {
    if (!selectedDayId) {
      setItems([])
      return
    }
    void refreshItems(selectedDayId).catch((err) => setError(err instanceof Error ? err.message : 'Could not load exercises'))
  }, [selectedDayId])

  async function removeDay(day: RoutineDay) {
    if (!window.confirm(`Delete “${day.name}” and all its planned exercises?`)) return
    try {
      await deleteRoutineDay(day.id)
      await loadDays(day.routine_id)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not delete day') }
  }

  async function removeItem(item: RoutineItem) {
    if (!window.confirm('Remove this exercise from the workout?')) return
    try {
      await deleteRoutineItem(item.id)
      if (selectedDayId) await refreshItems(selectedDayId)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not remove exercise') }
  }

  async function moveDay(day: RoutineDay, direction: -1 | 1) {
    try {
      await moveRoutineDay(days ?? [], day.id, direction)
      await loadDays(day.routine_id)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not move workout day') }
  }

  async function moveSlot(orderIndex: number, direction: -1 | 1) {
    if (!selectedDayId) return
    try {
      await moveRoutineItemSlot(items, orderIndex, direction)
      await refreshItems(selectedDayId)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not move exercise slot') }
  }

  if (days === null || !routine) return <Spinner />

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <button type="button" onClick={() => navigate('/routines')} className="text-sm text-sky-400 hover:text-sky-300">← Plan</button>
        <span className="text-slate-700">/</span>
        <h1 className="min-w-0 truncate text-xl font-semibold text-white">{routine.name}</h1>
      </div>
      <ErrorText>{error}</ErrorText>

      <div className="mb-6 overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2">
          {days.map((day, index) => (
            <div key={day.id} className="relative w-28">
              <button
                type="button"
                onClick={() => setSelectedDayId(day.id)}
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                  day.id === selectedDayId ? 'border-sky-400 bg-sky-400/10 text-white' : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-600'
                }`}
              >
                <span className="block text-xs uppercase tracking-wide opacity-70">Day {index + 1}</span>
                <span className="mt-1 block truncate font-medium">{day.name}</span>
                <span className="mt-1 block text-xs opacity-70">{day.round_count} {day.round_count === 1 ? 'round' : 'rounds'}</span>
              </button>
              <div className="absolute right-1 top-1 flex rounded bg-slate-950/80">
                <button type="button" disabled={index === 0} onClick={() => void moveDay(day, -1)} className="px-1 text-xs text-slate-400 disabled:opacity-20" aria-label={`Move ${day.name} earlier`}>‹</button>
                <button type="button" disabled={index === days.length - 1} onClick={() => void moveDay(day, 1)} className="px-1 text-xs text-slate-400 disabled:opacity-20" aria-label={`Move ${day.name} later`}>›</button>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setAddingDay(true)} className="w-28 rounded-xl border border-dashed border-slate-700 px-3 py-3 text-sm text-slate-400 hover:border-sky-500 hover:text-sky-300">
            + Add day
          </button>
        </div>
      </div>

      {!selectedDay ? (
        <EmptyState title="Start with a workout day" hint="For example: Push, Pull, Legs, or Full body." />
      ) : (
        <section>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-sky-400">Workout day</p>
              <h2 className="text-2xl font-semibold text-white">{selectedDay.name}</h2>
              <p className="mt-1 text-sm text-slate-400">
                {selectedDay.round_count === 1 ? 'One fixed workout.' : `${selectedDay.round_count} rounds — Fixed items repeat; round items rotate.`}
              </p>
            </div>
            <button type="button" onClick={() => setEditingDay(selectedDay)} className="rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-slate-800 hover:text-white">Edit</button>
          </div>

          {selectedDay.round_count > 1 ? (
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
              {roundsForDay(selectedDay, items).map((round) => <span key={round} className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">Round {round}</span>)}
            </div>
          ) : null}

          {items.length === 0 ? (
            <EmptyState title="No exercises in this workout" hint="Add them in the order you prefer to train." />
          ) : (
            <ol className="flex flex-col gap-2">
              {slotsForDay(items).map((slot, index) => (
                <li key={slot.orderIndex} className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                  <div className="flex gap-3">
                    <div className="flex shrink-0 flex-col items-center gap-0.5"><div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-300">{index + 1}</div><button type="button" disabled={index === 0} onClick={() => void moveSlot(slot.orderIndex, -1)} className="text-xs text-slate-500 hover:text-white disabled:opacity-20" aria-label={`Move slot ${index + 1} earlier`}>↑</button><button type="button" disabled={index === slotsForDay(items).length - 1} onClick={() => void moveSlot(slot.orderIndex, 1)} className="text-xs text-slate-500 hover:text-white disabled:opacity-20" aria-label={`Move slot ${index + 1} later`}>↓</button></div>
                    <div className="min-w-0 flex-1">
                      {slot.fixed ? (
                        <ItemSummary item={slot.fixed} label="Fixed · every round" exerciseById={exerciseById} machineById={machineById} onEdit={setEditingItem} onRemove={removeItem} />
                      ) : (
                        <div className="space-y-2">
                          {[...slot.byRound.entries()].map(([round, item]) => (
                            <ItemSummary key={item.id} item={item} label={`Round ${round}`} exerciseById={exerciseById} machineById={machineById} onEdit={setEditingItem} onRemove={removeItem} />
                          ))}
                          {isVariantSlot(slot) && slot.byRound.size < selectedDay.round_count ? <p className="text-xs text-amber-300">Hidden in remaining rounds.</p> : null}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <Button className="mt-4 w-full" onClick={() => setAddingItem(true)}>+ Add exercise to end</Button>
          <div className="mt-5 border-t border-slate-800 pt-4">
            <button type="button" onClick={() => void removeDay(selectedDay)} className="text-sm text-rose-300 hover:text-rose-200">Delete this workout day</button>
          </div>
        </section>
      )}

      {addingDay ? <Modal title="Add workout day" onClose={() => setAddingDay(false)}><DayForm routineId={routine.id} day={null} items={[]} nextIndex={days.length} onClose={() => setAddingDay(false)} onSaved={() => void loadDays(routine.id)} /></Modal> : null}
      {editingDay ? <Modal title="Edit workout day" onClose={() => setEditingDay(null)}><DayForm routineId={routine.id} day={editingDay} items={editingDay.id === selectedDayId ? items : []} nextIndex={editingDay.order_index} onClose={() => setEditingDay(null)} onSaved={() => void loadDays(routine.id)} /></Modal> : null}
      {addingItem && selectedDay ? <Modal title={`Add exercise — ${selectedDay.name}`} onClose={() => setAddingItem(false)}><ItemForm day={selectedDay} item={null} items={items} exercises={exercises} machines={machines} links={links} onClose={() => setAddingItem(false)} onSaved={() => selectedDayId && void refreshItems(selectedDayId)} /></Modal> : null}
      {editingItem && selectedDay ? <Modal title="Edit planned exercise" onClose={() => setEditingItem(null)}><ItemForm day={selectedDay} item={editingItem} items={items} exercises={exercises} machines={machines} links={links} onClose={() => setEditingItem(null)} onSaved={() => selectedDayId && void refreshItems(selectedDayId)} /></Modal> : null}
    </div>
  )
}

function ItemSummary({
  item, label, exerciseById, machineById, onEdit, onRemove,
}: {
  item: RoutineItem
  label: string
  exerciseById: Map<string, Exercise>
  machineById: Map<string, Machine>
  onEdit: (item: RoutineItem) => void
  onRemove: (item: RoutineItem) => void
}) {
  const exercise = exerciseById.get(item.exercise_id)
  const machine = item.machine_id ? machineById.get(item.machine_id) : null
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="truncate font-medium text-white">{exercise?.name ?? 'Deleted exercise'}</p>
        <p className="mt-0.5 text-xs text-slate-400">{label}{machine ? ` · ${machine.name}` : ''}</p>
        {item.notes ? <p className="mt-1 text-xs text-slate-500">{item.notes}</p> : null}
      </div>
      <div className="flex shrink-0 gap-1">
        <button type="button" className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white" onClick={() => onEdit(item)} aria-label="Edit planned exercise">✎</button>
        <button type="button" className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-rose-300" onClick={() => void onRemove(item)} aria-label="Remove planned exercise">×</button>
      </div>
    </div>
  )
}