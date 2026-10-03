import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { listExercises } from '../services/exercises'
import { listMachines } from '../services/machines'

interface Counts {
  exercises: number
  machines: number
}

export function HomePage() {
  const { user } = useAuth()
  const [counts, setCounts] = useState<Counts | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([listExercises(), listMachines()])
      .then(([exercises, machines]) => {
        if (active) setCounts({ exercises: exercises.length, machines: machines.length })
      })
      .catch(() => {
        if (active) setCounts({ exercises: 0, machines: 0 })
      })
    return () => {
      active = false
    }
  }, [])

  const displayName: string =
    (user?.user_metadata?.display_name as string | undefined) ?? user?.email ?? 'there'

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Welcome back, {displayName}</h1>
      <p className="mt-1 text-sm text-slate-400">
        The workout flow arrives in Phase 2. For now, build your catalogue.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Link
          to="/exercises"
          className="rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-sky-600"
        >
          <div className="text-2xl">🏋️</div>
          <div className="mt-2 font-medium text-white">Exercises</div>
          <div className="text-sm text-slate-400">
            {counts ? `${counts.exercises} saved` : 'Loading…'}
          </div>
        </Link>
        <Link
          to="/machines"
          className="rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-sky-600"
        >
          <div className="text-2xl">🛠️</div>
          <div className="mt-2 font-medium text-white">Machines</div>
          <div className="text-sm text-slate-400">
            {counts ? `${counts.machines} saved` : 'Loading…'}
          </div>
        </Link>
        <Link
          to="/muscles"
          className="rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-sky-600"
        >
          <div className="text-2xl">🎯</div>
          <div className="mt-2 font-medium text-white">Muscle groups</div>
          <div className="text-sm text-slate-400">Organise your catalogue</div>
        </Link>
      </div>
    </div>
  )
}
