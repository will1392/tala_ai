import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthState } from '../types/auth';

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

// Mock users for testing
const mockUsers: Record<string, { user: User; password: string }> = {
  'admin@tala.ai': {
    password: 'admin123',
    user: {
      id: 'admin-1',
      email: 'admin@tala.ai',
      role: 'admin',
      name: 'Tala Admin',
      createdAt: new Date('2024-01-01')
    }
  },
  'agent1@travel.com': {
    password: 'agent123',
    user: {
      id: 'agent-1',
      email: 'agent1@travel.com', 
      role: 'agent',
      name: 'Travel Agent 1',
      createdAt: new Date('2024-01-15')
    }
  },
  'agent2@travel.com': {
    password: 'agent123',
    user: {
      id: 'agent-2',
      email: 'agent2@travel.com',
      role: 'agent', 
      name: 'Travel Agent 2',
      createdAt: new Date('2024-01-20')
    }
  }
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockUser = mockUsers[email];
        
        if (!mockUser || mockUser.password !== password) {
          set({ isLoading: false });
          throw new Error('Invalid email or password');
        }
        
        set({
          user: mockUser.user,
          isAuthenticated: true,
          isLoading: false
        });
        
        return mockUser.user;
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false
        });
      },

      setUser: (user: User | null) => {
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false
        });
      }
    }),
    {
      name: 'tala-auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);