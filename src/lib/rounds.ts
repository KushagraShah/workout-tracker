import type { RoutineDay, RoutineItem } from '../types'

/**
 * Round semantics (mirrors the comments in scripts/001_schema.sql):
 *
 *   round_number = null   -> Fixed      performed in every round
 *   round_number = 1, 2.. -> that round performed only in that round
 *   no row at all         -> Hidden     part of no round of that day
 *
 * Items sharing an `order_index` but carrying different round numbers are the
 * same logical *slot*: e.g. Hammer Curls in Round 1 and Bicep Curls in Round 2
 * occupy one slot and swap as the round changes. These are the "variants".
 */

export function roundLabel(round: number | null): string {
  return round === null ? 'Fixed' : `Round ${round}`
}

/** How one slot of a day behaves as the round changes. */
export interface Slot {
  orderIndex: number
  /** The round-independent item, when this slot is Fixed. */
  fixed: RoutineItem | null
  /** Round number -> item, for a slot that swaps between rounds. */
  byRound: Map<number, RoutineItem>
}

/** The items to perform in `round`, in slot order. */
export function itemsForRound(items: RoutineItem[], round: number): RoutineItem[] {
  return items
    .filter((item) => item.round_number === null || item.round_number === round)
    .sort((a, b) => a.order_index - b.order_index)
}

/**
 * The rounds a day offers. `round_count` is the source of truth, widened when
 * an item references a higher round so inconsistent data is never silently
 * dropped from the runner.
 */
export function roundsForDay(day: RoutineDay, items: RoutineItem[]): number[] {
  const highest = items.reduce((max, item) => Math.max(max, item.round_number ?? 1), day.round_count)
  return Array.from({ length: Math.max(1, highest) }, (_, index) => index + 1)
}

/** Group a day's items into slots so an editor can show Fixed vs per-round variants. */
export function slotsForDay(items: RoutineItem[]): Slot[] {
  const slots = new Map<number, Slot>()

  for (const item of items) {
    let slot = slots.get(item.order_index)
    if (!slot) {
      slot = { orderIndex: item.order_index, fixed: null, byRound: new Map() }
      slots.set(item.order_index, slot)
    }
    if (item.round_number === null) slot.fixed = item
    else slot.byRound.set(item.round_number, item)
  }

  return [...slots.values()].sort((a, b) => a.orderIndex - b.orderIndex)
}

/** True when a slot swaps between rounds instead of repeating every round. */
export function isVariantSlot(slot: Slot): boolean {
  return slot.fixed === null && slot.byRound.size > 0
}

/**
 * Problems the routine editor should surface before saving. The database's
 * `unique (routine_day_id, order_index, round_number)` cannot catch the Fixed
 * cases, because Postgres treats NULLs as distinct in unique constraints.
 */
export function validateDayItems(day: RoutineDay, items: RoutineItem[]): string[] {
  const problems: string[] = []

  for (const slot of slotsForDay(items)) {
    if (slot.fixed && slot.byRound.size > 0) {
      problems.push(`Slot ${slot.orderIndex + 1} has a Fixed item alongside round-specific ones.`)
    }
  }

  const fixedCounts = new Map<number, number>()
  for (const item of items) {
    if (item.round_number === null) {
      fixedCounts.set(item.order_index, (fixedCounts.get(item.order_index) ?? 0) + 1)
    } else if (item.round_number > day.round_count) {
      problems.push(
        `Slot ${item.order_index + 1} uses round ${item.round_number}, beyond this day's ${day.round_count} round(s).`,
      )
    }
  }

  for (const [orderIndex, count] of fixedCounts) {
    if (count > 1) {
      problems.push(`Slot ${orderIndex + 1} has ${count} Fixed items; only one is allowed.`)
    }
  }

  return problems
}
