/**
 * Mode Service
 * 
 * Handles mode persistence and synchronization
 */

interface UserMode {
  mode: 'travel' | 'cmo';
  subMode: string | null;
}

class ModeService {
  private apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  /**
   * Get user's current mode from server
   */
  async getUserMode(userId: string): Promise<UserMode> {
    try {
      const response = await fetch(`${this.apiUrl}/api/users/${userId}/mode`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user mode');
      }

      const data = await response.json();
      return {
        mode: data.mode || 'travel',
        subMode: data.subMode || null,
      };
    } catch (error) {
      // Default to travel mode if fetch fails
      console.warn('Failed to fetch user mode, using default:', error);
      return {
        mode: 'travel',
        subMode: null,
      };
    }
  }

  /**
   * Set user's mode on server
   */
  async setUserMode(
    userId: string,
    mode: 'travel' | 'cmo',
    subMode?: string | null
  ): Promise<{ success: boolean; mode: string; subMode: string | null }> {
    try {
      const response = await fetch(`${this.apiUrl}/api/users/${userId}/mode`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ mode, subMode }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user mode');
      }

      const data = await response.json();
      return {
        success: true,
        mode: data.mode,
        subMode: data.subMode || null,
      };
    } catch (error) {
      console.error('Failed to update user mode:', error);
      throw error;
    }
  }
}

export const modeService = new ModeService();