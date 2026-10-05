/**
 * Single-slot whole-state undo. The owner snapshots the current whole state
 * with `remember` before mutating; `undo` restores it once and clears the slot.
 */
export interface SingleUndo<T> {
  readonly snapshot: string | null;
  remember: (current: T) => void;
  undo: () => T | null;
}

export function createSingleUndo<T>(): SingleUndo<T> {
  let slot: string | null = null;
  return {
    get snapshot() {
      return slot;
    },
    remember(current: T) {
      slot = JSON.stringify(current);
    },
    undo() {
      if (slot === null) return null;
      try {
        const restored = JSON.parse(slot) as T;
        slot = null;
        return restored;
      } catch {
        return null;
      }
    }
  };
}
