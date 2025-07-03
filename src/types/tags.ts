/**
 * Tag Types and Interfaces
 * Supports metadata tagging for enhanced searchability and filtering
 */

export interface Tag {
  id: string;
  name: string;
  slug: string; // URL-friendly version of name
  description?: string;
  color: string; // Hex color for visual identification
  category: TagCategory;
  usage_count: number; // Track how many items use this tag
  created_at: Date;
  updated_at: Date;
  created_by: string; // User ID
}

export type TagCategory = 
  | 'visa_info'
  | 'hotel_info' 
  | 'restaurant_type'
  | 'supplier_type'
  | 'document_type'
  | 'destination'
  | 'activity_type'
  | 'transportation'
  | 'custom';

export interface TaggableItem {
  id: string;
  type: 'document' | 'folder' | 'primary_folder' | 'knowledge_entry';
  tags: Tag[];
}

export interface CreateTagRequest {
  name: string;
  description?: string;
  color?: string;
  category: TagCategory;
}

export interface UpdateTagRequest {
  id: string;
  name?: string;
  description?: string;
  color?: string;
  category?: TagCategory;
}

export interface TagAssignment {
  item_id: string;
  item_type: TaggableItem['type'];
  tag_id: string;
  assigned_at: Date;
  assigned_by: string; // User ID
}

export interface TagFilter {
  tags: string[]; // Tag IDs
  categories?: TagCategory[];
  include_mode: 'any' | 'all'; // Match any tag or all tags
}

export interface TagSearchResult {
  item: TaggableItem;
  matching_tags: Tag[];
  relevance_score: number;
}

// Predefined tag templates for common use cases
export const TAG_TEMPLATES: Record<TagCategory, Array<{ name: string; description: string; color: string }>> = {
  visa_info: [
    { name: 'Visa Required', description: 'Destination requires visa for entry', color: '#ef4444' },
    { name: 'Visa Free', description: 'No visa required for entry', color: '#22c55e' },
    { name: 'eVisa Available', description: 'Electronic visa available online', color: '#3b82f6' },
    { name: 'Visa on Arrival', description: 'Visa can be obtained at border', color: '#f59e0b' },
    { name: 'Transit Visa', description: 'Required for airport transit', color: '#8b5cf6' }
  ],
  hotel_info: [
    { name: 'Luxury Resort', description: '5-star luxury accommodations', color: '#fbbf24' },
    { name: 'Budget Hotel', description: 'Affordable accommodation option', color: '#10b981' },
    { name: 'Boutique Hotel', description: 'Unique, intimate property', color: '#ec4899' },
    { name: 'Business Hotel', description: 'Corporate and business travelers', color: '#6366f1' },
    { name: 'Family Friendly', description: 'Suitable for families with children', color: '#06b6d4' }
  ],
  restaurant_type: [
    { name: 'Fine Dining', description: 'Upscale restaurant experience', color: '#7c3aed' },
    { name: 'Casual Dining', description: 'Relaxed dining atmosphere', color: '#059669' },
    { name: 'Fast Food', description: 'Quick service restaurant', color: '#dc2626' },
    { name: 'Street Food', description: 'Local street vendors and stalls', color: '#ea580c' },
    { name: 'Vegetarian', description: 'Vegetarian-friendly options', color: '#16a34a' }
  ],
  supplier_type: [
    { name: 'Cruise Line', description: 'Ocean and river cruise operators', color: '#0891b2' },
    { name: 'Tour Operator', description: 'Package tour providers', color: '#c2410c' },
    { name: 'Airlines', description: 'Commercial airline companies', color: '#2563eb' },
    { name: 'Ground Transport', description: 'Buses, trains, car rentals', color: '#7c2d12' },
    { name: 'DMC', description: 'Destination Management Company', color: '#be185d' }
  ],
  document_type: [
    { name: 'Policy Document', description: 'Official policies and procedures', color: '#1f2937' },
    { name: 'Brochure', description: 'Marketing and promotional materials', color: '#db2777' },
    { name: 'Form', description: 'Application and booking forms', color: '#0369a1' },
    { name: 'Invoice', description: 'Billing and payment documents', color: '#059669' },
    { name: 'Contract', description: 'Legal agreements and contracts', color: '#7c3aed' }
  ],
  destination: [
    { name: 'Europe', description: 'European destinations', color: '#2563eb' },
    { name: 'Asia', description: 'Asian destinations', color: '#dc2626' },
    { name: 'Americas', description: 'North and South American destinations', color: '#16a34a' },
    { name: 'Africa', description: 'African destinations', color: '#ea580c' },
    { name: 'Oceania', description: 'Australia, New Zealand, Pacific Islands', color: '#0891b2' }
  ],
  activity_type: [
    { name: 'Adventure', description: 'Adventure and outdoor activities', color: '#059669' },
    { name: 'Cultural', description: 'Cultural and historical experiences', color: '#7c3aed' },
    { name: 'Relaxation', description: 'Spa, beach, wellness activities', color: '#06b6d4' },
    { name: 'Nightlife', description: 'Evening entertainment and dining', color: '#ec4899' },
    { name: 'Shopping', description: 'Shopping and retail experiences', color: '#f59e0b' }
  ],
  transportation: [
    { name: 'Flight', description: 'Air transportation', color: '#2563eb' },
    { name: 'Train', description: 'Railway transportation', color: '#059669' },
    { name: 'Bus', description: 'Bus and coach services', color: '#ea580c' },
    { name: 'Ferry', description: 'Water transportation', color: '#0891b2' },
    { name: 'Car Rental', description: 'Vehicle rental services', color: '#7c2d12' }
  ],
  custom: [
    { name: 'Important', description: 'High priority or importance', color: '#dc2626' },
    { name: 'Draft', description: 'Work in progress or draft content', color: '#6b7280' },
    { name: 'Archived', description: 'Archived or outdated content', color: '#374151' },
    { name: 'Featured', description: 'Featured or highlighted content', color: '#f59e0b' },
    { name: 'Review Required', description: 'Needs review or approval', color: '#7c3aed' }
  ]
};

// Helper functions for tag management
export const createTagSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

export const getTagColor = (category: TagCategory): string => {
  const categoryColors: Record<TagCategory, string> = {
    visa_info: '#ef4444',
    hotel_info: '#fbbf24',
    restaurant_type: '#059669',
    supplier_type: '#0891b2',
    document_type: '#1f2937',
    destination: '#2563eb',
    activity_type: '#059669',
    transportation: '#2563eb',
    custom: '#6b7280'
  };
  return categoryColors[category];
};

export const getCategoryDisplayName = (category: TagCategory): string => {
  const displayNames: Record<TagCategory, string> = {
    visa_info: 'Visa Information',
    hotel_info: 'Hotel Information',
    restaurant_type: 'Restaurant Type',
    supplier_type: 'Supplier Type',
    document_type: 'Document Type',
    destination: 'Destination',
    activity_type: 'Activity Type',
    transportation: 'Transportation',
    custom: 'Custom'
  };
  return displayNames[category];
};