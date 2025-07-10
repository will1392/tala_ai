import { useState } from 'react';
import { MapPin, Building, Archive, Sparkles, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

interface VoiceCategorySelectorProps {
  onCategorySelect: (category: Category | null) => void;
  suggestedCategory?: Category | null;
  voiceContent: string;
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

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'MapPin': return MapPin;
    case 'Building': return Building;
    case 'Archive': return Archive;
    default: return Archive;
  }
};

export const VoiceCategorySelector = ({ 
  onCategorySelect, 
  suggestedCategory, 
  voiceContent 
}: VoiceCategorySelectorProps) => {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(suggestedCategory || null);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setShowDropdown(false);
    onCategorySelect(category);
  };

  const handleUseAI = () => {
    // This will trigger smart categorization
    onCategorySelect(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-white">Categorize Voice Input</h4>
        <button
          onClick={handleUseAI}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-primary/20 text-primary rounded-md hover:bg-primary/30 transition-colors"
        >
          <Sparkles size={12} />
          Auto-detect
        </button>
      </div>

      {/* Voice Content Preview */}
      <div className="p-2 bg-white/5 rounded-md border border-white/10">
        <p className="text-xs text-white/60 mb-1">Voice content:</p>
        <p className="text-sm text-white/80 line-clamp-2">
          {voiceContent.length > 100 ? `${voiceContent.substring(0, 100)}...` : voiceContent}
        </p>
      </div>

      {/* Suggested Category */}
      {suggestedCategory && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-primary/10 border border-primary/20 rounded-lg"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-primary" />
            <span className="text-xs font-medium text-primary">AI Suggestion</span>
          </div>
          <button
            onClick={() => handleCategorySelect(suggestedCategory)}
            className="w-full flex items-center gap-3 p-2 bg-white/5 rounded-md hover:bg-white/10 transition-colors"
          >
            {(() => {
              const IconComponent = getIcon(suggestedCategory.icon);
              return <IconComponent size={16} style={{ color: suggestedCategory.color }} />;
            })()}
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-white">{suggestedCategory.name}</div>
              <div className="text-xs text-white/60">{suggestedCategory.description}</div>
            </div>
          </button>
        </motion.div>
      )}

      {/* Category Selector */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={cn(
            "w-full flex items-center justify-between p-3 rounded-lg border transition-colors",
            selectedCategory 
              ? "bg-white/5 border-white/20 text-white" 
              : "bg-white/5 border-white/10 text-white/60 hover:border-white/20"
          )}
        >
          {selectedCategory ? (
            <div className="flex items-center gap-3">
              {(() => {
                const IconComponent = getIcon(selectedCategory.icon);
                return <IconComponent size={16} style={{ color: selectedCategory.color }} />;
              })()}
              <span className="text-sm font-medium">{selectedCategory.name}</span>
            </div>
          ) : (
            <span className="text-sm">Select a category...</span>
          )}
          <ChevronDown 
            size={16} 
            className={cn(
              "transition-transform",
              showDropdown && "rotate-180"
            )} 
          />
        </button>

        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-white/20 rounded-lg shadow-lg z-10"
            >
              {CATEGORIES.map((category) => {
                const IconComponent = getIcon(category.icon);
                return (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(category)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 text-left hover:bg-white/10 transition-colors first:rounded-t-lg last:rounded-b-lg",
                      selectedCategory?.id === category.id && "bg-white/5"
                    )}
                  >
                    <IconComponent size={16} style={{ color: category.color }} />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{category.name}</div>
                      <div className="text-xs text-white/60">{category.description}</div>
                    </div>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};