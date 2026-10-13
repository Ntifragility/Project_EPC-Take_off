import { CurveCatalogItem } from '../../../entities/bducto/model/catalog';
import { createSingleUndo } from '../../../shared/lib/singleUndo';
import { createStore } from '../../../shared/lib/store';

export interface CurveCatalogSnap {
  rows: Array<CurveCatalogItem & { lengthText: string; stored: boolean }>;
  removedIds: string[];
}

const history = createSingleUndo<CurveCatalogSnap>();

interface CurveCatalogHistoryState {
  canUndo: boolean;
  canRedo: boolean;
  bind: (read: () => CurveCatalogSnap, write: (snap: CurveCatalogSnap) => void) => void;
  unbind: () => void;
  remember: (current: CurveCatalogSnap) => void;
  undo: () => boolean;
  redo: () => boolean;
  clear: () => void;
}

let readSnap: (() => CurveCatalogSnap) | null = null;
let writeSnap: ((snap: CurveCatalogSnap) => void) | null = null;

const flags = () => ({
  canUndo: Boolean(history.snapshot),
  canRedo: Boolean(history.redoSnapshot)
});

export const useCurveCatalogHistory = createStore<CurveCatalogHistoryState>(set => ({
  canUndo: false,
  canRedo: false,
  bind: (read, write) => {
    readSnap = read;
    writeSnap = write;
  },
  unbind: () => {
    readSnap = null;
    writeSnap = null;
  },
  remember: current => {
    history.remember(current);
    set(flags());
  },
  undo: () => {
    if (!readSnap || !writeSnap) return false;
    const restored = history.undo(readSnap());
    if (!restored) return false;
    writeSnap(restored);
    set(flags());
    return true;
  },
  redo: () => {
    if (!readSnap || !writeSnap) return false;
    const restored = history.redo(readSnap());
    if (!restored) return false;
    writeSnap(restored);
    set(flags());
    return true;
  },
  clear: () => {
    history.clear();
    set(flags());
  }
}));
