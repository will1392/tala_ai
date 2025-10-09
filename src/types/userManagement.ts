export type ManagedUserRole = 'agent' | 'admin' | 'analyst';

export type ManagedUserStatus = 'active' | 'invited' | 'suspended';

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: ManagedUserRole;
  status: ManagedUserStatus;
  credits: number;
  lastLogin: string;
  lastPasswordReset: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTeam {
  id: string;
  name: string;
  email: string;
  teamName: string;
  organization?: string;
  createdAt: string;
  updatedAt: string;
  users: ManagedUser[];
}

export interface CreateManagedUserInput {
  name: string;
  email: string;
  role: ManagedUserRole;
  status?: ManagedUserStatus;
  credits?: number;
}

export interface UpdateManagedUserInput {
  name?: string;
  role?: ManagedUserRole;
  status?: ManagedUserStatus;
}
