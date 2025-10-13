import buildApiUrl from '../utils/api';

interface Organization {
  id: string;
  name: string;
  slug: string;
  type: string;
  owner_id: string | null;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface CreateOrganizationRequest {
  name: string;
  slug: string;
  type?: string;
  ownerId?: string;
  settings?: Record<string, unknown>;
}

interface CreateOrganizationResponse {
  success: boolean;
  data?: Organization;
  error?: string;
}

interface ListOrganizationsResponse {
  success: boolean;
  data?: Organization[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
  error?: string;
}

interface GetOrganizationResponse {
  success: boolean;
  data?: Organization;
  error?: string;
}

interface UpdateOrganizationRequest {
  name?: string;
  slug?: string;
  type?: string;
  ownerId?: string;
  isActive?: boolean;
  settings?: Record<string, unknown>;
}

interface UpdateOrganizationResponse {
  success: boolean;
  data?: Organization;
  error?: string;
}

interface DeleteOrganizationResponse {
  success: boolean;
  message?: string;
  error?: string;
}

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

export const organizationService = {
  createOrganization: async (request: CreateOrganizationRequest): Promise<CreateOrganizationResponse> => {
    try {
      const userId = getUserId();

      const response = await fetch(buildApiUrl('organizations/create'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'x-user-id': userId } : {})
        },
        body: JSON.stringify(request)
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
      console.error('Error creating organization:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create organization'
      };
    }
  },

  listOrganizations: async (params?: {
    page?: number;
    limit?: number;
    type?: string;
    isActive?: boolean;
  }): Promise<ListOrganizationsResponse> => {
    try {
      const userId = getUserId();

      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.type) queryParams.set('type', params.type);
      if (params?.isActive !== undefined) queryParams.set('isActive', params.isActive.toString());

      const queryString = queryParams.toString();
      const url = queryString
        ? `${buildApiUrl('organizations')}?${queryString}`
        : buildApiUrl('organizations');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'x-user-id': userId } : {})
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
      console.error('Error listing organizations:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list organizations'
      };
    }
  },

  getOrganization: async (organizationId: string): Promise<GetOrganizationResponse> => {
    try {
      const userId = getUserId();

      const response = await fetch(buildApiUrl(`organizations/${organizationId}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'x-user-id': userId } : {})
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
      console.error('Error getting organization:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get organization'
      };
    }
  },

  updateOrganization: async (
    organizationId: string,
    request: UpdateOrganizationRequest
  ): Promise<UpdateOrganizationResponse> => {
    try {
      const userId = getUserId();

      const response = await fetch(buildApiUrl(`organizations/${organizationId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'x-user-id': userId } : {})
        },
        body: JSON.stringify(request)
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
      console.error('Error updating organization:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update organization'
      };
    }
  },

  deleteOrganization: async (organizationId: string): Promise<DeleteOrganizationResponse> => {
    try {
      const userId = getUserId();

      const response = await fetch(buildApiUrl(`organizations/${organizationId}`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'x-user-id': userId } : {})
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
      console.error('Error deleting organization:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete organization'
      };
    }
  }
};

export type {
  Organization,
  CreateOrganizationRequest,
  CreateOrganizationResponse,
  ListOrganizationsResponse,
  GetOrganizationResponse,
  UpdateOrganizationRequest,
  UpdateOrganizationResponse,
  DeleteOrganizationResponse
};
