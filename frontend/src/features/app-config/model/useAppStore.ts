import { createStore } from '../../../shared/lib/store';
import { SectionType, TabType, ThemeType, AreaType } from '../../../shared/types/common';
import { AccessoryViewMode } from '../../../entities/takeoff-item/model/types';
import { STORAGE_KEYS, DEFAULT_SECTION, DEFAULT_AREA, DEFAULT_THEME } from '../../../shared/config/constants';
import { useRulesStore } from '../../manage-rules/model/useRulesStore';
import { useItemsStore } from '../../manage-items/model/useItemsStore';
import { usePackagesStore } from '../../manage-packages/model/usePackagesStore';

export interface AppState {
  section: SectionType;
  tab: TabType;
  theme: ThemeType;
  activeArea: AreaType;
  accessoryViewMode: AccessoryViewMode;
}

export interface AppActions {
  setSection: (section: SectionType) => void;
  setTab: (tab: TabType) => void;
  toggleTheme: () => void;
  setActiveArea: (area: AreaType) => void;
  setAccessoryViewMode: (mode: AccessoryViewMode) => void;
  toggleAccessoryViewMode: () => void;
}

export type AppStore = AppState & AppActions;

const initialSection = (localStorage.getItem(STORAGE_KEYS.ACTIVE_SECTION) as SectionType) || DEFAULT_SECTION;
const initialTheme = (localStorage.getItem(STORAGE_KEYS.THEME) as ThemeType) || DEFAULT_THEME;
const initialArea = (localStorage.getItem(STORAGE_KEYS.ACTIVE_AREA) as AreaType) || DEFAULT_AREA;
const initialAccessoryMode = (localStorage.getItem(STORAGE_KEYS.ACCESSORY_VIEW_MODE) as AccessoryViewMode) || 'separated';

// Apply initial theme to document body
if (typeof document !== 'undefined') {
  if (initialTheme === 'light') {
    document.body.classList.add('light-mode', 'light-theme');
  } else {
    document.body.classList.remove('light-mode', 'light-theme');
  }
}

export const useAppStore = createStore<AppStore>((set, get) => ({
  section: initialSection,
  tab: 'takeoff',
  theme: initialTheme,
  activeArea: initialArea,
  accessoryViewMode: initialAccessoryMode,

  setSection: (section: SectionType) => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SECTION, section);
    useRulesStore.getState().loadRules(section);
    useItemsStore.getState().loadItems(section, get().activeArea);
    usePackagesStore.getState().loadPackages(section);
    set({ section });
  },

  setTab: (tab: TabType) => set({ tab }),

  toggleTheme: () => {
    const nextTheme: ThemeType = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEYS.THEME, nextTheme);
    if (typeof document !== 'undefined') {
      if (nextTheme === 'light') {
        document.body.classList.add('light-mode', 'light-theme');
      } else {
        document.body.classList.remove('light-mode', 'light-theme');
      }
    }
    set({ theme: nextTheme });
  },

  setActiveArea: (area: AreaType) => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_AREA, area);
    set({ activeArea: area });
  },

  setAccessoryViewMode: (mode: AccessoryViewMode) => {
    localStorage.setItem(STORAGE_KEYS.ACCESSORY_VIEW_MODE, mode);
    set({ accessoryViewMode: mode });
  },

  toggleAccessoryViewMode: () => {
    const nextMode = get().accessoryViewMode === 'separated' ? 'join' : 'separated';
    localStorage.setItem(STORAGE_KEYS.ACCESSORY_VIEW_MODE, nextMode);
    set({ accessoryViewMode: nextMode });
  }
}));
