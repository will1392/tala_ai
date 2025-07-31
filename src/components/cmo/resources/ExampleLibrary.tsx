import React, { useState } from 'react';
import { Lightbulb, Star, Eye, Copy, Filter, TrendingUp, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/cn';

interface ExampleLibraryProps {
  context: string | null;
  resources: any[];
  favorites: string[];
  recentlyUsed: any[];
  onSelect: (resource: any) => void;
  onToggleFavorite: (resourceId: string) => void;
  trackUsage: (resourceId: string, action: string) => void;
  searchQuery?: string;
}

interface Example {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  metrics?: {
    performance?: string;
    engagement?: string;
    conversion?: string;
  };
  industry?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  imageUrl?: string;
}

type FilterType = 'all' | 'high-performing' | 'industry' | 'difficulty';

export const ExampleLibrary: React.FC<ExampleLibraryProps> = ({
  context,
  resources,
  favorites,
  recentlyUsed,
  onSelect,
  onToggleFavorite,
  trackUsage,
  searchQuery
}) => {
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [expandedExample, setExpandedExample] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter resources to examples
  const examples = resources.filter(r => r.type === 'example') as Example[];

  // Get unique industries and difficulties
  const industries = ['all', ...new Set(examples.map(e => e.industry).filter(Boolean))];
  const difficulties = ['all', 'beginner', 'intermediate', 'advanced'];

  // Apply filters
  let filteredExamples = examples;

  if (selectedFilter === 'high-performing') {
    filteredExamples = filteredExamples.filter(e => 
      e.metrics && (
        parseInt(e.metrics.performance || '0') > 80 ||
        parseInt(e.metrics.engagement || '0') > 70 ||
        parseInt(e.metrics.conversion || '0') > 30
      )
    );
  }

  if (selectedIndustry !== 'all') {
    filteredExamples = filteredExamples.filter(e => e.industry === selectedIndustry);
  }

  if (selectedDifficulty !== 'all') {
    filteredExamples = filteredExamples.filter(e => e.difficulty === selectedDifficulty);
  }

  // Sort by performance
  filteredExamples.sort((a, b) => {
    const aScore = parseInt(a.metrics?.performance || '0');
    const bScore = parseInt(b.metrics?.performance || '0');
    return bScore - aScore;
  });

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

  // Handle example click
  const handleExampleClick = (example: Example) => {
    if (expandedExample === example.id) {
      setExpandedExample(null);
    } else {
      setExpandedExample(example.id);
      trackUsage(example.id, 'view');
      onSelect(example);
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
      case 'advanced': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800';
    }
  };

  if (examples.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No examples available</p>
        {context && (
          <p className="text-sm mt-2">
            Examples for {context} will be added soon
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Filters */}
      <div className="space-y-3">
        {/* Filter type buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedFilter('all')}
            className={cn(
              "px-3 py-1.5 text-sm rounded-lg transition-all",
              selectedFilter === 'all'
                ? "bg-primary text-white"
                : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
            )}
          >
            All Examples
          </button>
          <button
            onClick={() => setSelectedFilter('high-performing')}
            className={cn(
              "px-3 py-1.5 text-sm rounded-lg transition-all flex items-center gap-1",
              selectedFilter === 'high-performing'
                ? "bg-primary text-white"
                : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
            )}
          >
            <TrendingUp className="w-3 h-3" />
            High Performing
          </button>
        </div>

        {/* Industry and difficulty filters */}
        <div className="grid grid-cols-2 gap-2">
          <select
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value)}
            className={cn(
              "px-3 py-2 text-sm rounded-lg",
              "border border-gray-300 dark:border-gray-600",
              "bg-white dark:bg-gray-800",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            )}
          >
            {industries.map(industry => (
              <option key={industry} value={industry}>
                {industry === 'all' ? 'All Industries' : industry}
              </option>
            ))}
          </select>

          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className={cn(
              "px-3 py-2 text-sm rounded-lg",
              "border border-gray-300 dark:border-gray-600",
              "bg-white dark:bg-gray-800",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            )}
          >
            {difficulties.map(difficulty => (
              <option key={difficulty} value={difficulty}>
                {difficulty === 'all' ? 'All Levels' : difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Examples list */}
      <div className="space-y-3">
        {filteredExamples.map((example) => (
          <motion.div
            key={example.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* Example header */}
            <div
              className="p-4 cursor-pointer"
              onClick={() => handleExampleClick(example)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-medium mb-1">{example.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {example.description}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(example.id);
                    }}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Star
                      className={cn(
                        "w-4 h-4",
                        favorites.includes(example.id)
                          ? "text-yellow-500 fill-yellow-500"
                          : "text-gray-400"
                      )}
                    />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(example.content, example.id);
                    }}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Copy
                      className={cn(
                        "w-4 h-4",
                        copiedId === example.id
                          ? "text-green-500"
                          : "text-gray-400"
                      )}
                    />
                  </button>
                </div>
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {example.difficulty && (
                  <span className={cn(
                    "px-2 py-0.5 text-xs rounded-full",
                    getDifficultyColor(example.difficulty)
                  )}>
                    {example.difficulty}
                  </span>
                )}
                {example.industry && (
                  <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 rounded-full">
                    {example.industry}
                  </span>
                )}
                {example.tags.slice(0, 2).map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Metrics */}
              {example.metrics && (
                <div className="flex items-center gap-4 mt-3 text-sm">
                  {example.metrics.performance && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {example.metrics.performance}% performance
                      </span>
                    </div>
                  )}
                  {example.metrics.engagement && (
                    <div className="flex items-center gap-1">
                      <Award className="w-3 h-3 text-blue-500" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {example.metrics.engagement}% engagement
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Expanded content */}
            <AnimatePresence>
              {expandedExample === example.id && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
                    {example.imageUrl && (
                      <img
                        src={example.imageUrl}
                        alt={example.title}
                        className="w-full h-48 object-cover rounded-lg mt-3 mb-3"
                      />
                    )}
                    <div className="prose dark:prose-invert max-w-none">
                      <pre className="whitespace-pre-wrap text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                        {example.content}
                      </pre>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* No results */}
      {filteredExamples.length === 0 && (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          <Filter className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No examples match your filters</p>
          <button
            onClick={() => {
              setSelectedFilter('all');
              setSelectedIndustry('all');
              setSelectedDifficulty('all');
            }}
            className="mt-3 text-sm text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Copied notification */}
      <AnimatePresence>
        {copiedId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-4 right-4 px-4 py-2 bg-green-500 text-white rounded-lg shadow-lg"
          >
            Example copied to clipboard!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};