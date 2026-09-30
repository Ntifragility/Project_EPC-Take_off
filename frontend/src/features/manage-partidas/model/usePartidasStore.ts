import { createStore } from '../../../shared/lib/store';
import { PartidaRecord } from '../../../entities/partida/model/types';
import { loadStoredPartidas, saveStoredPartidas } from '../../../shared/lib/storage';
import {
  syncPartidasToSupabase,
  updatePartidaInSupabase,
  deletePartidaFromSupabase
} from '../../../shared/api/supabase';
import { uid } from '../../../shared/lib/uid';

export interface PartidasState {
  partidas: PartidaRecord[];
}

export interface PartidasActions {
  loadPartidas: () => void;
  uploadPartidasList: (newPartidas: PartidaRecord[]) => Promise<{ count: number }>;
  setPartidas: (partidas: PartidaRecord[]) => void;
  updatePartida: (id: string, updates: Partial<PartidaRecord>) => Promise<void>;
  deletePartida: (id: string) => Promise<void>;
}

export type PartidasStore = PartidasState & PartidasActions;

function normalizePartida(p: PartidaRecord): PartidaRecord {
  const wbs = String(p.wbs || p.area || '').trim();
  const sicme = String(p.partidaSicme || p.item || '').trim();
  const bm = String(p.descripcionBm || p.descripcion || '').trim();
  return {
    ...p,
    id: p.id || uid(),
    actividad: String(p.actividad || '').trim() || 'PAT',
    wbs,
    area: wbs,
    partidaSicme: sicme,
    item: sicme,
    partidaBalance: String(p.partidaBalance || 'NA').trim() || 'NA',
    forecastDesc: String(p.forecastDesc || '').trim(),
    descripcionBm: bm,
    descripcion: bm,
    und: String(p.und || 'UND').trim() || 'UND'
  };
}

function withIds(list: PartidaRecord[]): PartidaRecord[] {
  let changed = false;
  const next = list.map(p => {
    if (p.id) return p;
    changed = true;
    return { ...p, id: uid() };
  });
  if (changed) saveStoredPartidas(next);
  return next;
}

const initialPartidas = withIds(loadStoredPartidas());

export const usePartidasStore = createStore<PartidasStore>((set, get) => ({
  partidas: initialPartidas,

  loadPartidas: () => {
    const partidas = withIds(loadStoredPartidas());
    set({ partidas });
  },

  uploadPartidasList: async (newPartidas: PartidaRecord[]) => {
    const res = await syncPartidasToSupabase(newPartidas);
    if (!res.success) {
      throw new Error(res.error || 'Error al guardar partidas en Supabase');
    }

    const keyOf = (p: PartidaRecord) =>
      `${(p.wbs || p.area || '').trim().toUpperCase()}|${(p.forecastDesc || '').trim().toUpperCase()}|${(p.partidaSicme || p.item || '').trim().toUpperCase()}`;
    const current = get().partidas;
    const itemMap = new Map<string, PartidaRecord>();
    current.forEach(p => itemMap.set(keyOf(p), p));
    newPartidas.forEach(p => itemMap.set(keyOf(p), normalizePartida(p)));

    const merged = Array.from(itemMap.values()).sort((a, b) =>
      (a.partidaSicme || a.item || '').localeCompare(b.partidaSicme || b.item || '', undefined, { numeric: true })
    );

    saveStoredPartidas(merged);
    set({ partidas: merged });
    return { count: res.count };
  },

  setPartidas: (partidas: PartidaRecord[]) => {
    const next = withIds(partidas);
    saveStoredPartidas(next);
    set({ partidas: next });
  },

  updatePartida: async (id: string, updates: Partial<PartidaRecord>) => {
    const current = get().partidas;
    const existing = current.find(p => p.id === id);
    if (!existing) return;

    const row = normalizePartida({ ...existing, ...updates, id });
    const next = current.map(p => (p.id === id ? row : p));
    saveStoredPartidas(next);
    set({ partidas: next });

    const cloud = await updatePartidaInSupabase(row);
    if (!cloud.success) {
      throw new Error(cloud.error || 'Error al actualizar la partida en Supabase');
    }
  },

  deletePartida: async (id: string) => {
    const next = get().partidas.filter(p => p.id !== id);
    saveStoredPartidas(next);
    set({ partidas: next });

    const cloud = await deletePartidaFromSupabase(id);
    if (!cloud.success) {
      throw new Error(cloud.error || 'Error al eliminar la partida en Supabase');
    }
  }
}));
