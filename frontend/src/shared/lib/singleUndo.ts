/**
 * One undo stack and one redo stack of whole-state snapshots.
 * `remember` stores the state from before a change and drops redo.
 * `undo` / `redo` swap the current state with the matching stack.
 */
export interface SingleUndo<T> {
  readonly snapshot: string | null;
  readonly redoSnapshot: string | null;
  remember: (current: T) => void;
  undo: (current: T) => T | null;
  redo: (current: T) => T | null;
  clear: () => void;
}

const HISTORY_LIMIT = 50;

export function createSingleUndo<T>(): SingleUndo<T> {
  const past: string[] = [];
  const future: string[] = [];

  const parse = (raw: string): T | null => {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  };

  return {
    get snapshot() {
      return past.length > 0 ? past[past.length - 1] : null;
    },
    get redoSnapshot() {
      return future.length > 0 ? future[future.length - 1] : null;
    },
    remember(current: T) {
      past.push(JSON.stringify(current));
      if (past.length > HISTORY_LIMIT) past.shift();
      future.length = 0;
    },
    undo(current: T) {
      const raw = past.pop();
      if (raw === undefined) return null;
      future.push(JSON.stringify(current));
      return parse(raw);
    },
    redo(current: T) {
      const raw = future.pop();
      if (raw === undefined) return null;
      past.push(JSON.stringify(current));
      return parse(raw);
    },
    clear() {
      past.length = 0;
      future.length = 0;
    }
  };
}
