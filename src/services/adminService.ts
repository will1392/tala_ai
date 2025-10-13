import type { ManagedUserRole } from '../types/userManagement';
import buildApiUrl from '../utils/api';

interface CreateUserRequest {
  email: string;
  fullName: string;
  role: ManagedUserRole;
  credits?: number;
  sendInvite?: boolean;
  inviteRedirectUrl?: string;
}

interface CreateUserResponse {
  success: boolean;
  data?: {
    userId: string;
    email: string;
    fullName: string;
    role: string;
    planType: string;
    credits: number;
    organizationId?: string;
    organizationName?: string;
    message: string;
    invitationSent: boolean;
  };
  error?: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  plan_type: string;
  total_credits: number;
  available_credits: number;
  used_credits: number;
  status: string;
  organization_id: string | null;
  created_at: string;
  last_login: string | null;
}

interface ListUsersResponse {
  success: boolean;
  data?: {
    users: User[];
    total: number;
    page: number;
    limit: number;
  };
  error?: string;
}

const generateSecurePassword = (): string => {
  const length = 16;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }
  
  return password;
};

const getUserId = (): string | null => {
  try {
    const authStorage = localStorage.getItem('tala-auth-storage');
    if (!authStorage) return null;
    
    const parsed = JSON.parse(authStorage);
    return parsed?.state?.user?.id || null;
  } catch {
    return null;
  }
};

interface DeleteUserResponse {
  success: boolean;
  error?: string;
}

export const adminService = {
  createUser: async (request: CreateUserRequest): Promise<CreateUserResponse> => {
    try {
      const userId = getUserId();

      const response = await fetch(buildApiUrl('admin/users/create'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'x-user-id': userId } : {})
        },
        body: JSON.stringify({
          email: request.email,
          password: generateSecurePassword(),
          fullName: request.fullName,
          role: request.role,
          initialCredits: request.credits,
          sendInvite: request.sendInvite ?? true,
          inviteRedirectUrl: request.inviteRedirectUrl
        })
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('API Error:', response.status, text);
        return {
          success: false,
          error: `Server error (${response.status}): ${text || response.statusText}`
        };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user'
      };
    }
  },

  listUsers: async (params?: {
    page?: number;
    limit?: number;
    role?: string;
    organizationId?: string;
  }): Promise<ListUsersResponse> => {
    try {
      const userId = getUserId();

      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.role) queryParams.set('role', params.role);
      if (params?.organizationId) queryParams.set('organizationId', params.organizationId);

      const queryString = queryParams.toString();
      const url = queryString
        ? `${buildApiUrl('admin/users')}?${queryString}`
        : buildApiUrl('admin/users');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'x-user-id': userId } : {})
        }
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error listing users:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list users'
      };
    }
  },

  deleteUser: async (userId: string): Promise<DeleteUserResponse> => {
    try {
      const currentUserId = getUserId();

      const response = await fetch(buildApiUrl(`admin/users/${userId}`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(currentUserId ? { 'x-user-id': currentUserId } : {})
        }
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('API Error:', response.status, text);
        return {
          success: false,
          error: `Server error (${response.status}): ${text || response.statusText}`
        };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error deleting user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete user'
      };
    }
  }
};
