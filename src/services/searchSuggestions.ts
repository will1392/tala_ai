/**
 * Search Suggestions Service
 * Provides intelligent search suggestions based on document content and user behavior
 */

export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'recent' | 'popular' | 'folder' | 'category' | 'smart';
  icon?: string;
  metadata?: string;
  category?: string;
}

export class SearchSuggestionsService {
  private static popularQueries = [
    { text: 'visa requirements', category: 'visa', icon: '🛂' },
    { text: 'baggage policy', category: 'airline', icon: '🧳' },
    { text: 'travel insurance', category: 'general', icon: '🛡️' },
    { text: 'passport renewal', category: 'visa', icon: '📘' },
    { text: 'flight booking', category: 'airline', icon: '✈️' },
    { text: 'hotel recommendations', category: 'destination', icon: '🏨' },
    { text: 'currency exchange', category: 'destination', icon: '💱' },
    { text: 'health requirements', category: 'destination', icon: '💉' },
    { text: 'customs regulations', category: 'destination', icon: '🛃' },
    { text: 'cancellation policy', category: 'airline', icon: '❌' },
  ];

  private static smartSuggestions = [
    { text: 'COVID-19 travel restrictions', category: 'general', icon: '😷' },
    { text: 'entry requirements by country', category: 'visa', icon: '🌍' },
    { text: 'travel advisory updates', category: 'general', icon: '⚠️' },
    { text: 'airline alliance benefits', category: 'airline', icon: '🤝' },
    { text: 'travel rewards programs', category: 'general', icon: '💎' },
  ];

  static getSuggestions(
    query: string,
    recentSearches: string[] = [],
    currentFolder?: { id: string; name: string } | null,
    folders: any[] = []
  ): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = [];
    const queryLower = query.toLowerCase();

    // Recent searches (if we have a query, filter to relevant ones)
    if (recentSearches.length > 0) {
      const relevantRecent = query
        ? recentSearches.filter(search => 
            search.toLowerCase().includes(queryLower) || 
            queryLower.includes(search.toLowerCase())
          )
        : recentSearches.slice(0, 3);

      relevantRecent.forEach((search, i) => {
        suggestions.push({
          id: `recent-${i}`,
          text: search,
          type: 'recent',
          icon: '🕒',
          metadata: 'Recent'
        });
      });
    }

    // Folder suggestions (when not in a specific folder)
    if (!currentFolder || currentFolder.id === 'all') {
      folders.slice(0, 2).forEach((folder, i) => {
        if (folder.documentCount > 0 && (!query || folder.name.toLowerCase().includes(queryLower))) {
          suggestions.push({
            id: `folder-${i}`,
            text: `Search in ${folder.name}`,
            type: 'folder',
            icon: '📁',
            metadata: `${folder.documentCount} documents`,
            category: folder.name
          });
        }
      });
    }

    // Popular queries
    const relevantPopular = this.popularQueries.filter(item => 
      !query || 
      item.text.toLowerCase().includes(queryLower) ||
      item.category.toLowerCase().includes(queryLower)
    ).slice(0, 3);

    relevantPopular.forEach((item, i) => {
      suggestions.push({
        id: `popular-${i}`,
        text: item.text,
        type: 'popular',
        icon: item.icon,
        metadata: 'Popular',
        category: item.category
      });
    });

    // Smart suggestions based on query context
    if (query) {
      const contextualSuggestions = this.getContextualSuggestions(query);
      contextualSuggestions.forEach((item, i) => {
        suggestions.push({
          id: `smart-${i}`,
          text: item.text,
          type: 'smart',
          icon: item.icon,
          metadata: 'Suggested',
          category: item.category
        });
      });
    } else {
      // Show some smart suggestions when no query
      this.smartSuggestions.slice(0, 2).forEach((item, i) => {
        suggestions.push({
          id: `smart-${i}`,
          text: item.text,
          type: 'smart',
          icon: item.icon,
          metadata: 'Trending',
          category: item.category
        });
      });
    }

    // Remove duplicates and limit to reasonable number
    const unique = suggestions.filter((suggestion, index, self) => 
      index === self.findIndex(s => s.text === suggestion.text)
    );

    return unique.slice(0, 8);
  }

  private static getContextualSuggestions(query: string): Array<{text: string, icon: string, category: string}> {
    const queryLower = query.toLowerCase();
    const suggestions: Array<{text: string, icon: string, category: string}> = [];

    // Travel-related keywords mapping
    const contextMap: Record<string, Array<{text: string, icon: string, category: string}>> = {
      'visa': [
        { text: 'visa application process', icon: '📋', category: 'visa' },
        { text: 'visa requirements by country', icon: '🌍', category: 'visa' },
        { text: 'tourist visa duration', icon: '⏰', category: 'visa' }
      ],
      'flight': [
        { text: 'flight booking confirmation', icon: '✅', category: 'airline' },
        { text: 'flight change policies', icon: '🔄', category: 'airline' },
        { text: 'connecting flight rules', icon: '🔗', category: 'airline' }
      ],
      'hotel': [
        { text: 'hotel cancellation policy', icon: '🏨', category: 'destination' },
        { text: 'hotel amenities guide', icon: '🛎️', category: 'destination' },
        { text: 'hotel loyalty programs', icon: '⭐', category: 'destination' }
      ],
      'insurance': [
        { text: 'travel insurance coverage', icon: '🛡️', category: 'general' },
        { text: 'medical coverage abroad', icon: '🏥', category: 'general' },
        { text: 'insurance claim process', icon: '📝', category: 'general' }
      ],
      'covid': [
        { text: 'COVID-19 testing requirements', icon: '🧪', category: 'general' },
        { text: 'vaccination certificate', icon: '💉', category: 'general' },
        { text: 'quarantine guidelines', icon: '🏠', category: 'general' }
      ]
    };

    // Find matching contexts
    Object.entries(contextMap).forEach(([keyword, items]) => {
      if (queryLower.includes(keyword)) {
        suggestions.push(...items.slice(0, 2));
      }
    });

    return suggestions.slice(0, 3);
  }

  static getQuickFilters(): Array<{id: string, label: string, value: string, type: string}> {
    return [
      { id: 'recent', label: 'Recently Added', value: 'recent', type: 'sort' },
      { id: 'pdf', label: 'PDF Documents', value: 'application/pdf', type: 'fileType' },
      { id: 'visa-docs', label: 'Visa Documents', value: 'visa', type: 'category' },
      { id: 'airline-policies', label: 'Airline Policies', value: 'airline', type: 'category' },
    ];
  }
}