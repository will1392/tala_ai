import { create } from 'zustand';
import type {
  AdminTeam,
  CreateManagedUserInput,
  ManagedUser,
  UpdateManagedUserInput
} from '../types/userManagement';

interface UserManagementState {
  admins: AdminTeam[];
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

const initialAdmins: AdminTeam[] = [
  {
    id: 'will-1',
    name: 'Will',
    email: 'will@weareapexcreatives.com',
    teamName: 'Apex Creatives - Travel Team',
    organization: 'Apex Creatives',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: now(),
    users: [
      {
        id: generateId(),
        name: 'Alicia Moreno',
        email: 'alicia@apextravel.com',
        role: 'agent',
        status: 'active',
        credits: 2400,
        lastLogin: '2024-03-15T12:00:00.000Z',
        lastPasswordReset: '2024-02-10T09:15:00.000Z',
        createdAt: '2023-12-12T16:45:00.000Z',
        updatedAt: '2024-03-15T12:00:00.000Z'
      },
      {
        id: generateId(),
        name: 'Marcus Lee',
        email: 'marcus@apextravel.com',
        role: 'agent',
        status: 'invited',
        credits: 600,
        lastLogin: '2024-03-08T08:30:00.000Z',
        lastPasswordReset: '2024-01-22T14:00:00.000Z',
        createdAt: '2024-01-10T10:00:00.000Z',
        updatedAt: '2024-03-08T08:30:00.000Z'
      }
    ]
  },
  {
    id: 'admin-1',
    name: 'Tala Admin',
    email: 'admin@tala.ai',
    teamName: 'Tala Operations',
    organization: 'Tala',
    createdAt: '2024-01-05T00:00:00.000Z',
    updatedAt: now(),
    users: [
      {
        id: generateId(),
        name: 'Jordan Evans',
        email: 'jordan@tala.ai',
        role: 'analyst',
        status: 'active',
        credits: 1800,
        lastLogin: '2024-03-14T15:20:00.000Z',
        lastPasswordReset: '2024-02-18T11:05:00.000Z',
        createdAt: '2023-11-20T09:00:00.000Z',
        updatedAt: '2024-03-14T15:20:00.000Z'
      },
      {
        id: generateId(),
        name: 'Priya Desai',
        email: 'priya@tala.ai',
        role: 'agent',
        status: 'suspended',
        credits: 300,
        lastLogin: '2024-02-28T10:40:00.000Z',
        lastPasswordReset: '2024-02-01T09:30:00.000Z',
        createdAt: '2024-01-12T13:30:00.000Z',
        updatedAt: '2024-02-28T10:40:00.000Z'
      }
    ]
  }
];

export const useUserManagementStore = create<UserManagementState>((set) => ({
  admins: initialAdmins,

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
