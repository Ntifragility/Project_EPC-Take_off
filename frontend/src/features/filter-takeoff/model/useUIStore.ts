import { createStore } from '../../../shared/lib/store';
import { AddModeType, ToastState } from '../../../shared/types/common';

export interface UIState {
  addMode: AddModeType;
  searchQuery: string;
  columnFilters: Record<string, string[]>;
  toast: ToastState | null;
  isSyncing: boolean;
  isPartidasModalOpen: boolean;
  fitTableNonce: number;
  isMergedView: boolean;
}

export interface UIActions {
  setAddMode: (mode: AddModeType) => void;
  setSearchQuery: (query: string) => void;
  setColumnFilter: (column: string, values: string[] | null) => void;
  clearFilters: () => void;
  showToast: (message: string, type?: 'info' | 'warn' | 'success') => void;
  setIsSyncing: (isSyncing: boolean) => void;
  setIsPartidasModalOpen: (open: boolean) => void;
  requestFitTable: () => void;
  setIsMergedView: (merged: boolean) => void;
}

export type UIStore = UIState & UIActions;

export const useUIStore = createStore<UIStore>((set) => ({
  addMode: 'rule',
  searchQuery: '',
  columnFilters: {},
  toast: null,
  isSyncing: false,
  isPartidasModalOpen: false,
  fitTableNonce: 0,
  isMergedView: false,

  setAddMode: (addMode: AddModeType) => set({ addMode }),
  setSearchQuery: (searchQuery: string) => set({ searchQuery }),
  setColumnFilter: (column: string, values: string[] | null) =>
    set(state => {
      const columnFilters = { ...state.columnFilters };
      if (values == null) delete columnFilters[column];
      else columnFilters[column] = values;
      return { columnFilters };
    }),
  clearFilters: () => set({ searchQuery: '', columnFilters: {} }),
  showToast: (message: string, type: 'info' | 'warn' | 'success' = 'info') => {
    set({ toast: { message, type } });
  },
  setIsSyncing: (isSyncing: boolean) => set({ isSyncing }),
  setIsPartidasModalOpen: (isPartidasModalOpen: boolean) => set({ isPartidasModalOpen }),
  requestFitTable: () => set(state => ({ fitTableNonce: state.fitTableNonce + 1 })),
  setIsMergedView: (isMergedView: boolean) => set({ isMergedView })
}));
