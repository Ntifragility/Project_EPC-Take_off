import { createStore } from '../../../shared/lib/store';
import { BductoPrompt, BductoRow, BductoSource } from '../../../entities/bducto/model/types';
import { SAMPLE_LY028 } from '../../../entities/bducto/model/catalog';
import { uid } from '../../../shared/lib/uid';
import { tramosToAdd, withoutRepeatedUpload } from './importTramos';
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

export interface BductoState {
  sources: BductoSource[];
  rows: BductoRow[];
  undoSnapshot: string | null;
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
  commitTramo: (sourceId: string, prompt: BductoPrompt, rows: BductoRow[]) => void;
  commitManualDraft: (source: BductoSource, prompt: BductoPrompt, rows: BductoRow[]) => void;
  patchRows: (updated: BductoRow[]) => void;
  clearRows: () => void;
  undoLastAction: () => boolean;
}

const initial = loadPersisted();

function remember(get: () => BductoState, set: (partial: Partial<BductoState>) => void, action: string, next: PersistedBductos) {
  const previous = { sources: get().sources, rows: get().rows };
  // #region agent log
  fetch('http://127.0.0.1:7553/ingest/a68ab0cd-10e6-497e-8979-86720b62c569',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b40dbc'},body:JSON.stringify({sessionId:'b40dbc',location:'useBductoStore.ts:remember',message:'bducto undo snapshot',data:{action,sources:previous.sources.length,rows:previous.rows.length,nextSources:next.sources.length,nextRows:next.rows.length},timestamp:Date.now(),hypothesisId:'D',runId:'post-fix'})}).catch(()=>{});
  // #endregion
  persist(next);
  set({ ...next, undoSnapshot: JSON.stringify(previous) });
}

export const useBductoStore = createStore<BductoState>((set, get) => ({
  sources: initial.sources,
  rows: initial.rows,
  undoSnapshot: null,
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
    const created = fresh.map(source => ({ ...source, id: uid() }));
    const sources = [...get().sources, ...created];
    remember(get, set, 'importExcel', { sources, rows: get().rows });
    set({ wizardIds: created.map(source => source.id), wizardIndex: 0, promptMinimized: false, restoreArmed: false });
    return { added: created.length, skipped: incoming.length - created.length };
  },

  setWizard: (sources, index = 0) => set({
    wizardIds: sources.map(source => source.id),
    wizardIndex: sources.length === 0 ? 0 : Math.min(Math.max(index, 0), sources.length - 1),
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
    remember(get, set, 'removeSource', {
      sources: get().sources.filter(source => source.id !== id),
      rows: get().rows.filter(row => row.sourceId !== id)
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

  commitTramo: (sourceId, prompt, rows) => {
    const sources = get().sources.map(source =>
      source.id === sourceId
        ? {
            ...source,
            desde: prompt.desde.trim().toUpperCase(),
            hasta: prompt.hasta.trim().toUpperCase(),
            prompt
          }
        : source
    );
    const nextRows = [...get().rows.filter(row => row.sourceId !== sourceId), ...rows];
    const previous = { sources: get().sources, rows: get().rows };
    persist({ sources, rows: nextRows });
    const nextIndex = get().wizardIndex + 1;
    const done = nextIndex >= get().wizardIds.length;
    // #region agent log
    fetch('http://127.0.0.1:7553/ingest/a68ab0cd-10e6-497e-8979-86720b62c569',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b40dbc'},body:JSON.stringify({sessionId:'b40dbc',location:'useBductoStore.ts:commitTramo',message:'bducto tramo committed',data:{sourceId,wizardIndex:get().wizardIndex,nextIndex,done,rows:nextRows.length},timestamp:Date.now(),hypothesisId:'D',runId:'post-fix'})}).catch(()=>{});
    // #endregion
    set({
      sources,
      rows: nextRows,
      undoSnapshot: JSON.stringify(previous),
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
    const sources = get().sources.map(source => {
      const own = rows.filter(row => row.sourceId === source.id);
      const planos = new Set(own.map(row => row.plano));
      if (own.length > 0 && planos.size === 1 && source.plano !== own[0].plano) {
        return { ...source, plano: own[0].plano };
      }
      return source;
    });
    remember(get, set, 'patchRows', { sources, rows });
  },

  clearRows: () => {
    remember(get, set, 'clearRows', { sources: get().sources, rows: [] });
  },

  undoLastAction: () => {
    const snapshot = get().undoSnapshot;
    if (!snapshot) return false;
    try {
      const restored = JSON.parse(snapshot) as PersistedBductos;
      persist({ sources: restored.sources, rows: restored.rows });
      set({ sources: restored.sources, rows: restored.rows, undoSnapshot: null });
      // #region agent log
      fetch('http://127.0.0.1:7553/ingest/a68ab0cd-10e6-497e-8979-86720b62c569',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b40dbc'},body:JSON.stringify({sessionId:'b40dbc',location:'useBductoStore.ts:undo',message:'bducto undo restored',data:{sources:restored.sources.length,rows:restored.rows.length},timestamp:Date.now(),hypothesisId:'D',runId:'post-fix'})}).catch(()=>{});
      // #endregion
      return true;
    } catch {
      return false;
    }
  }
}));
