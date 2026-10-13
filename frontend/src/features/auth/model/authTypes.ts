export type UserRole = 'Admin' | 'Operario' | 'Supervisor';

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
