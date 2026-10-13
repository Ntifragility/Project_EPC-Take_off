import { supabase } from '../../../shared/api/supabase';
import { UserProfile, UserRequest, RegisterUserPayload } from '../model/authTypes';

const STORAGE_USERS_KEY = 'epc_registered_users_v1';
const STORAGE_REQUESTS_KEY = 'epc_user_requests_v1';

// Seed accounts matching the user's exact specification
export const SEED_USERS: UserProfile[] = [
  {
    id: 'user-operario-01',
    email: 'co.villaf@gmail.com',
    role: 'Operario',
    area: 'Área Húmeda',
    adminName: null,
    dni: null,
    status: 'active',
    createdAt: '2026-08-01T00:00:00Z'
  },
  {
    id: 'user-admin-01',
    email: 'mvillafuerte@ccp.pe',
    role: 'Admin',
    area: 'Todas las áreas',
    adminName: 'Administrador Principal 1',
    dni: '48204199',
    status: 'active',
    createdAt: '2026-06-11T00:00:00Z'
  }
];

export function getLocalUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(SEED_USERS));
      return SEED_USERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_USERS;
  } catch {
    return SEED_USERS;
  }
}

export function saveLocalUsers(users: UserProfile[]): void {
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Error saving local users:', err);
  }
}

export function getLocalRequests(): UserRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_REQUESTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalRequests(reqs: UserRequest[]): void {
  try {
    localStorage.setItem(STORAGE_REQUESTS_KEY, JSON.stringify(reqs));
  } catch (err) {
    console.error('Error saving local requests:', err);
  }
}

// Map db record to UserProfile
function mapRecordToProfile(record: any): UserProfile {
  return {
    id: record.id || record.user_id || record.email,
    userId: record.user_id,
    email: record.email,
    role: (record.role as any) || 'Operario',
    area: record.area || 'Todas las áreas',
    adminName: record.admin_name || null,
    dni: record.dni || null,
    status: record.status || 'active',
    createdAt: record.created_at || new Date().toISOString(),
    updatedAt: record.updated_at
  };
}

export async function fetchAllUsers(): Promise<UserProfile[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const profiles = data.map(mapRecordToProfile);
        saveLocalUsers(profiles);
        return profiles;
      }
    } catch {
      // fallback to local storage
    }
  }
  return getLocalUsers();
}

export async function fetchUserRequests(): Promise<UserRequest[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('user_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const reqs = data.map((d: any) => ({
          id: d.id,
          email: d.email,
          fullName: d.full_name,
          dni: d.dni,
          area: d.area || 'Todas las áreas',
          roleRequested: d.role_requested || 'Operario',
          status: d.status || 'pending',
          notes: d.notes,
          createdAt: d.created_at || new Date().toISOString()
        }));
        saveLocalRequests(reqs);
        return reqs;
      }
    } catch {
      // fallback to local
    }
  }
  return getLocalRequests();
}

export async function createRegisteredUser(
  payload: RegisterUserPayload
): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const localUsers = getLocalUsers();
  if (localUsers.some(u => u.email.toLowerCase() === payload.email.toLowerCase())) {
    return { success: false, error: 'El correo electrónico ya se encuentra registrado.' };
  }

  const newProfile: UserProfile = {
    id: 'user-' + Date.now(),
    email: payload.email.trim(),
    role: payload.role,
    area: payload.area,
    adminName: payload.adminName || null,
    dni: payload.dni || null,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  // Try creating in Supabase
  if (supabase) {
    try {
      // 1. Try to sign up in auth.users if password provided
      if (payload.password) {
        await supabase.auth.signUp({
          email: payload.email.trim(),
          password: payload.password,
          options: {
            data: {
              role: payload.role,
              area: payload.area,
              admin_name: payload.adminName,
              dni: payload.dni
            }
          }
        });
      }

      // 2. Insert into user_profiles table
      const { data, error } = await supabase
        .from('user_profiles')
        .insert([
          {
            email: newProfile.email,
            role: newProfile.role,
            area: newProfile.area,
            admin_name: newProfile.adminName,
            dni: newProfile.dni,
            status: 'active'
          }
        ])
        .select();

      if (!error && data && data[0]) {
        newProfile.id = data[0].id;
      }
    } catch (e) {
      console.warn('Supabase profile creation sync error (continuing with local cache):', e);
    }
  }

  // Update local storage
  const updated = [newProfile, ...localUsers];
  saveLocalUsers(updated);

  return { success: true, user: newProfile };
}

export async function deleteUserProfile(userId: string, email: string): Promise<boolean> {
  if (supabase) {
    try {
      await supabase.from('user_profiles').delete().eq('email', email);
    } catch {
      // ignore
    }
  }
  const current = getLocalUsers();
  const next = current.filter(u => u.id !== userId && u.email !== email);
  saveLocalUsers(next);
  return true;
}

export async function updateUserRoleAndArea(
  userId: string,
  email: string,
  role: 'Admin' | 'Operario' | 'Supervisor',
  area: string
): Promise<boolean> {
  if (supabase) {
    try {
      await supabase
        .from('user_profiles')
        .update({ role, area, updated_at: new Date().toISOString() })
        .eq('email', email);
    } catch {
      // ignore
    }
  }
  const current = getLocalUsers();
  const next = current.map(u => (u.id === userId || u.email === email ? { ...u, role, area } : u));
  saveLocalUsers(next);
  return true;
}

export async function submitAccessRequest(
  request: Omit<UserRequest, 'id' | 'status' | 'createdAt'>
): Promise<{ success: boolean; error?: string }> {
  const reqItem: UserRequest = {
    id: 'req-' + Date.now(),
    ...request,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  if (supabase) {
    try {
      await supabase.from('user_requests').insert([
        {
          email: request.email,
          full_name: request.fullName,
          dni: request.dni,
          area: request.area,
          role_requested: request.roleRequested,
          status: 'pending'
        }
      ]);
    } catch {
      // ignore
    }
  }

  const current = getLocalRequests();
  saveLocalRequests([reqItem, ...current]);
  return { success: true };
}

export async function updateRequestStatus(
  requestId: string,
  status: 'approved' | 'rejected'
): Promise<boolean> {
  if (supabase) {
    try {
      await supabase.from('user_requests').update({ status }).eq('id', requestId);
    } catch {
      // ignore
    }
  }
  const current = getLocalRequests();
  const next = current.map(r => (r.id === requestId ? { ...r, status } : r));
  saveLocalRequests(next);
  return true;
}
