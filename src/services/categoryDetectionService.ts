interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

const CATEGORIES: Category[] = [
  {
    id: "e3647818-52ac-4d93-ba7d-333ece6a5021",
    slug: "destinations",
    name: "Destinations",
    description: "Travel destination guides, requirements, and information",
    icon: "MapPin",
    color: "#10b981"
  },
  {
    id: "6ff7d315-20d2-495e-be90-99abaf50aa93", 
    slug: "suppliers",
    name: "Suppliers",
    description: "Hotel, airline, and service provider information",
    icon: "Building",
    color: "#3b82f6"
  },
  {
    id: "cae768d2-92b0-4e1e-a05e-0cb23425b352",
    slug: "miscellaneous", 
    name: "Miscellaneous",
    description: "Other documents and files that don't fit into specific categories",
    icon: "Archive",
    color: "#6b7280"
  }
];

// Keywords for each category
const CATEGORY_KEYWORDS = {
  destinations: [
    // Countries and cities
    'greece', 'spain', 'italy', 'france', 'germany', 'japan', 'thailand', 'australia',
    'athens', 'madrid', 'rome', 'paris', 'berlin', 'tokyo', 'bangkok', 'sydney',
    'london', 'new york', 'dubai', 'singapore', 'istanbul', 'barcelona',
    
    // Travel-related terms
    'visa', 'passport', 'entry requirements', 'customs', 'immigration',
    'destination', 'country', 'city', 'travel to', 'visiting',
    'tourist', 'tourism', 'sightseeing', 'attractions', 'landmarks',
    'culture', 'weather', 'climate', 'local customs', 'currency',
    'language', 'time zone', 'embassy', 'consulate',
    
    // Activities and places
    'museum', 'restaurant', 'beach', 'mountain', 'temple', 'church',
    'palace', 'park', 'market', 'shopping', 'nightlife'
  ],
  
  suppliers: [
    // Airlines
    'airline', 'airlines', 'flight', 'flights', 'plane', 'aircraft',
    'american airlines', 'delta', 'united', 'lufthansa', 'british airways',
    'emirates', 'qatar airways', 'singapore airlines', 'air france',
    'klm', 'cathay pacific', 'ana', 'jal', 'virgin', 'southwest',
    
    // Hotels and accommodation
    'hotel', 'hotels', 'resort', 'resorts', 'accommodation', 'lodging',
    'marriott', 'hilton', 'hyatt', 'sheraton', 'intercontinental',
    'holiday inn', 'westin', 'ritz carlton', 'four seasons',
    'booking', 'reservation', 'check-in', 'check-out',
    
    // Transportation
    'car rental', 'rental car', 'hertz', 'avis', 'budget', 'enterprise',
    'uber', 'taxi', 'transport', 'transfer', 'shuttle',
    'train', 'bus', 'metro', 'subway',
    
    // Travel services
    'travel agency', 'tour operator', 'cruise line', 'insurance company',
    'travel insurance', 'supplier', 'vendor', 'service provider',
    'contact information', 'phone number', 'email', 'address'
  ],
  
  miscellaneous: [
    'general', 'misc', 'miscellaneous', 'other', 'various', 'mixed',
    'note', 'notes', 'reminder', 'memo', 'question', 'questions',
    'personal', 'private', 'temp', 'temporary', 'draft', 'test',
    'random', 'unsorted', 'unclassified'
  ]
};

export class CategoryDetectionService {
  static detectCategory(content: string): Category | null {
    const text = content.toLowerCase();
    const words = text.split(/\s+/);
    
    // Calculate scores for each category
    const scores = {
      destinations: 0,
      suppliers: 0,
      miscellaneous: 0
    };
    
    // Check for exact keyword matches
    for (const [categorySlug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          scores[categorySlug as keyof typeof scores] += keyword.split(' ').length;
        }
      }
    }
    
    // Boost scores for category-specific patterns
    
    // Destinations patterns
    if (text.match(/travel to|visiting|going to|trip to|vacation to/)) {
      scores.destinations += 3;
    }
    if (text.match(/visa|passport|entry requirement/)) {
      scores.destinations += 4;
    }
    if (text.match(/country|city|destination/)) {
      scores.destinations += 2;
    }
    
    // Suppliers patterns  
    if (text.match(/hotel|airline|flight|booking/)) {
      scores.suppliers += 3;
    }
    if (text.match(/contact|phone|email|address|customer service/)) {
      scores.suppliers += 2;
    }
    if (text.match(/reservation|check.?in|check.?out/)) {
      scores.suppliers += 2;
    }
    
    // Find the category with the highest score
    const maxScore = Math.max(...Object.values(scores));
    
    // Require minimum confidence threshold
    if (maxScore < 2) {
      return null; // Not confident enough
    }
    
    const topCategorySlug = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0];
    
    if (!topCategorySlug) {
      return null;
    }
    
    return CATEGORIES.find(cat => cat.slug === topCategorySlug) || null;
  }
  
  static getConfidenceScore(content: string, category: Category): number {
    const text = content.toLowerCase();
    const keywords = CATEGORY_KEYWORDS[category.slug as keyof typeof CATEGORY_KEYWORDS] || [];
    
    let matches = 0;
    let totalPossibleMatches = keywords.length;
    
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        matches++;
      }
    }
    
    return Math.min(matches / totalPossibleMatches * 100, 95); // Cap at 95%
  }
  
  static getAllCategories(): Category[] {
    return CATEGORIES;
  }
  
  static getCategoryById(id: string): Category | null {
    return CATEGORIES.find(cat => cat.id === id) || null;
  }
  
  static getCategoryBySlug(slug: string): Category | null {
    return CATEGORIES.find(cat => cat.slug === slug) || null;
  }
}

export type { Category };