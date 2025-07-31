import React, { useState } from 'react';
import { Info, Star, Copy, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/cn';

interface QuickReferenceProps {
  context: string | null;
  resources: any[];
  favorites: string[];
  recentlyUsed: any[];
  onSelect: (resource: any) => void;
  onToggleFavorite: (resourceId: string) => void;
  trackUsage: (resourceId: string, action: string) => void;
  searchQuery?: string;
}

interface ReferenceSection {
  id: string;
  title: string;
  items: ReferenceItem[];
  expanded?: boolean;
}

interface ReferenceItem {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  copyable?: boolean;
  link?: string;
}

export const QuickReference: React.FC<QuickReferenceProps> = ({
  context,
  resources,
  favorites,
  recentlyUsed,
  onSelect,
  onToggleFavorite,
  trackUsage,
  searchQuery
}) => {
  const [expandedSections, setExpandedSections] = useState<string[]>(['key-stats']);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter resources to quick reference items
  const quickRefResources = resources.filter(r => r.type === 'quick-reference');

  // Group resources by category
  const groupedResources = quickRefResources.reduce((acc, resource) => {
    const category = resource.category || 'general';
    if (!acc[category]) {
      acc[category] = {
        id: category,
        title: category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' '),
        items: []
      };
    }
    acc[category].items.push(resource);
    return acc;
  }, {} as Record<string, ReferenceSection>);

  const sections = Object.values(groupedResources);

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      trackUsage(id, 'copy');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Handle item click
  const handleItemClick = (item: ReferenceItem) => {
    onSelect(item);
    trackUsage(item.id, 'view');
  };

  if (sections.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <Info className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No quick reference materials available</p>
        {context && (
          <p className="text-sm mt-2">
            Try searching or check other contexts
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Context-specific header */}
      {context && !searchQuery && (
        <div className="mb-4 p-3 bg-primary/10 rounded-lg">
          <h4 className="font-medium text-primary mb-1">
            {context.toUpperCase()} Quick Reference
          </h4>
          <p className="text-sm text-primary/80">
            Essential information and rules for {context} marketing
          </p>
        </div>
      )}

      {/* Reference sections */}
      {sections.map(section => (
        <motion.div
          key={section.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
        >
          {/* Section header */}
          <button
            onClick={() => toggleSection(section.id)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <h3 className="font-medium text-sm">{section.title}</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {section.items.length} items
              </span>
              {expandedSections.includes(section.id) ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          {/* Section content */}
          <AnimatePresence>
            {expandedSections.includes(section.id) && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 space-y-2">
                  {section.items.map(item => (
                    <div
                      key={item.id}
                      className="p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg hover:shadow-sm transition-shadow"
                    >
                      {/* Item header */}
                      <div className="flex items-start justify-between mb-2">
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => handleItemClick(item)}
                        >
                          <h4 className="font-medium text-sm mb-1">
                            {item.title}
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {item.tags.map(tag => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onToggleFavorite(item.id)}
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title={favorites.includes(item.id) ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <Star
                              className={cn(
                                "w-4 h-4",
                                favorites.includes(item.id)
                                  ? "text-yellow-500 fill-yellow-500"
                                  : "text-gray-400"
                              )}
                            />
                          </button>
                          {item.copyable && (
                            <button
                              onClick={() => copyToClipboard(item.content, item.id)}
                              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              title="Copy to clipboard"
                            >
                              <Copy
                                className={cn(
                                  "w-4 h-4",
                                  copiedId === item.id
                                    ? "text-green-500"
                                    : "text-gray-400"
                                )}
                              />
                            </button>
                          )}
                          {item.link && (
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              title="Open link"
                              onClick={(e) => {
                                e.stopPropagation();
                                trackUsage(item.id, 'link');
                              }}
                            >
                              <ExternalLink className="w-4 h-4 text-gray-400" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Item content */}
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {item.content}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}

      {/* Copied notification */}
      <AnimatePresence>
        {copiedId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-4 right-4 px-4 py-2 bg-green-500 text-white rounded-lg shadow-lg"
          >
            Copied to clipboard!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};