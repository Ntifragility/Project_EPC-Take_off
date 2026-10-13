import { createStore } from '../../../shared/lib/store';
import { AddModeType, ToastState } from '../../../shared/types/common';
import { TakeoffRule } from '../../../entities/takeoff-rule/model/types';

export interface UIState {
  addMode: AddModeType;
  searchQuery: string;
  columnFilters: Record<string, string[]>;
  toast: ToastState | null;
  isSyncing: boolean;
  fitTableNonce: number;
  isMergedView: boolean;
  selectedItemIds: string[];
  pendingRule: TakeoffRule | null;
  rulePromptMinimized: boolean;
  ruleRestoreArmed: boolean;
}

export interface UIActions {
  setAddMode: (mode: AddModeType) => void;
  setSearchQuery: (query: string) => void;
  setColumnFilter: (column: string, values: string[] | null) => void;
  clearFilters: () => void;
  showToast: (message: string, type?: 'info' | 'warn' | 'success') => void;
  setIsSyncing: (isSyncing: boolean) => void;
  requestFitTable: () => void;
  setIsMergedView: (merged: boolean) => void;
  setSelectedItemIds: (ids: string[]) => void;
  setPendingRule: (rule: TakeoffRule | null) => void;
  setRulePromptMinimized: (minimized: boolean) => void;
  setRuleRestoreArmed: (armed: boolean) => void;
}

export type UIStore = UIState & UIActions;

export const useUIStore = createStore<UIStore>((set) => ({
  addMode: 'rule',
  searchQuery: '',
  columnFilters: {},
  toast: null,
  isSyncing: false,
  fitTableNonce: 0,
  isMergedView: false,
  selectedItemIds: [],
  pendingRule: null,
  rulePromptMinimized: false,
  ruleRestoreArmed: false,

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
  requestFitTable: () => set(state => ({ fitTableNonce: state.fitTableNonce + 1 })),
  setIsMergedView: (isMergedView: boolean) => set({ isMergedView }),
  setSelectedItemIds: (selectedItemIds: string[]) => set({ selectedItemIds }),
  setPendingRule: (pendingRule: TakeoffRule | null) => set({ pendingRule }),
  setRulePromptMinimized: (rulePromptMinimized: boolean) => set({ rulePromptMinimized }),
  setRuleRestoreArmed: (ruleRestoreArmed: boolean) => set({ ruleRestoreArmed })
}));
