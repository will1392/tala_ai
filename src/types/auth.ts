export interface User {
  id: string;
  email: string;
  role: 'admin' | 'agent' | 'super_admin';
  name: string;
  createdAt: Date;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}