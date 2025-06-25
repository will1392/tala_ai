import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Chat API
  sendChatMessage: async (message: string): Promise<{ message: string }> => {
    try {
      const response = await apiClient.post('/chat/message', { message });
      return response.data;
    } catch (error) {
      // Mock response for development
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            message: `This is a mock response to: "${message}". In a real implementation, this would be connected to your AI service.`
          });
        }, 1000);
      });
    }
  },

  // Document API
  uploadDocument: async (file: File): Promise<{ id: string; content: string; tags: string[] }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      // Mock response for development
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: Date.now().toString(),
            content: `Content of ${file.name}`,
            tags: ['document', 'uploaded']
          });
        }, 2000);
      });
    }
  },

  getDocuments: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/documents');
      return response.data;
    } catch (error) {
      // Mock response for development
      return [];
    }
  },

  searchDocuments: async (query: string): Promise<any[]> => {
    try {
      const response = await apiClient.get(`/documents/search?q=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      // Mock response for development
      return [];
    }
  },

  deleteDocument: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/documents/${id}`);
    } catch (error) {
      // Mock success for development
      return Promise.resolve();
    }
  },

  // Knowledge API
  getKnowledgeBase: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/knowledge');
      return response.data;
    } catch (error) {
      return [];
    }
  },

  // Auth API
  login: async (email: string, password: string): Promise<{ token: string; user: any }> => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      throw new Error('Invalid credentials');
    }
  },

  register: async (userData: any): Promise<{ token: string; user: any }> => {
    try {
      const response = await apiClient.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw new Error('Registration failed');
    }
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      localStorage.removeItem('auth_token');
    }
  },
};