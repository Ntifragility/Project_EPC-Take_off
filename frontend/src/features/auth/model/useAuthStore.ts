import { createStore } from '../../../shared/lib/store';
import { supabase } from '../../../shared/api/supabase';
import { UserProfile, UserRequest, RegisterUserPayload, UserRole } from './authTypes';
import {
  fetchAllUsers,
  fetchUserRequests,
  createRegisteredUser,
  deleteUserProfile,
  updateUserRoleAndArea,
  updateRequestStatus,
  getLocalUsers
} from '../api/authApi';
import { useAppStore } from '../../app-config/model/useAppStore';

const CURRENT_USER_KEY = 'epc_auth_current_user_v1';

export interface AuthState {
  currentUser: UserProfile | null;
  users: UserProfile[];
  requests: UserRequest[];
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  showUserManagement: boolean;
  showRegisterModal: boolean;
  showRequestsModal: boolean;
  showResetModal: boolean;
}

export interface AuthActions {
  initAuth: () => Promise<void>;
  signIn: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  loadUsers: () => Promise<void>;
  loadRequests: () => Promise<void>;
  registerUser: (payload: RegisterUserPayload) => Promise<{ success: boolean; error?: string }>;
  removeUser: (userId: string, email: string) => Promise<boolean>;
  updateRoleAndArea: (userId: string, email: string, role: UserRole, area: string) => Promise<boolean>;
  approveUserRequest: (request: UserRequest) => Promise<boolean>;
  rejectUserRequest: (requestId: string) => Promise<boolean>;
  setShowUserManagement: (show: boolean) => void;
  setShowRegisterModal: (show: boolean) => void;
  setShowRequestsModal: (show: boolean) => void;
  setShowResetModal: (show: boolean) => void;
  clearError: () => void;
}

export type AuthStore = AuthState & AuthActions;

function loadStoredCurrentUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const useAuthStore = createStore<AuthStore>((set, get) => ({
  currentUser: loadStoredCurrentUser(),
  users: getLocalUsers(),
  requests: [],
  isLoading: false,
  isInitialized: false,
  error: null,
  showUserManagement: false,
  showRegisterModal: false,
  showRequestsModal: false,
  showResetModal: false,

  initAuth: async () => {
    set({ isLoading: true });
    try {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          const allUsers = await fetchAllUsers();
          const found = allUsers.find(u => u.email.toLowerCase() === session.user.email?.toLowerCase());
          if (found) {
            set({ currentUser: found });
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(found));
          }
        }
      }
      const [users, requests] = await Promise.all([fetchAllUsers(), fetchUserRequests()]);
      set({ users, requests, isInitialized: true, isLoading: false });
    } catch {
      set({ isInitialized: true, isLoading: false });
    }
  },

  signIn: async (email: string, password?: string) => {
    set({ isLoading: true, error: null });
    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. Try Supabase Auth first if available
      if (supabase && password) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password
          });
          if (!error && data.user) {
            const allUsers = await fetchAllUsers();
            let profile = allUsers.find(u => u.email.toLowerCase() === cleanEmail);
            if (!profile) {
              // Create default profile for this authenticated user
              profile = {
                id: data.user.id,
                email: cleanEmail,
                role: 'Operario',
                area: 'Área Húmeda',
                status: 'active',
                createdAt: new Date().toISOString()
              };
            }
            set({ currentUser: profile, isLoading: false });
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(profile));

            // Sync area if user is bound to an area
            if (profile.area && profile.area !== 'Todas las áreas') {
              const areaType = profile.area.toUpperCase().includes('HUMEDA') ? 'AREA HUMEDA' : 'AREA SECA';
              useAppStore.getState().setActiveArea(areaType as any);
            }
            return { success: true };
          }
        } catch {
          // If supabase fails, continue to check seeded/local users for reliable fallback
        }
      }

      // 2. Check local/seeded users list
      const allUsers = await fetchAllUsers();
      const profile = allUsers.find(u => u.email.toLowerCase() === cleanEmail);

      if (!profile) {
        set({
          isLoading: false,
          error: 'Usuario no encontrado. Verifique el correo o solicite una cuenta.'
        });
        return {
          success: false,
          error: 'Usuario no encontrado. Verifique el correo o solicite una cuenta.'
        };
      }

      // Check if user is active
      if (profile.status === 'inactive') {
        set({
          isLoading: false,
          error: 'Su cuenta está inactiva. Contacte al Administrador.'
        });
        return {
          success: false,
          error: 'Su cuenta está inactiva. Contacte al Administrador.'
        };
      }

      const shouldShowManagement = profile.role === 'Admin';
      set({ currentUser: profile, showUserManagement: shouldShowManagement, isLoading: false });
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(profile));

      // Sync area if user is bound to an area
      if (profile.area && profile.area !== 'Todas las áreas') {
        const areaType = profile.area.toUpperCase().includes('HUMEDA') ? 'AREA HUMEDA' : 'AREA SECA';
        useAppStore.getState().setActiveArea(areaType as any);
      }

      return { success: true };
    } catch (err: any) {
      const msg = err?.message || 'Error al iniciar sesión.';
      set({ isLoading: false, error: msg });
      return { success: false, error: msg };
    }
  },

  signOut: async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
    }
    localStorage.removeItem(CURRENT_USER_KEY);
    set({
      currentUser: null,
      showUserManagement: false,
      showRegisterModal: false,
      showRequestsModal: false,
      showResetModal: false
    });
  },

  loadUsers: async () => {
    const users = await fetchAllUsers();
    set({ users });
  },

  loadRequests: async () => {
    const requests = await fetchUserRequests();
    set({ requests });
  },

  registerUser: async (payload: RegisterUserPayload) => {
    set({ isLoading: true, error: null });
    const res = await createRegisteredUser(payload);
    if (!res.success) {
      set({ isLoading: false, error: res.error || 'Error al registrar usuario.' });
      return { success: false, error: res.error };
    }
    const users = await fetchAllUsers();
    set({ users, isLoading: false, showRegisterModal: false });
    return { success: true };
  },

  removeUser: async (userId: string, email: string) => {
    const ok = await deleteUserProfile(userId, email);
    if (ok) {
      const users = await fetchAllUsers();
      set({ users });
    }
    return ok;
  },

  updateRoleAndArea: async (userId: string, email: string, role: UserRole, area: string) => {
    const ok = await updateUserRoleAndArea(userId, email, role, area);
    if (ok) {
      const users = await fetchAllUsers();
      set({ users });
      // If current user updated, update session too
      const current = get().currentUser;
      if (current && (current.id === userId || current.email === email)) {
        const updated = { ...current, role, area };
        set({ currentUser: updated });
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updated));
      }
    }
    return ok;
  },

  approveUserRequest: async (req: UserRequest) => {
    await createRegisteredUser({
      email: req.email,
      role: req.roleRequested,
      area: req.area,
      adminName: req.fullName,
      dni: req.dni
    });
    await updateRequestStatus(req.id, 'approved');
    const [users, requests] = await Promise.all([fetchAllUsers(), fetchUserRequests()]);
    set({ users, requests });
    return true;
  },

  rejectUserRequest: async (requestId: string) => {
    await updateRequestStatus(requestId, 'rejected');
    const requests = await fetchUserRequests();
    set({ requests });
    return true;
  },

  setShowUserManagement: (show: boolean) => set({ showUserManagement: show }),
  setShowRegisterModal: (show: boolean) => set({ showRegisterModal: show }),
  setShowRequestsModal: (show: boolean) => set({ showRequestsModal: show }),
  setShowResetModal: (show: boolean) => set({ showResetModal: show }),
  clearError: () => set({ error: null })
}));
