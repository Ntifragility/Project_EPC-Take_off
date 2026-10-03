import { createStore } from '../../../shared/lib/store';
import { BductoRow, BductoSource } from '../../../entities/bducto/model/types';
import { SAMPLE_LY028 } from '../../../entities/bducto/model/catalog';
import { uid } from '../../../shared/lib/uid';

const STORAGE_KEY = 'epc-bductos-v1';

interface PersistedBductos {
  sources: BductoSource[];
  rows: BductoRow[];
}

function loadPersisted(): PersistedBductos {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sources: [], rows: [] };
    const parsed = JSON.parse(raw) as PersistedBductos;
    return {
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
      rows: Array.isArray(parsed.rows) ? parsed.rows : []
    };
  } catch {
    return { sources: [], rows: [] };
  }
}

function persist(state: PersistedBductos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export interface BductoState {
  sources: BductoSource[];
  rows: BductoRow[];
  addSources: (sources: Array<Omit<BductoSource, 'id'>>) => void;
  loadSample: () => void;
  removeSource: (id: string) => void;
  clearSources: () => void;
  replaceRowsForSource: (sourceId: string, rows: BductoRow[]) => void;
  clearRows: () => void;
}

const initial = loadPersisted();

export const useBductoStore = createStore<BductoState>((set, get) => ({
  sources: initial.sources,
  rows: initial.rows,

  addSources: (incoming) => {
    const sources = [
      ...get().sources,
      ...incoming.map(source => ({ ...source, id: uid() }))
    ];
    const next = { sources, rows: get().rows };
    persist(next);
    set(next);
  },

  loadSample: () => {
    const sources = SAMPLE_LY028.map(source => ({ ...source, id: uid() }));
    const next = { sources, rows: [] };
    persist(next);
    set(next);
  },

  removeSource: (id) => {
    const next = {
      sources: get().sources.filter(source => source.id !== id),
      rows: get().rows.filter(row => row.sourceId !== id)
    };
    persist(next);
    set(next);
  },

  clearSources: () => {
    const next = { sources: [], rows: [] };
    persist(next);
    set(next);
  },

  replaceRowsForSource: (sourceId, rows) => {
    const nextRows = [...get().rows.filter(row => row.sourceId !== sourceId), ...rows];
    const next = { sources: get().sources, rows: nextRows };
    persist(next);
    set(next);
  },

  clearRows: () => {
    const next = { sources: get().sources, rows: [] };
    persist(next);
    set(next);
  }
}));
