import { createStore } from '../../../shared/lib/store';
import { AddModeType, ToastState } from '../../../shared/types/common';

export interface UIState {
  addMode: AddModeType;
  searchQuery: string;
  filterPlano: string;
  filterDetalle: string;
  toast: ToastState | null;
  isSyncing: boolean;
  isPartidasModalOpen: boolean;
}

export interface UIActions {
  setAddMode: (mode: AddModeType) => void;
  setSearchQuery: (query: string) => void;
  setFilterPlano: (plano: string) => void;
  setFilterDetalle: (detalle: string) => void;
  clearFilters: () => void;
  showToast: (message: string, type?: 'info' | 'warn' | 'success') => void;
  setIsSyncing: (isSyncing: boolean) => void;
  setIsPartidasModalOpen: (open: boolean) => void;
}

export type UIStore = UIState & UIActions;

export const useUIStore = createStore<UIStore>((set) => ({
  addMode: 'rule',
  searchQuery: '',
  filterPlano: '',
  filterDetalle: '',
  toast: null,
  isSyncing: false,
  isPartidasModalOpen: false,

  setAddMode: (addMode: AddModeType) => set({ addMode }),
  setSearchQuery: (searchQuery: string) => set({ searchQuery }),
  setFilterPlano: (filterPlano: string) => set({ filterPlano }),
  setFilterDetalle: (filterDetalle: string) => set({ filterDetalle }),
  clearFilters: () => set({ searchQuery: '', filterPlano: '', filterDetalle: '' }),
  showToast: (message: string, type: 'info' | 'warn' | 'success' = 'info') => {
    set({ toast: { message, type } });
  },
  setIsSyncing: (isSyncing: boolean) => set({ isSyncing }),
  setIsPartidasModalOpen: (isPartidasModalOpen: boolean) => set({ isPartidasModalOpen })
}));
