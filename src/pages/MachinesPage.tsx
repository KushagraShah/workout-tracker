import { useEffect, useState, type FormEvent } from 'react'
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
import { createMachine, deleteMachine, listMachines, updateMachine } from '../services/machines'
import { MACHINE_TYPES, labelFor, type Machine, type MachineInput, type MachineType } from '../types'

function MachineForm({
  machine,
  onClose,
  onSaved,
}: {
  machine: Machine | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<MachineInput>({
    name: machine?.name ?? '',
    type: machine?.type ?? null,
    notes: machine?.notes ?? null,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const payload: MachineInput = {
        ...form,
        name: form.name.trim(),
        notes: form.notes?.trim() || null,
      }
      if (machine) await updateMachine(machine.id, payload)
      else await createMachine(payload)
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
          placeholder="e.g. Rear Delt Machine"
        />
      </Field>
      <Field label="Type">
        <Select
          value={form.type ?? ''}
          onChange={(e) =>
            setForm({ ...form, type: (e.target.value || null) as MachineType | null })
          }
        >
          <option value="">— none —</option>
          {MACHINE_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Notes">
        <TextArea
          value={form.notes ?? ''}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Location, quirks, etc."
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

export function MachinesPage() {
  const [machines, setMachines] = useState<Machine[] | null>(null)
  const [error, setError] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [editing, setEditing] = useState<Machine | null>(null)
  const [creating, setCreating] = useState(false)

  async function refresh() {
    try {
      setMachines(await listMachines())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load machines')
    }
  }

  useEffect(() => {
    let active = true
    listMachines()
      .then((data) => {
        if (active) setMachines(data)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load machines')
      })
    return () => {
      active = false
    }
  }, [])

  async function toggleArchive(machine: Machine) {
    await updateMachine(machine.id, { archived: !machine.archived })
    await refresh()
  }

  async function remove(machine: Machine) {
    if (!window.confirm(`Delete "${machine.name}"? This cannot be undone.`)) return
    try {
      await deleteMachine(machine.id)
      await refresh()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const visible = (machines ?? []).filter((m) => showArchived || !m.archived)

  return (
    <div>
      <PageHeader title="Machines" action={<Button onClick={() => setCreating(true)}>Add</Button>} />

      <label className="mb-4 flex items-center gap-2 text-sm text-slate-400">
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(e) => setShowArchived(e.target.checked)}
        />
        Show archived
      </label>

      <ErrorText>{error}</ErrorText>

      {machines === null ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <EmptyState
          title="No machines yet"
          hint="Add the specific machines and equipment you use."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((machine) => (
            <li
              key={machine.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-white">{machine.name}</span>
                  {machine.archived ? <Badge>Archived</Badge> : null}
                </div>
                {labelFor(MACHINE_TYPES, machine.type) ? (
                  <div className="mt-1">
                    <Badge>{labelFor(MACHINE_TYPES, machine.type)}</Badge>
                  </div>
                ) : null}
                {machine.notes ? (
                  <p className="mt-1 text-sm text-slate-400">{machine.notes}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" onClick={() => setEditing(machine)}>
                  Edit
                </Button>
                <Button variant="ghost" onClick={() => void toggleArchive(machine)}>
                  {machine.archived ? 'Restore' : 'Archive'}
                </Button>
                <Button variant="ghost" onClick={() => void remove(machine)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {creating ? (
        <Modal title="New machine" onClose={() => setCreating(false)}>
          <MachineForm machine={null} onClose={() => setCreating(false)} onSaved={refresh} />
        </Modal>
      ) : null}

      {editing ? (
        <Modal title="Edit machine" onClose={() => setEditing(null)}>
          <MachineForm machine={editing} onClose={() => setEditing(null)} onSaved={refresh} />
        </Modal>
      ) : null}
    </div>
  )
}

