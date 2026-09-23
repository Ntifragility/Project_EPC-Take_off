import { createStore } from '../../../shared/lib/store';
import { PartidaRecord } from '../../../entities/partida/model/types';
import { loadStoredPartidas, saveStoredPartidas } from '../../../shared/lib/storage';
import { syncPartidasToSupabase } from '../../../shared/api/supabase';

export interface PartidasState {
  partidas: PartidaRecord[];
}

export interface PartidasActions {
  loadPartidas: () => void;
  uploadPartidasList: (newPartidas: PartidaRecord[]) => Promise<{ count: number }>;
  setPartidas: (partidas: PartidaRecord[]) => void;
}

export type PartidasStore = PartidasState & PartidasActions;

const initialPartidas = loadStoredPartidas();

export const usePartidasStore = createStore<PartidasStore>((set, get) => ({
  partidas: initialPartidas,

  loadPartidas: () => {
    const partidas = loadStoredPartidas();
    set({ partidas });
  },

  uploadPartidasList: async (newPartidas: PartidaRecord[]) => {
    const res = await syncPartidasToSupabase(newPartidas);
    if (!res.success) {
      throw new Error(res.error || 'Error al guardar partidas en Supabase');
    }

    const current = get().partidas;
    const itemMap = new Map<string, PartidaRecord>();
    current.forEach(p => itemMap.set(p.item, p));
    newPartidas.forEach(p => itemMap.set(p.item, p));

    const merged = Array.from(itemMap.values()).sort((a, b) =>
      a.item.localeCompare(b.item, undefined, { numeric: true })
    );

    saveStoredPartidas(merged);
    set({ partidas: merged });
    return { count: res.count };
  },

  setPartidas: (partidas: PartidaRecord[]) => {
    saveStoredPartidas(partidas);
    set({ partidas });
  }
}));
