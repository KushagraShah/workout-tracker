import { useEffect, useState, type FormEvent } from 'react'
import { Badge, Button, EmptyState, ErrorText, PageHeader, Spinner, TextInput } from '../components/ui'
import {
  createMuscle,
  createMuscleGroup,
  deleteMuscle,
  deleteMuscleGroup,
  listMuscleGroups,
  listMuscles,
  updateMuscleGroup,
} from '../services/muscles'
import type { Muscle, MuscleGroup } from '../types'

export function MusclesPage() {
  const [groups, setGroups] = useState<MuscleGroup[] | null>(null)
  const [muscles, setMuscles] = useState<Muscle[]>([])
  const [error, setError] = useState('')
  const [newGroup, setNewGroup] = useState('')
  const [addingMuscleTo, setAddingMuscleTo] = useState<string | null>(null)
  const [newMuscle, setNewMuscle] = useState('')

  async function refresh() {
    try {
      const [gr, mu] = await Promise.all([listMuscleGroups(), listMuscles()])
      setGroups(gr)
      setMuscles(mu)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load muscles')
    }
  }

  useEffect(() => {
    let active = true
    Promise.all([listMuscleGroups(), listMuscles()])
      .then(([gr, mu]) => {
        if (!active) return
        setGroups(gr)
        setMuscles(mu)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load muscles')
      })
    return () => {
      active = false
    }
  }, [])

  async function addGroup(event: FormEvent) {
    event.preventDefault()
    const name = newGroup.trim()
    if (!name) return
    try {
      await createMuscleGroup(name, groups?.length ?? 0)
      setNewGroup('')
      await refresh()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not add group')
    }
  }

  async function renameGroup(group: MuscleGroup) {
    const name = window.prompt('Rename group', group.name)
    if (!name || !name.trim()) return
    await updateMuscleGroup(group.id, name.trim())
    await refresh()
  }

  async function removeGroup(group: MuscleGroup) {
    if (!window.confirm(`Delete "${group.name}" and its muscles?`)) return
    await deleteMuscleGroup(group.id)
    await refresh()
  }

  async function addMuscle(groupId: string) {
    const name = newMuscle.trim()
    if (!name) return
    try {
      await createMuscle(groupId, name, muscles.filter((m) => m.muscle_group_id === groupId).length)
      setNewMuscle('')
      setAddingMuscleTo(null)
      await refresh()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not add muscle')
    }
  }

  async function removeMuscle(muscle: Muscle) {
    if (!window.confirm(`Delete "${muscle.name}"?`)) return
    await deleteMuscle(muscle.id)
    await refresh()
  }

  return (
    <div>
      <PageHeader title="Muscle groups" />

      <form onSubmit={addGroup} className="mb-5 flex gap-2">
        <TextInput
          placeholder="New group, e.g. Delts"
          value={newGroup}
          onChange={(e) => setNewGroup(e.target.value)}
        />
        <Button type="submit">Add group</Button>
      </form>

      <ErrorText>{error}</ErrorText>

      {groups === null ? (
        <Spinner />
      ) : groups.length === 0 ? (
        <EmptyState
          title="No muscle groups yet"
          hint="Groups like Delts, Chest, Back, then specific muscles inside them."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {groups.map((group) => {
            const groupMuscles = muscles.filter((m) => m.muscle_group_id === group.id)
            return (
              <li key={group.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-white">{group.name}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" onClick={() => void renameGroup(group)}>
                      Rename
                    </Button>
                    <Button variant="ghost" onClick={() => void removeGroup(group)}>
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {groupMuscles.length === 0 ? (
                    <span className="text-sm text-slate-500">No muscles yet</span>
                  ) : (
                    groupMuscles.map((muscle) => (
                      <button
                        key={muscle.id}
                        type="button"
                        onClick={() => void removeMuscle(muscle)}
                        title="Click to delete"
                      >
                        <Badge>{muscle.name} ✕</Badge>
                      </button>
                    ))
                  )}
                </div>

                {addingMuscleTo === group.id ? (
                  <div className="mt-2 flex gap-2">
                    <TextInput
                      autoFocus
                      placeholder="Muscle name"
                      value={newMuscle}
                      onChange={(e) => setNewMuscle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void addMuscle(group.id)
                        }
                      }}
                    />
                    <Button onClick={() => void addMuscle(group.id)}>Add</Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setAddingMuscleTo(null)
                        setNewMuscle('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    className="mt-2"
                    onClick={() => {
                      setAddingMuscleTo(group.id)
                      setNewMuscle('')
                    }}
                  >
                    + Add muscle
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
