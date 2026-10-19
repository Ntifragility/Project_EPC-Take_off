export type UserRole = 'Level 1' | 'Level 2' | 'Level 3';
export type UserLevel = 1 | 2 | 3;

export interface RoleDefinition {
  role: UserRole;
  level: UserLevel;
  label: string;
}

export const USER_ROLES: RoleDefinition[] = [
  { role: 'Level 1', level: 1, label: 'Level 1' },
  { role: 'Level 2', level: 2, label: 'Level 2' },
  { role: 'Level 3', level: 3, label: 'Level 3' }
];

export const ROLE_LEVEL_MAP: Record<UserRole, RoleDefinition> = {
  'Level 1': USER_ROLES[0],
  'Level 2': USER_ROLES[1],
  'Level 3': USER_ROLES[2]
};

export function normalizeRole(role?: string | null): UserRole {
  if (!role) return 'Level 1';
  if (role === 'Level 3' || role === 'Admin') return 'Level 3';
  if (role === 'Level 2' || role === 'Superv' || role === 'Supervisor') return 'Level 2';
  return 'Level 1';
}

export function getRoleLevel(role?: string | null): UserLevel {
  return ROLE_LEVEL_MAP[normalizeRole(role)].level;
}

export function getRoleDisplayName(role?: string | null): string {
  return normalizeRole(role);
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
