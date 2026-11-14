import { createStore } from '../../../shared/lib/store';
import { ExcelTemplateRecord, TemplateKey } from './templateTypes';
import {
  fetchExcelTemplatesFromSupabase,
  saveExcelTemplateToSupabase,
  deleteExcelTemplateFromSupabase
} from '../../../shared/api/supabase';

export interface TemplatesState {
  templates: Record<TemplateKey, ExcelTemplateRecord | null>;
  isLoading: boolean;
  showModal: boolean;
}

export interface TemplatesActions {
  loadTemplates: () => Promise<void>;
  uploadTemplate: (key: TemplateKey, file: File, adminName: string) => Promise<{ success: boolean; error?: string }>;
  restoreDefault: (key: TemplateKey) => Promise<{ success: boolean; error?: string }>;
  downloadTemplate: (key: TemplateKey, fallback: () => Promise<void> | void) => Promise<void>;
  setShowModal: (show: boolean) => void;
}

export type TemplatesStore = TemplatesState & TemplatesActions;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      // Extract base64 part after comma
      const base64 = res.includes(',') ? res.split(',')[1] : res;
      resolve(base64);
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

function downloadBase64Xlsx(base64Data: string, fileName: string): void {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const useTemplatesStore = createStore<TemplatesStore>((set, get) => ({
  templates: {
    metrado_pat: null,
    partidas_master: null,
    bductos: null
  },
  isLoading: false,
  showModal: false,

  setShowModal: (show: boolean) => set({ showModal: show }),

  loadTemplates: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await fetchExcelTemplatesFromSupabase();
      if (!error && data) {
        const map: Record<TemplateKey, ExcelTemplateRecord | null> = {
          metrado_pat: null,
          partidas_master: null,
          bductos: null
        };
        data.forEach(rec => {
          if (rec.id in map) {
            map[rec.id as TemplateKey] = rec;
          }
        });
        set({ templates: map });
      }
    } catch (e) {
      console.warn('Failed to fetch templates from Supabase:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  uploadTemplate: async (key: TemplateKey, file: File, adminName: string) => {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      return { success: false, error: 'El archivo debe ser en formato Excel (.xlsx).' };
    }
    set({ isLoading: true });
    try {
      const base64Data = await fileToBase64(file);
      const record: ExcelTemplateRecord = {
        id: key,
        name: file.name,
        file_name: file.name,
        file_data: base64Data,
        file_size: file.size,
        updated_by: adminName || 'Administrador',
        updated_at: new Date().toISOString()
      };

      const res = await saveExcelTemplateToSupabase(record);
      if (!res.success) {
        return { success: false, error: res.error || 'Error al guardar en Supabase' };
      }

      set(state => ({
        templates: {
          ...state.templates,
          [key]: record
        }
      }));
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al procesar el archivo';
      return { success: false, error: msg };
    } finally {
      set({ isLoading: false });
    }
  },

  restoreDefault: async (key: TemplateKey) => {
    set({ isLoading: true });
    try {
      const res = await deleteExcelTemplateFromSupabase(key);
      if (!res.success) {
        return { success: false, error: res.error || 'Error al eliminar en Supabase' };
      }

      set(state => ({
        templates: {
          ...state.templates,
          [key]: null
        }
      }));
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al restaurar';
      return { success: false, error: msg };
    } finally {
      set({ isLoading: false });
    }
  },

  downloadTemplate: async (key: TemplateKey, fallback: () => Promise<void> | void) => {
    const current = get().templates[key];
    if (current && current.file_data) {
      downloadBase64Xlsx(current.file_data, current.file_name);
      return;
    }
    await fallback();
  }
}));
