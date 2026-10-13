import { createStore } from '../../../shared/lib/store';
import { createSingleUndo } from '../../../shared/lib/singleUndo';
import { BductoPrompt, BductoRow, BductoSource } from '../../../entities/bducto/model/types';
import { SAMPLE_LY028 } from '../../../entities/bducto/model/catalog';
import { uid } from '../../../shared/lib/uid';
import { tramosToAdd, withoutRepeatedUpload } from './importTramos';
import { findIntroducedTramoCollision } from '../../../entities/takeoff-item/model/itemIdentity';
import { BductoAccessoryView, BductoDetailView } from './bductoView';

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
    const rows = Array.isArray(parsed.rows) ? parsed.rows : [];
    const loaded = Array.isArray(parsed.sources) ? parsed.sources : [];
    const sources = withoutRepeatedUpload(loaded, new Set(rows.map(row => row.sourceId)));
    if (sources.length !== loaded.length) {
      persist({ sources, rows });
    }
    return { sources, rows };
  } catch {
    return { sources: [], rows: [] };
  }
}

function persist(state: PersistedBductos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const bductoUndo = createSingleUndo<PersistedBductos>();

export interface BductoState {
  sources: BductoSource[];
  rows: BductoRow[];
  undoSnapshot: string | null;
  redoSnapshot: string | null;
  /** Tramo ids in the open prompt, in order. Not saved. */
  wizardIds: string[];
  wizardIndex: number;
  /** Manual tramo being typed straight into the prompt window. Never persisted. */
  manualDraft: BductoSource | null;
  startManualDraft: () => void;
  patchManualDraft: (patch: Partial<BductoSource>) => void;
  clearManualDraft: () => void;
  /** How measured rows of a tramo are shown. Not saved. */
  detailView: BductoDetailView;
  /** How terminal, unión, adaptador and cinta are shown. Not saved. */
  accessoryView: BductoAccessoryView;
  setDetailView: (value: BductoDetailView) => void;
  setAccessoryView: (value: BductoAccessoryView) => void;
  /** Prompt is tucked away so the metrado table stays visible. Not saved. */
  promptMinimized: boolean;
  /** Landing icon is mounted while the window is still shrinking into it. */
  restoreArmed: boolean;
  setPromptMinimized: (value: boolean) => void;
  armRestore: () => void;
  addSources: (sources: Array<Omit<BductoSource, 'id'>>) => void;
  importExcel: (sources: Array<Omit<BductoSource, 'id'>>) => { added: number; skipped: number };
  setWizard: (sources: BductoSource[], index?: number) => void;
  moveWizard: (index: number) => void;
  loadSample: () => void;
  removeSource: (id: string) => void;
  clearSources: () => void;
  commitTramo: (sourceId: string, prompt: BductoPrompt, rows: BductoRow[], tagEnPlano?: string) => void;
  commitManualDraft: (source: BductoSource, prompt: BductoPrompt, rows: BductoRow[]) => void;
  patchRows: (updated: BductoRow[]) => void;
  clearRows: () => void;
  undoLastAction: () => boolean;
  redoLastAction: () => boolean;
}

const initial = loadPersisted();

function historyFlags() {
  return { undoSnapshot: bductoUndo.snapshot, redoSnapshot: bductoUndo.redoSnapshot };
}

function syncSources(sources: BductoSource[], rows: BductoRow[]): BductoSource[] {
  return sources.map(source => {
    const own = rows.filter(row => row.sourceId === source.id);
    if (own.length === 0) return source;
    let next = source;
    const plano = own[0].plano;
    if (own.every(row => row.plano === plano) && source.plano !== plano) {
      next = { ...next, plano };
    }
    const desde = own[0].desde;
    if (own.every(row => row.desde === desde) && (source.desde || '') !== desde) {
      next = { ...next, desde, prompt: next.prompt ? { ...next.prompt, desde } : next.prompt };
    }
    const hasta = own[0].hasta;
    if (own.every(row => row.hasta === hasta) && (source.hasta || '') !== hasta) {
      next = { ...next, hasta, prompt: next.prompt ? { ...next.prompt, hasta } : next.prompt };
    }
    const seccion = own[0].seccion;
    if (own.every(row => row.seccion === seccion) && next.seccion !== seccion) {
      next = { ...next, seccion };
    }
    return next;
  });
}

function remember(get: () => BductoState, set: (partial: Partial<BductoState>) => void, action: string, next: PersistedBductos) {
  void action;
  bductoUndo.remember({ sources: get().sources, rows: get().rows });
  persist(next);
  set({ ...next, ...historyFlags() });
}

export const useBductoStore = createStore<BductoState>((set, get) => ({
  sources: initial.sources,
  rows: initial.rows,
  undoSnapshot: null,
  redoSnapshot: null,
  wizardIds: [],
  wizardIndex: 0,
  manualDraft: null,
  startManualDraft: () => set({
    // Only the tag comes typed (template example) so its curvas show at once;
    // the user types plano and longitud, which the tramo requires.
    manualDraft: {
      id: uid(),
      plano: '',
      tagEnPlano: '1 VIA, 3", BD.C.1',
      quantity: 0,
      desde: '',
      hasta: ''
    },
    promptMinimized: false,
    restoreArmed: false
  }),
  patchManualDraft: (patch) => {
    const draft = get().manualDraft;
    if (!draft) return;
    set({ manualDraft: { ...draft, ...patch } });
  },
  clearManualDraft: () => {
    if (get().manualDraft) set({ manualDraft: null });
  },
  promptMinimized: false,
  restoreArmed: false,
  detailView: 'separated',
  accessoryView: 'separated',
  setDetailView: (value) => set({ detailView: value }),
  setAccessoryView: (value) => set({ accessoryView: value }),
  setPromptMinimized: (value) => set({ promptMinimized: value, restoreArmed: false }),
  armRestore: () => set({ restoreArmed: true }),

  addSources: (incoming) => {
    const sources = [
      ...get().sources,
      ...incoming.map(source => ({ ...source, id: uid() }))
    ];
    remember(get, set, 'addSources', { sources, rows: get().rows });
  },

  importExcel: (incoming) => {
    const fresh = tramosToAdd(get().sources, incoming);
    if (fresh.length === 0) return { added: 0, skipped: incoming.length };
    const base = [...get().sources];
    const accepted: typeof fresh = [];
    for (const candidate of fresh) {
      const collision = findIntroducedTramoCollision([...base, ...accepted], [...base, ...accepted, candidate]);
      if (collision) continue;
      accepted.push(candidate);
    }
    if (accepted.length === 0) return { added: 0, skipped: incoming.length };
    const created = accepted.map(source => ({ ...source, id: uid() }));
    const sources = [...get().sources, ...created];
    remember(get, set, 'importExcel', { sources, rows: get().rows });
    set({ wizardIds: created.map(source => source.id), wizardIndex: 0, promptMinimized: false, restoreArmed: false });
    return { added: created.length, skipped: incoming.length - created.length };
  },

  setWizard: (sources, index = 0) => set({
    wizardIds: sources.map(source => source.id),
    wizardIndex: sources.length === 0 ? 0 : Math.min(Math.max(index, 0), sources.length - 1),
    manualDraft: null,
    promptMinimized: false,
    restoreArmed: false
  }),

  moveWizard: (index) => {
    const last = get().wizardIds.length - 1;
    if (last < 0) return;
    set({ wizardIndex: Math.min(Math.max(index, 0), last) });
  },

  loadSample: () => {
    const sources = SAMPLE_LY028.map(source => ({ ...source, id: uid() }));
    remember(get, set, 'loadSample', { sources, rows: [] });
  },

  removeSource: (id) => {
    const wizardIds = get().wizardIds.filter(sourceId => sourceId !== id);
    remember(get, set, 'removeSource', {
      sources: get().sources.filter(source => source.id !== id),
      rows: get().rows.filter(row => row.sourceId !== id)
    });
    set({
      wizardIds,
      wizardIndex: wizardIds.length === 0 ? 0 : Math.min(get().wizardIndex, wizardIds.length - 1)
    });
  },

  clearSources: () => {
    remember(get, set, 'clearSources', { sources: [], rows: [] });
    set({
      wizardIds: [],
      wizardIndex: 0,
      promptMinimized: false,
      restoreArmed: false,
      detailView: 'separated',
      accessoryView: 'separated'
    });
  },

  commitTramo: (sourceId, prompt, rows, tagEnPlano) => {
    const previous = get().rows.filter(row => row.sourceId === sourceId);
    const sharedRev = previous.length > 0 && previous.every(row => row.rev === previous[0].rev) ? previous[0].rev : '';
    const stamped = sharedRev ? rows.map(row => ({ ...row, rev: sharedRev })) : rows;
    const sources = get().sources.map(source =>
      source.id === sourceId
        ? {
            ...source,
            desde: prompt.desde.trim().toUpperCase(),
            hasta: prompt.hasta.trim().toUpperCase(),
            tagEnPlano: tagEnPlano?.trim().toUpperCase().replace(/\s+/g, ' ') || source.tagEnPlano,
            prompt
          }
        : source
    );
    const nextRows = [...get().rows.filter(row => row.sourceId !== sourceId), ...stamped];
    bductoUndo.remember({ sources: get().sources, rows: get().rows });
    persist({ sources, rows: nextRows });
    const nextIndex = get().wizardIndex + 1;
    const done = nextIndex >= get().wizardIds.length;
    set({
      sources,
      rows: nextRows,
      ...historyFlags(),
      wizardIds: done ? [] : get().wizardIds,
      wizardIndex: done ? 0 : nextIndex,
      promptMinimized: done ? false : get().promptMinimized,
      restoreArmed: done ? false : get().restoreArmed
    });
  },

  commitManualDraft: (source, prompt, rows) => {
    const created: BductoSource = {
      ...source,
      desde: prompt.desde.trim().toUpperCase(),
      hasta: prompt.hasta.trim().toUpperCase(),
      prompt
    };
    const sources = [...get().sources, created];
    const nextRows = [...get().rows, ...rows];
    remember(get, set, 'commitManualDraft', { sources, rows: nextRows });
    set({ manualDraft: null, promptMinimized: false, restoreArmed: false });
  },

  patchRows: (updated) => {
    if (updated.length === 0) return;
    const byId = new Map(updated.map(row => [row.id, row]));
    const rows = get().rows.map(row => byId.get(row.id) ?? row);
    const sources = syncSources(get().sources, rows);
    remember(get, set, 'patchRows', { sources, rows });
  },

  clearRows: () => {
    remember(get, set, 'clearRows', { sources: get().sources, rows: [] });
  },

  undoLastAction: () => {
    if (!bductoUndo.snapshot) return false;
    const current = { sources: get().sources, rows: get().rows };
    const restored = bductoUndo.undo(current);
    if (!restored) return false;
    persist(restored);
    set({ sources: restored.sources, rows: restored.rows, ...historyFlags() });
    return true;
  },

  redoLastAction: () => {
    if (!bductoUndo.redoSnapshot) return false;
    const current = { sources: get().sources, rows: get().rows };
    const restored = bductoUndo.redo(current);
    if (!restored) return false;
    persist(restored);
    set({ sources: restored.sources, rows: restored.rows, ...historyFlags() });
    return true;
  }
}));
