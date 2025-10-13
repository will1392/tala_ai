import { create } from 'zustand';
import type {
  AdminTeam,
  CreateManagedUserInput,
  ManagedUser,
  UpdateManagedUserInput
} from '../types/userManagement';

interface UserManagementState {
  admins: AdminTeam[];
  setUsers: (users: any[]) => void;
  createUser: (adminId: string, input: CreateManagedUserInput) => ManagedUser | null;
  updateUser: (adminId: string, userId: string, updates: UpdateManagedUserInput) => void;
  changeUserEmail: (adminId: string, userId: string, email: string) => void;
  resetUserPassword: (adminId: string, userId: string) => void;
  addUserCredits: (adminId: string, userId: string, amount: number) => void;
}

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `id-${Math.random().toString(36).slice(2, 11)}`;
};

const now = () => new Date().toISOString();

const initialAdmins: AdminTeam[] = [];

export const useUserManagementStore = create<UserManagementState>((set) => ({
  admins: initialAdmins,

  setUsers: (users) => {
    const managedUsers: ManagedUser[] = users.map((u) => ({
      id: u.user_id,
      name: u.user?.full_name || u.full_name || u.user?.email?.split('@')[0] || 'Unknown',
      email: u.user?.email || 'unknown@example.com',
      role: u.role,
      status: 'active',
      credits: (u.total_credits || 0) - (u.used_credits || 0),
      lastLogin: u.updated_at || u.created_at,
      lastPasswordReset: u.created_at,
      createdAt: u.created_at,
      updatedAt: u.updated_at || u.created_at
    }));

    const adminTeam: AdminTeam = {
      id: 'all-users',
      name: 'All Users',
      email: 'admin@tala.ai',
      teamName: 'Tala AI',
      organization: 'Tala',
      createdAt: now(),
      updatedAt: now(),
      users: managedUsers
    };

    set({ admins: [adminTeam] });
  },

  createUser: (adminId, input) => {
    if (!adminId) {
      return null;
    }

    const timestamp = now();
    const newUser: ManagedUser = {
      id: generateId(),
      name: input.name,
      email: input.email,
      role: input.role,
      status: input.status ?? 'active',
      credits: input.credits ?? 0,
      lastLogin: timestamp,
      lastPasswordReset: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    set((state) => ({
      admins: state.admins.map((admin) =>
        admin.id === adminId
          ? {
              ...admin,
              updatedAt: timestamp,
              users: [...admin.users, newUser]
            }
          : admin
      )
    }));

    return newUser;
  },

  updateUser: (adminId, userId, updates) => {
    const timestamp = now();

    set((state) => ({
      admins: state.admins.map((admin) => {
        if (admin.id !== adminId) {
          return admin;
        }

        return {
          ...admin,
          updatedAt: timestamp,
          users: admin.users.map((user) =>
            user.id === userId
              ? {
                  ...user,
                  ...updates,
                  updatedAt: timestamp
                }
              : user
          )
        };
      })
    }));
  },

  changeUserEmail: (adminId, userId, email) => {
    const timestamp = now();

    set((state) => ({
      admins: state.admins.map((admin) => {
        if (admin.id !== adminId) {
          return admin;
        }

        return {
          ...admin,
          updatedAt: timestamp,
          users: admin.users.map((user) =>
            user.id === userId
              ? {
                  ...user,
                  email,
                  updatedAt: timestamp
                }
              : user
          )
        };
      })
    }));
  },

  resetUserPassword: (adminId, userId) => {
    const timestamp = now();

    set((state) => ({
      admins: state.admins.map((admin) => {
        if (admin.id !== adminId) {
          return admin;
        }

        return {
          ...admin,
          updatedAt: timestamp,
          users: admin.users.map((user) =>
            user.id === userId
              ? {
                  ...user,
                  lastPasswordReset: timestamp,
                  updatedAt: timestamp
                }
              : user
          )
        };
      })
    }));
  },

  addUserCredits: (adminId, userId, amount) => {
    if (!Number.isFinite(amount) || amount === 0) {
      return;
    }

    const timestamp = now();

    set((state) => ({
      admins: state.admins.map((admin) => {
        if (admin.id !== adminId) {
          return admin;
        }

        return {
          ...admin,
          updatedAt: timestamp,
          users: admin.users.map((user) =>
            user.id === userId
              ? {
                  ...user,
                  credits: Math.max(0, user.credits + amount),
                  updatedAt: timestamp
                }
              : user
          )
        };
      })
    }));
  }
}));
