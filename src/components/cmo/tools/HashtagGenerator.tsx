import React, { useState } from 'react';
import { Hash, TrendingUp, Copy, RefreshCw, Filter, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/cn';

interface HashtagGeneratorProps {
  onResult?: (result: any) => void;
  initialData?: any;
  isFullscreen?: boolean;
}

interface GeneratedHashtags {
  trending: string[];
  relevant: string[];
  niche: string[];
  branded: string[];
  location: string[];
}

type Platform = 'instagram' | 'twitter' | 'linkedin' | 'tiktok' | 'all';
type HashtagType = keyof GeneratedHashtags;

// Mock trending hashtags data
const TRENDING_HASHTAGS: Record<Platform, string[]> = {
  instagram: ['#instagood', '#photooftheday', '#love', '#fashion', '#reels', '#explore', '#trending'],
  twitter: ['#trending', '#news', '#tech', '#business', '#innovation', '#startup'],
  linkedin: ['#leadership', '#innovation', '#careers', '#business', '#networking', '#growth'],
  tiktok: ['#fyp', '#foryou', '#viral', '#trending', '#challenge', '#duet'],
  all: ['#trending', '#viral', '#love', '#business', '#innovation']
};

export const HashtagGenerator: React.FC<HashtagGeneratorProps> = ({
  onResult,
  initialData,
  isFullscreen = false
}) => {
  const [topic, setTopic] = useState(initialData?.topic || '');
  const [platform, setPlatform] = useState<Platform>(initialData?.platform || 'all');
  const [hashtags, setHashtags] = useState<GeneratedHashtags | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<HashtagType[]>(['trending', 'relevant', 'niche']);
  const [copiedHashtags, setCopiedHashtags] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const generateHashtags = () => {
    if (!topic.trim()) return;

    setIsGenerating(true);

    setTimeout(() => {
      // Simulate hashtag generation
      const keywords = topic.toLowerCase().split(' ').filter(word => word.length > 3);
      
      // Generate different types of hashtags
      const generated: GeneratedHashtags = {
        trending: generateTrendingHashtags(platform, keywords),
        relevant: generateRelevantHashtags(keywords),
        niche: generateNicheHashtags(keywords),
        branded: generateBrandedHashtags(keywords),
        location: generateLocationHashtags(keywords)
      };

      setHashtags(generated);
      setIsGenerating(false);

      if (onResult) {
        onResult({
          topic,
          platform,
          hashtags: generated,
          timestamp: new Date().toISOString()
        });
      }
    }, 800);
  };

  const generateTrendingHashtags = (platform: Platform, keywords: string[]): string[] => {
    const trending = [...TRENDING_HASHTAGS[platform]];
    
    // Add keyword-related trending hashtags
    keywords.forEach(keyword => {
      if (keyword.includes('tech')) {
        trending.push('#technology', '#techtrends');
      } else if (keyword.includes('market')) {
        trending.push('#marketing', '#digitalmarketing');
      } else if (keyword.includes('design')) {
        trending.push('#design', '#creative');
      }
    });

    return [...new Set(trending)].slice(0, 10);
  };

  const generateRelevantHashtags = (keywords: string[]): string[] => {
    const relevant: string[] = [];
    
    keywords.forEach(keyword => {
      relevant.push(`#${keyword}`);
      
      // Add variations
      if (keyword.length > 5) {
        relevant.push(`#${keyword}tips`);
        relevant.push(`#${keyword}ideas`);
      }
    });

    // Add compound hashtags
    if (keywords.length > 1) {
      relevant.push(`#${keywords.join('')}`);
      relevant.push(`#${keywords.slice(0, 2).join('')}`);
    }

    return [...new Set(relevant)].slice(0, 15);
  };

  const generateNicheHashtags = (keywords: string[]): string[] => {
    const niche: string[] = [];
    
    keywords.forEach(keyword => {
      niche.push(`#${keyword}community`);
      niche.push(`#${keyword}lovers`);
      niche.push(`#${keyword}life`);
      niche.push(`#insta${keyword}`);
    });

    // Add specific niche combinations
    if (keywords.length > 0) {
      niche.push(`#${keywords[0]}${new Date().getFullYear()}`);
      niche.push(`#daily${keywords[0]}`);
      niche.push(`#my${keywords[0]}journey`);
    }

    return [...new Set(niche)].slice(0, 12);
  };

  const generateBrandedHashtags = (keywords: string[]): string[] => {
    const branded: string[] = [];
    
    if (keywords.length > 0) {
      const mainKeyword = keywords[0];
      branded.push(`#${mainKeyword}brand`);
      branded.push(`#${mainKeyword}style`);
      branded.push(`#${mainKeyword}vibes`);
      branded.push(`#team${mainKeyword}`);
      branded.push(`#${mainKeyword}family`);
    }

    return branded.slice(0, 8);
  };

  const generateLocationHashtags = (keywords: string[]): string[] => {
    // Simulate location-based hashtags
    const locations = [
      '#usa', '#newyork', '#london', '#tokyo', '#paris',
      '#california', '#texas', '#florida', '#canada', '#australia'
    ];
    
    return locations.slice(0, 5);
  };

  const copyHashtags = (type?: HashtagType) => {
    if (!hashtags) return;

    let tagsToCopy: string[] = [];
    
    if (type) {
      tagsToCopy = hashtags[type];
    } else {
      // Copy selected types
      selectedTypes.forEach(t => {
        tagsToCopy = [...tagsToCopy, ...hashtags[t]];
      });
    }

    const text = tagsToCopy.join(' ');
    navigator.clipboard.writeText(text);
    setCopiedHashtags(text);
    
    setTimeout(() => setCopiedHashtags(''), 2000);
  };

  const toggleType = (type: HashtagType) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const getHashtagCount = () => {
    if (!hashtags) return 0;
    return selectedTypes.reduce((acc, type) => acc + hashtags[type].length, 0);
  };

  const platforms: { value: Platform; label: string }[] = [
    { value: 'all', label: 'All Platforms' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'twitter', label: 'Twitter' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'tiktok', label: 'TikTok' }
  ];

  const hashtagCategories: { type: HashtagType; label: string; icon: React.ElementType; color: string }[] = [
    { type: 'trending', label: 'Trending', icon: TrendingUp, color: 'text-purple-600' },
    { type: 'relevant', label: 'Relevant', icon: Hash, color: 'text-blue-600' },
    { type: 'niche', label: 'Niche', icon: Sparkles, color: 'text-green-600' },
    { type: 'branded', label: 'Branded', icon: Hash, color: 'text-orange-600' },
    { type: 'location', label: 'Location', icon: Hash, color: 'text-red-600' }
  ];

  return (
    <div className={cn(
      "space-y-4",
      isFullscreen ? "max-w-4xl mx-auto" : ""
    )}>
      {/* Input Section */}
      <div className="space-y-3">
        <div>
          <label htmlFor="topic-input" className="block text-sm font-medium mb-2">
            Topic or Keywords
          </label>
          <input
            id="topic-input"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter your topic or keywords..."
            className={cn(
              "w-full px-4 py-2",
              "border border-gray-300 dark:border-gray-600 rounded-lg",
              "bg-white dark:bg-gray-800",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            )}
            onKeyPress={(e) => e.key === 'Enter' && generateHashtags()}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Platform</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {platforms.map(p => (
              <button
                key={p.value}
                onClick={() => setPlatform(p.value)}
                className={cn(
                  "px-3 py-2 text-sm rounded-lg transition-all",
                  "border border-gray-200 dark:border-gray-700",
                  platform === p.value
                    ? "bg-primary text-white border-primary"
                    : "bg-white dark:bg-gray-800 hover:border-primary"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={generateHashtags}
          disabled={!topic.trim() || isGenerating}
          className={cn(
            "w-full px-4 py-2 rounded-lg font-medium transition-all",
            "bg-primary text-white hover:bg-primary/90",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "flex items-center justify-center gap-2"
          )}
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Hash className="w-4 h-4" />
              Generate Hashtags
            </>
          )}
        </button>
      </div>

      {/* Results Section */}
      <AnimatePresence>
        {hashtags && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Filter and Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Filter Categories:
                </span>
              </div>
              <button
                onClick={() => copyHashtags()}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-lg transition-all",
                  "bg-primary text-white hover:bg-primary/90",
                  "flex items-center gap-2"
                )}
              >
                <Copy className="w-3 h-3" />
                Copy Selected ({getHashtagCount()})
              </button>
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
              {hashtagCategories.map(cat => (
                <button
                  key={cat.type}
                  onClick={() => toggleType(cat.type)}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-full transition-all",
                    "border flex items-center gap-1",
                    selectedTypes.includes(cat.type)
                      ? "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                      : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 opacity-60"
                  )}
                >
                  <cat.icon className={cn("w-3 h-3", cat.color)} />
                  {cat.label}
                  <span className="text-xs text-gray-500">
                    ({hashtags[cat.type].length})
                  </span>
                </button>
              ))}
            </div>

            {/* Hashtag Categories */}
            <div className="space-y-4">
              {hashtagCategories.map(cat => {
                if (!selectedTypes.includes(cat.type) || hashtags[cat.type].length === 0) {
                  return null;
                }

                return (
                  <div key={cat.type} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className={cn("font-medium text-sm flex items-center gap-2", cat.color)}>
                        <cat.icon className="w-4 h-4" />
                        {cat.label} Hashtags
                      </h4>
                      <button
                        onClick={() => copyHashtags(cat.type)}
                        className="text-xs text-gray-500 hover:text-primary transition-colors"
                      >
                        Copy these
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {hashtags[cat.type].map((tag, idx) => (
                        <motion.span
                          key={`${cat.type}-${idx}`}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          className={cn(
                            "px-3 py-1.5 text-sm rounded-full cursor-pointer",
                            "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700",
                            "transition-all"
                          )}
                          onClick={() => {
                            navigator.clipboard.writeText(tag);
                            setCopiedHashtags(tag);
                            setTimeout(() => setCopiedHashtags(''), 1000);
                          }}
                        >
                          {tag}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tips */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Hashtag Best Practices</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-blue-700 dark:text-blue-300">
                <div>• Instagram: 5-10 hashtags</div>
                <div>• Twitter: 1-2 hashtags</div>
                <div>• LinkedIn: 3-5 hashtags</div>
                <div>• TikTok: 3-5 hashtags</div>
              </div>
            </div>

            {/* Copied Notification */}
            <AnimatePresence>
              {copiedHashtags && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="fixed bottom-4 right-4 px-4 py-2 bg-green-500 text-white rounded-lg shadow-lg"
                >
                  Copied: {copiedHashtags.substring(0, 30)}...
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};