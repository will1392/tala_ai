import { create } from 'zustand';
import { api } from '../services/api';

interface Document {
  id: string;
  title: string;
  content: string;
  type: string;
  size: string;
  uploadedAt: Date;
  tags: string[];
}

interface KnowledgeStore {
  documents: Document[];
  searchResults: Document[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  uploadDocument: (file: File) => Promise<void>;
  searchDocuments: (query: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  fetchDocuments: () => Promise<void>;
  setError: (error: string | null) => void;
}

export const useKnowledgeStore = create<KnowledgeStore>((set, get) => ({
  documents: [],
  searchResults: [],
  isLoading: false,
  error: null,
  searchQuery: '',

  uploadDocument: async (file: File) => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.uploadDocument(file);
      
      const newDocument: Document = {
        id: response.id,
        title: file.name,
        content: response.content,
        type: file.type,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        uploadedAt: new Date(),
        tags: response.tags || [],
      };

      set((state) => ({
        documents: [...state.documents, newDocument],
        isLoading: false,
      }));
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to upload document',
      });
    }
  },

  searchDocuments: async (query: string) => {
    set({ isLoading: true, error: null, searchQuery: query });

    try {
      const results = await api.searchDocuments(query);
      
      set({
        searchResults: results,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to search documents',
      });
    }
  },

  deleteDocument: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      await api.deleteDocument(id);
      
      set((state) => ({
        documents: state.documents.filter((doc) => doc.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to delete document',
      });
    }
  },

  fetchDocuments: async () => {
    set({ isLoading: true, error: null });

    try {
      const documents = await api.getDocuments();
      
      set({
        documents,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch documents',
      });
    }
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));