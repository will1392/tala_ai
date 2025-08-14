/**
 * Marketing Storage Service
 * Handles all persistence for marketing profiles with multiple fallback layers
 */

import type { MarketingProfile, Goal, AssessmentResult, GrowthPlan } from '../types/marketing';

interface StorageLayer {
  name: string;
  priority: number;
  available: boolean;
  save: (key: string, data: any) => Promise<void>;
  load: (key: string) => Promise<any>;
  delete: (key: string) => Promise<void>;
}

class MarketingStorageService {
  private static instance: MarketingStorageService;
  private layers: StorageLayer[] = [];
  private baseUrl: string;
  private syncQueue: any[] = [];
  private isSyncing: boolean = false;

  private constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    this.initializeStorageLayers();
    this.startSyncWorker();
  }

  static getInstance(): MarketingStorageService {
    if (!MarketingStorageService.instance) {
      MarketingStorageService.instance = new MarketingStorageService();
    }
    return MarketingStorageService.instance;
  }

  /**
   * Initialize storage layers in priority order
   */
  private initializeStorageLayers() {
    // 1. Server Database (highest priority)
    this.layers.push({
      name: 'database',
      priority: 1,
      available: true,
      save: async (key, data) => {
        const response = await fetch(`${this.baseUrl}/api/marketing-profile/${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Database save failed');
      },
      load: async (key) => {
        const response = await fetch(`${this.baseUrl}/api/marketing-profile/${key}`);
        if (!response.ok) throw new Error('Database load failed');
        return response.json();
      },
      delete: async (key) => {
        const response = await fetch(`${this.baseUrl}/api/marketing-profile/${key}`, {
          method: 'DELETE'
        });
        if (!response.ok) throw new Error('Database delete failed');
      }
    });

    // 2. IndexedDB (offline capable)
    this.layers.push({
      name: 'indexeddb',
      priority: 2,
      available: 'indexedDB' in window,
      save: async (key, data) => {
        const db = await this.openIndexedDB();
        const tx = db.transaction(['profiles'], 'readwrite');
        await tx.objectStore('profiles').put({ id: key, data, timestamp: Date.now() });
      },
      load: async (key) => {
        const db = await this.openIndexedDB();
        const tx = db.transaction(['profiles'], 'readonly');
        const result = await tx.objectStore('profiles').get(key);
        return result?.data;
      },
      delete: async (key) => {
        const db = await this.openIndexedDB();
        const tx = db.transaction(['profiles'], 'readwrite');
        await tx.objectStore('profiles').delete(key);
      }
    });

    // 3. LocalStorage (fallback)
    this.layers.push({
      name: 'localStorage',
      priority: 3,
      available: 'localStorage' in window,
      save: async (key, data) => {
        try {
          localStorage.setItem(`marketing_${key}`, JSON.stringify({
            data,
            timestamp: Date.now(),
            version: '1.0'
          }));
        } catch (e) {
          // Handle quota exceeded
          this.cleanupOldData();
          localStorage.setItem(`marketing_${key}`, JSON.stringify({
            data,
            timestamp: Date.now(),
            version: '1.0'
          }));
        }
      },
      load: async (key) => {
        const item = localStorage.getItem(`marketing_${key}`);
        if (!item) return null;
        const parsed = JSON.parse(item);
        return parsed.data;
      },
      delete: async (key) => {
        localStorage.removeItem(`marketing_${key}`);
      }
    });

    // 4. Session Storage (temporary)
    this.layers.push({
      name: 'sessionStorage',
      priority: 4,
      available: 'sessionStorage' in window,
      save: async (key, data) => {
        sessionStorage.setItem(`marketing_${key}`, JSON.stringify(data));
      },
      load: async (key) => {
        const item = sessionStorage.getItem(`marketing_${key}`);
        return item ? JSON.parse(item) : null;
      },
      delete: async (key) => {
        sessionStorage.removeItem(`marketing_${key}`);
      }
    });
  }

  /**
   * Save marketing profile with multi-layer persistence
   */
  async saveProfile(profile: MarketingProfile, brandId: string): Promise<void> {
    const key = `profile_${brandId}`;
    
    // Save to all available layers
    const savePromises = this.layers
      .filter(layer => layer.available)
      .map(async (layer) => {
        try {
          await layer.save(key, profile);
          console.log(`✅ Saved to ${layer.name}`);
        } catch (error) {
          console.error(`❌ Failed to save to ${layer.name}:`, error);
          
          // Queue for retry if database save failed
          if (layer.name === 'database') {
            this.queueForSync({
              type: 'save',
              key,
              data: profile,
              attempts: 0
            });
          }
        }
      });

    await Promise.allSettled(savePromises);
    
    // Also save individual components for quick access
    await this.saveComponent('assessment', profile.assessment, brandId);
    await this.saveComponent('goals', profile.goals, brandId);
    await this.saveComponent('growthPlan', profile.growthPlan, brandId);
  }

  /**
   * Load marketing profile with fallback layers
   */
  async loadProfile(brandId: string): Promise<MarketingProfile | null> {
    const key = `profile_${brandId}`;
    
    // Try loading from each layer in priority order
    for (const layer of this.layers.filter(l => l.available)) {
      try {
        const data = await layer.load(key);
        if (data) {
          console.log(`✅ Loaded from ${layer.name}`);
          
          // If loaded from offline storage, queue sync
          if (layer.name !== 'database') {
            this.queueForSync({
              type: 'sync',
              key,
              data,
              attempts: 0
            });
          }
          
          return data;
        }
      } catch (error) {
        console.error(`Failed to load from ${layer.name}:`, error);
      }
    }
    
    return null;
  }

  /**
   * Save individual component
   */
  private async saveComponent(type: string, data: any, brandId: string): Promise<void> {
    if (!data) return;
    
    const key = `${type}_${brandId}`;
    
    // Save to localStorage for quick access
    try {
      localStorage.setItem(`marketing_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error(`Failed to save ${type}:`, e);
    }
  }

  /**
   * Export profile data for backup
   */
  async exportProfile(brandId: string): Promise<string> {
    const profile = await this.loadProfile(brandId);
    if (!profile) throw new Error('No profile found');

    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      profile,
      metadata: {
        brandId,
        totalGoals: profile.goals?.length || 0,
        assessmentScore: profile.assessment?.score || 0,
        skillLevel: profile.skillLevel
      }
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import profile from backup
   */
  async importProfile(jsonData: string, brandId: string): Promise<void> {
    try {
      const parsed = JSON.parse(jsonData);
      
      if (!parsed.version || !parsed.profile) {
        throw new Error('Invalid import format');
      }

      // Validate and save
      await this.saveProfile(parsed.profile, brandId);
      
      console.log('✅ Profile imported successfully');
    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    }
  }

  /**
   * Queue data for sync when connection is restored
   */
  private queueForSync(item: any) {
    // Prevent duplicates
    const exists = this.syncQueue.some(
      q => q.key === item.key && q.type === item.type
    );
    
    if (!exists) {
      this.syncQueue.push({
        ...item,
        queuedAt: Date.now()
      });
      
      // Save queue to localStorage
      localStorage.setItem('marketing_sync_queue', JSON.stringify(this.syncQueue));
    }
  }

  /**
   * Background sync worker
   */
  private startSyncWorker() {
    // Load existing queue
    const savedQueue = localStorage.getItem('marketing_sync_queue');
    if (savedQueue) {
      this.syncQueue = JSON.parse(savedQueue);
    }

    // Check for sync every 30 seconds
    setInterval(() => {
      if (!this.isSyncing && this.syncQueue.length > 0 && navigator.onLine) {
        this.processSyncQueue();
      }
    }, 30000);

    // Also sync when coming online
    window.addEventListener('online', () => {
      console.log('📡 Connection restored, syncing...');
      this.processSyncQueue();
    });
  }

  /**
   * Process sync queue
   */
  private async processSyncQueue() {
    if (this.isSyncing || this.syncQueue.length === 0) return;
    
    this.isSyncing = true;
    const queue = [...this.syncQueue];
    
    for (const item of queue) {
      try {
        if (item.type === 'save' || item.type === 'sync') {
          await this.layers[0].save(item.key, item.data); // Save to database
          
          // Remove from queue
          this.syncQueue = this.syncQueue.filter(q => q !== item);
        }
      } catch (error) {
        console.error('Sync failed for item:', item, error);
        
        // Increment attempts
        item.attempts++;
        
        // Remove if too many attempts
        if (item.attempts > 5) {
          this.syncQueue = this.syncQueue.filter(q => q !== item);
        }
      }
    }
    
    // Save updated queue
    localStorage.setItem('marketing_sync_queue', JSON.stringify(this.syncQueue));
    
    this.isSyncing = false;
  }

  /**
   * Open IndexedDB
   */
  private async openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('MarketingProfiles', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('profiles')) {
          db.createObjectStore('profiles', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('snapshots')) {
          const snapshots = db.createObjectStore('snapshots', { keyPath: 'id' });
          snapshots.createIndex('profileId', 'profileId', { unique: false });
          snapshots.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Clean up old data when storage is full
   */
  private cleanupOldData() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('marketing_'));
    const items = keys.map(key => ({
      key,
      data: localStorage.getItem(key),
      timestamp: JSON.parse(localStorage.getItem(key) || '{}').timestamp || 0
    }));
    
    // Sort by timestamp and remove oldest
    items.sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove oldest 25%
    const toRemove = Math.floor(items.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      localStorage.removeItem(items[i].key);
    }
    
    console.log(`🧹 Cleaned up ${toRemove} old items`);
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): any {
    const stats = {
      layers: this.layers.map(l => ({
        name: l.name,
        available: l.available
      })),
      syncQueue: this.syncQueue.length,
      localStorage: {
        used: new Blob(Object.values(localStorage)).size,
        items: Object.keys(localStorage).filter(k => k.startsWith('marketing_')).length
      }
    };
    
    return stats;
  }

  /**
   * Clear all marketing data (for testing or reset)
   */
  async clearAllData(brandId?: string): Promise<void> {
    const pattern = brandId ? `marketing_.*${brandId}` : 'marketing_';
    
    // Clear localStorage
    Object.keys(localStorage)
      .filter(k => k.match(new RegExp(pattern)))
      .forEach(k => localStorage.removeItem(k));
    
    // Clear sessionStorage
    Object.keys(sessionStorage)
      .filter(k => k.match(new RegExp(pattern)))
      .forEach(k => sessionStorage.removeItem(k));
    
    // Clear IndexedDB
    if ('indexedDB' in window) {
      const db = await this.openIndexedDB();
      const tx = db.transaction(['profiles'], 'readwrite');
      await tx.objectStore('profiles').clear();
    }
    
    // Clear sync queue
    this.syncQueue = [];
    localStorage.removeItem('marketing_sync_queue');
    
    console.log('🗑️ All marketing data cleared');
  }
}

// Export singleton instance
export const marketingStorage = MarketingStorageService.getInstance();

// Export convenience functions
export async function saveMarketingProfile(profile: MarketingProfile, brandId: string): Promise<void> {
  return marketingStorage.saveProfile(profile, brandId);
}

export async function loadMarketingProfile(brandId: string): Promise<MarketingProfile | null> {
  return marketingStorage.loadProfile(brandId);
}

export async function exportMarketingData(brandId: string): Promise<string> {
  return marketingStorage.exportProfile(brandId);
}

export async function importMarketingData(jsonData: string, brandId: string): Promise<void> {
  return marketingStorage.importProfile(jsonData, brandId);
}

export function getStorageStatus(): any {
  return marketingStorage.getStorageStats();
}