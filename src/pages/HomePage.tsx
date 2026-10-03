import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, EmptyState, ErrorText, Spinner } from '../components/ui'
import { useAuth } from '../contexts/useAuth'
import { itemsForRound, roundsForDay } from '../lib/rounds'
import { listExercises } from '../services/exercises'
import { listRoutineDays, listRoutineItems, listRoutines } from '../services/routines'
import { findInProgressSession, startSession } from '../services/sessions'
import type { Exercise, Routine, RoutineDay, RoutineItem, Session } from '../types'

interface TodayData {
  activeRoutine: Routine | null
  days: RoutineDay[]
  items: RoutineItem[]
  exercises: Exercise[]
  inProgress: Session | null
}

export function HomePage() {
  const { displayName } = useAuth()
  const [data, setData] = useState<TodayData | null>(null)
  const [round, setRound] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const currentDay = useMemo(() => {
    if (!data?.activeRoutine || data.days.length === 0) return null
    return data.days[data.activeRoutine.current_day_index % data.days.length] ?? data.days[0]
  }, [data])
  const dayItems = useMemo(() => (currentDay ? data?.items ?? [] : []), [currentDay, data?.items])
  const rounds = useMemo(() => (currentDay ? roundsForDay(currentDay, dayItems) : []), [currentDay, dayItems])
  const selectedItems = useMemo(() => itemsForRound(dayItems, round), [dayItems, round])
  const exerciseById = useMemo(() => new Map(data?.exercises.map((exercise) => [exercise.id, exercise]) ?? []), [data])

  useEffect(() => {
    let active = true
    Promise.all([listRoutines(), listExercises(), findInProgressSession()])
      .then(async ([routines, exercises, inProgress]) => {
        const activeRoutine = routines.find((routine) => routine.is_active) ?? null
        const days = activeRoutine ? await listRoutineDays(activeRoutine.id) : []
        const nextDay = days.length ? days[activeRoutine!.current_day_index % days.length] : null
        const items = nextDay ? await listRoutineItems(nextDay.id) : []
        if (active) setData({ activeRoutine, days, items, exercises, inProgress })
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Could not load Today')
          setData({ activeRoutine: null, days: [], items: [], exercises: [], inProgress: null })
        }
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (rounds.length && !rounds.includes(round)) setRound(rounds[0])
  }, [round, rounds])

  async function beginWorkout() {
    if (!currentDay || !data?.activeRoutine || selectedItems.length === 0) return
    setBusy(true)
    setError('')
    try {
      const session = await startSession({
        routine_id: data.activeRoutine.id,
        routine_day_id: currentDay.id,
        day_name: currentDay.name,
        round_number: round,
        exercises: selectedItems.map((item) => ({
          planned_exercise_id: item.exercise_id,
          exercise_id: item.exercise_id,
          machine_id: item.machine_id,
          order_index: item.order_index,
          notes: item.notes,
        })),
      })
      window.location.assign(`/sessions/${session.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start workout')
      setBusy(false)
    }
  }

  return (
    <div>
      <p className="text-sm font-medium text-sky-400">TODAY</p>
      <h1 className="mt-1 text-2xl font-semibold text-white">Ready when you are, {displayName ?? 'there'}.</h1>
      <ErrorText>{error}</ErrorText>

      {data === null ? <Spinner /> : data.inProgress ? (
        <section className="mt-6 rounded-2xl border border-sky-500/40 bg-sky-500/10 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-sky-300">Workout in progress</p>
          <h2 className="mt-1 text-xl font-semibold text-white">{data.inProgress.day_name ?? 'Workout'}</h2>
          <p className="mt-1 text-sm text-slate-300">Round {data.inProgress.round_number} · started {new Date(data.inProgress.started_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
          <Link to={`/sessions/${data.inProgress.id}`} className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-sky-400 px-4 py-3 font-medium text-slate-950 hover:bg-sky-300">Resume workout →</Link>
        </section>
      ) : !data.activeRoutine ? (
        <div className="mt-6"><EmptyState title="Choose a routine for Today" hint="Create a training plan and make it active to see your next workout here." /><Link to="/routines" className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-sky-500 px-4 py-3 font-medium text-slate-950 hover:bg-sky-400">Build a routine</Link></div>
      ) : !currentDay ? (
        <div className="mt-6"><EmptyState title={`“${data.activeRoutine.name}” has no workout days`} hint="Add your first day in Plan." /><Link to={`/routines/${data.activeRoutine.id}`} className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-sky-500 px-4 py-3 font-medium text-slate-950 hover:bg-sky-400">Add workout day</Link></div>
      ) : (
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wider text-sky-400">Up next · {data.activeRoutine.name}</p><h2 className="mt-1 text-2xl font-semibold text-white">{currentDay.name}</h2></div><Link to={`/routines/${data.activeRoutine.id}`} className="rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-slate-800 hover:text-white">Edit</Link></div>
          {rounds.length > 1 ? <div className="mt-5 flex gap-2 overflow-x-auto pb-1">{rounds.map((number) => <button type="button" key={number} onClick={() => setRound(number)} className={`rounded-lg px-4 py-2 text-sm font-medium ${round === number ? 'bg-sky-400 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>Round {number}</button>)}</div> : null}
          <div className="mt-5 border-y border-slate-800 py-3"><p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{selectedItems.length} planned exercises</p>{selectedItems.length ? <ol className="space-y-2">{selectedItems.map((item, index) => <li key={item.id} className="flex items-center gap-3 text-sm"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs text-slate-400">{index + 1}</span><span className="font-medium text-slate-200">{exerciseById.get(item.exercise_id)?.name ?? 'Deleted exercise'}</span></li>)}</ol> : <p className="text-sm text-amber-300">This round does not have any exercises yet.</p>}</div>
          <Button className="mt-5 w-full" disabled={busy || selectedItems.length === 0} onClick={() => void beginWorkout()}>{busy ? 'Starting…' : 'Start workout'}</Button>
        </section>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3"><Link to="/routines" className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm font-medium text-slate-200 hover:border-sky-600">📋 Edit plan</Link><Link to="/exercises" className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm font-medium text-slate-200 hover:border-sky-600">🏋️ Exercise library</Link></div>
    </div>
  )
}
