export type UserRole = 'Operario' | 'Superv' | 'Admin';
export type UserLevel = 1 | 2 | 3;

export interface RoleDefinition {
  role: UserRole;
  level: UserLevel;
  label: string;
  displayName: string;
  description: string;
}

export const USER_ROLES: RoleDefinition[] = [
  { role: 'Operario', level: 1, label: 'Level 1', displayName: 'Level 1 - Operario', description: 'Operador de metrados (solo lectura y aplicación)' },
  { role: 'Superv', level: 2, label: 'Level 2', displayName: 'Level 2 - Superv', description: 'Supervisor de oficina técnica (edición y calibración)' },
  { role: 'Admin', level: 3, label: 'Level 3', displayName: 'Level 3 - Admin', description: 'Administrador general del sistema (control total y usuarios)' }
];

export const ROLE_LEVEL_MAP: Record<UserRole, RoleDefinition> = {
  Operario: USER_ROLES[0],
  Superv: USER_ROLES[1],
  Admin: USER_ROLES[2]
};

export function normalizeRole(role?: string | null): UserRole {
  if (!role) return 'Operario';
  if (role === 'Admin') return 'Admin';
  if (role === 'Superv' || role === 'Supervisor') return 'Superv';
  return 'Operario';
}

export function getRoleLevel(role?: string | null): UserLevel {
  return ROLE_LEVEL_MAP[normalizeRole(role)].level;
}

export function getRoleDisplayName(role?: string | null): string {
  return ROLE_LEVEL_MAP[normalizeRole(role)].displayName;
}

export interface UserProfile {
  id: string;
  userId?: string;
  email: string;
  role: UserRole;
  area: string;
  adminName?: string | null;
  dni?: string | null;
  status: 'active' | 'pending' | 'inactive';
  createdAt: string;
  updatedAt?: string;
}

export interface UserRequest {
  id: string;
  email: string;
  fullName?: string;
  dni?: string;
  area: string;
  roleRequested: UserRole;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password?: string;
}

export interface RegisterUserPayload {
  email: string;
  password?: string;
  role: UserRole;
  area: string;
  adminName?: string;
  dni?: string;
}
