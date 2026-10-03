import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from '../components/Modal'
import { Button, EmptyState, ErrorText, Field, PageHeader, Spinner, TextArea, TextInput } from '../components/ui'
import { createRoutine, deleteRoutine, listRoutines, setActiveRoutine, updateRoutine } from '../services/routines'
import type { Routine, RoutineInput } from '../types'

function RoutineForm({
  routine,
  onClose,
  onSaved,
}: {
  routine: Routine | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(routine?.name ?? '')
  const [notes, setNotes] = useState(routine?.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const input: RoutineInput = { name: name.trim(), notes: notes.trim() || null }
      if (routine) await updateRoutine(routine.id, input)
      else await createRoutine(input)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save routine')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Routine name">
        <TextInput
          autoFocus
          required
          value={name}
          placeholder="e.g. Upper / Lower"
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      <Field label="Notes" hint="Optional — e.g. how you rotate this routine.">
        <TextArea value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button disabled={busy} type="submit">
        {busy ? 'Saving…' : routine ? 'Save changes' : 'Create routine'}
      </Button>
    </form>
  )
}

export function RoutinesPage() {
  const [routines, setRoutines] = useState<Routine[] | null>(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Routine | null>(null)

  async function refresh() {
    try {
      setError('')
      setRoutines(await listRoutines())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load routines')
      setRoutines([])
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function activate(routine: Routine) {
    try {
      setError('')
      await setActiveRoutine(routine.id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set active routine')
    }
  }

  async function remove(routine: Routine) {
    if (!window.confirm(`Delete “${routine.name}” and all its workout days?`)) return
    try {
      await deleteRoutine(routine.id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete routine')
    }
  }

  return (
    <div>
      <PageHeader title="Plan" action={<Button onClick={() => setCreating(true)}>New routine</Button>} />
      <p className="-mt-2 mb-5 text-sm text-slate-400">
        Build your training week, then choose one routine to put on the Today screen.
      </p>
      <ErrorText>{error}</ErrorText>

      {routines === null ? (
        <Spinner />
      ) : routines.length === 0 ? (
        <EmptyState title="No routine yet" hint="Create one, add workout days, then place exercises in order." />
      ) : (
        <ul className="flex flex-col gap-3">
          {routines.map((routine) => (
            <li key={routine.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <Link to={`/routines/${routine.id}`} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{routine.name}</span>
                    {routine.is_active ? (
                      <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
                        Active
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                    {routine.notes || 'Add workout days and exercises.'}
                  </p>
                </Link>
                <button
                  type="button"
                  onClick={() => setEditing(routine)}
                  className="rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  Edit
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-800 pt-3">
                <Button
                  variant={routine.is_active ? 'secondary' : 'primary'}
                  className="px-3 py-2 text-sm"
                  disabled={routine.is_active}
                  onClick={() => void activate(routine)}
                >
                  {routine.is_active ? 'On Today' : 'Set as active'}
                </Button>
                <Link
                  to={`/routines/${routine.id}`}
                  className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  Edit days →
                </Link>
                <button
                  type="button"
                  onClick={() => void remove(routine)}
                  className="ml-auto rounded-lg px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {creating ? (
        <Modal title="New routine" onClose={() => setCreating(false)}>
          <RoutineForm routine={null} onClose={() => setCreating(false)} onSaved={refresh} />
        </Modal>
      ) : null}
      {editing ? (
        <Modal title="Edit routine" onClose={() => setEditing(null)}>
          <RoutineForm routine={editing} onClose={() => setEditing(null)} onSaved={refresh} />
        </Modal>
      ) : null}
    </div>
  )
}