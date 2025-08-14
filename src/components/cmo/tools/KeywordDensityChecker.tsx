import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, AlertTriangle, CheckCircle, Info, Hash, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/cn';

interface KeywordDensityCheckerProps {
  onResult?: (result: any) => void;
  initialData?: any;
  isFullscreen?: boolean;
}

interface KeywordAnalysis {
  keyword: string;
  count: number;
  density: number;
  prominence: number;
  positions: number[];
}

interface DensityAnalysis {
  text: string;
  totalWords: number;
  uniqueWords: number;
  keywords: KeywordAnalysis[];
  topKeywords: KeywordAnalysis[];
  targetKeywords: KeywordAnalysis[];
  readabilityScore: number;
  seoScore: number;
  issues: string[];
  suggestions: string[];
}

const STOP_WORDS = [
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
  'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go',
  'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
  'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them',
  'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over',
  'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work',
  'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these',
  'give', 'day', 'most', 'us', 'is', 'was', 'are', 'been', 'has', 'had',
  'were', 'said', 'did', 'get', 'may', 'am', 'de', 'en', 'un', 'une'
];

export const KeywordDensityChecker: React.FC<KeywordDensityCheckerProps> = ({
  onResult,
  initialData,
  isFullscreen = false
}) => {
  const [text, setText] = useState(initialData?.text || '');
  const [targetKeywords, setTargetKeywords] = useState<string[]>(
    initialData?.targetKeywords || []
  );
  const [keywordInput, setKeywordInput] = useState('');
  const [analysis, setAnalysis] = useState<DensityAnalysis | null>(null);
  const [showStopWords, setShowStopWords] = useState(false);
  const [minWordLength, setMinWordLength] = useState(3);

  // Analyze keyword density
  const analyzeKeywords = () => {
    if (!text.trim()) {
      setAnalysis(null);
      return;
    }

    // Tokenize and clean text
    const words = text.toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
    
    const totalWords = words.length;
    
    // Count word frequency
    const wordFrequency: Record<string, number> = {};
    const wordPositions: Record<string, number[]> = {};
    
    words.forEach((word, index) => {
      if (!showStopWords && STOP_WORDS.includes(word)) return;
      if (word.length < minWordLength) return;
      
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
      if (!wordPositions[word]) wordPositions[word] = [];
      wordPositions[word].push(index);
    });
    
    // Calculate keyword analysis
    const keywords: KeywordAnalysis[] = Object.entries(wordFrequency)
      .map(([keyword, count]) => {
        const density = (count / totalWords) * 100;
        const positions = wordPositions[keyword];
        
        // Calculate prominence (how early the keyword appears)
        const firstPosition = positions[0];
        const prominence = 100 - (firstPosition / totalWords) * 100;
        
        return {
          keyword,
          count,
          density,
          prominence,
          positions
        };
      })
      .sort((a, b) => b.count - a.count);
    
    // Get top keywords
    const topKeywords = keywords.slice(0, 10);
    
    // Analyze target keywords
    const targetKeywordAnalysis = targetKeywords.map(keyword => {
      const lowerKeyword = keyword.toLowerCase();
      const regex = new RegExp(`\\b${lowerKeyword}\\b`, 'gi');
      const matches = text.match(regex) || [];
      const count = matches.length;
      const density = (count / totalWords) * 100;
      
      // Find positions
      const positions: number[] = [];
      let wordIndex = 0;
      words.forEach((word, index) => {
        if (word === lowerKeyword) {
          positions.push(index);
        }
      });
      
      const prominence = positions.length > 0 
        ? 100 - (positions[0] / totalWords) * 100 
        : 0;
      
      return {
        keyword,
        count,
        density,
        prominence,
        positions
      };
    });
    
    // Calculate scores and generate feedback
    const { seoScore, readabilityScore, issues, suggestions } = calculateScores(
      text,
      totalWords,
      keywords,
      targetKeywordAnalysis
    );
    
    const result: DensityAnalysis = {
      text,
      totalWords,
      uniqueWords: Object.keys(wordFrequency).length,
      keywords,
      topKeywords,
      targetKeywords: targetKeywordAnalysis,
      readabilityScore,
      seoScore,
      issues,
      suggestions
    };
    
    setAnalysis(result);
    
    if (onResult) {
      onResult({
        text,
        analysis: result,
        targetKeywords,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Calculate SEO and readability scores
  const calculateScores = (
    text: string,
    totalWords: number,
    keywords: KeywordAnalysis[],
    targetKeywords: KeywordAnalysis[]
  ) => {
    let seoScore = 100;
    let readabilityScore = 100;
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    // Check keyword density for target keywords
    targetKeywords.forEach(kw => {
      if (kw.count === 0) {
        issues.push(`Target keyword "${kw.keyword}" not found in text`);
        seoScore -= 15;
      } else if (kw.density < 0.5) {
        issues.push(`Target keyword "${kw.keyword}" density too low (${kw.density.toFixed(2)}%)`);
        suggestions.push(`Increase usage of "${kw.keyword}" to 1-2% density`);
        seoScore -= 10;
      } else if (kw.density > 3) {
        issues.push(`Target keyword "${kw.keyword}" density too high (${kw.density.toFixed(2)}%)`);
        suggestions.push(`Reduce usage of "${kw.keyword}" to avoid keyword stuffing`);
        seoScore -= 20;
      } else {
        // Good density
        seoScore += 5;
      }
      
      // Check prominence
      if (kw.prominence < 50 && kw.count > 0) {
        suggestions.push(`Move "${kw.keyword}" closer to the beginning for better SEO`);
        seoScore -= 5;
      }
    });
    
    // Check for keyword stuffing in top keywords
    const suspiciousKeywords = keywords.filter(kw => 
      kw.density > 4 && kw.keyword.length > 3
    );
    
    if (suspiciousKeywords.length > 0) {
      issues.push('Potential keyword stuffing detected');
      suspiciousKeywords.forEach(kw => {
        issues.push(`"${kw.keyword}" appears too frequently (${kw.density.toFixed(2)}%)`);
      });
      seoScore -= suspiciousKeywords.length * 5;
    }
    
    // Readability checks
    const avgWordLength = text.replace(/\s+/g, '').length / totalWords;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgWordsPerSentence = totalWords / sentences.length;
    
    if (avgWordsPerSentence > 25) {
      issues.push('Sentences are too long on average');
      suggestions.push('Break up long sentences for better readability');
      readabilityScore -= 15;
    }
    
    if (avgWordLength > 6) {
      suggestions.push('Consider using simpler words for better readability');
      readabilityScore -= 10;
    }
    
    // Keyword variety
    const keywordVariety = keywords.length / totalWords;
    if (keywordVariety < 0.3) {
      suggestions.push('Increase vocabulary variety for better engagement');
      readabilityScore -= 10;
    }
    
    // Ensure scores are within bounds
    seoScore = Math.max(0, Math.min(100, seoScore));
    readabilityScore = Math.max(0, Math.min(100, readabilityScore));
    
    return { seoScore, readabilityScore, issues, suggestions };
  };

  // Add target keyword
  const addTargetKeyword = () => {
    if (keywordInput.trim() && !targetKeywords.includes(keywordInput.trim())) {
      setTargetKeywords([...targetKeywords, keywordInput.trim()]);
      setKeywordInput('');
    }
  };

  // Remove target keyword
  const removeTargetKeyword = (keyword: string) => {
    setTargetKeywords(targetKeywords.filter(k => k !== keyword));
  };

  // Auto-analyze on change
  useEffect(() => {
    const timer = setTimeout(() => {
      analyzeKeywords();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [text, targetKeywords, showStopWords, minWordLength]);

  // Get density color
  const getDensityColor = (density: number) => {
    if (density < 0.5) return 'text-yellow-600 dark:text-yellow-400';
    if (density > 3) return 'text-red-600 dark:text-red-400';
    return 'text-green-600 dark:text-green-400';
  };

  return (
    <div className={cn(
      "space-y-4",
      isFullscreen ? "max-w-4xl mx-auto" : ""
    )}>
      {/* Text Input */}
      <div>
        <label htmlFor="density-text" className="block text-sm font-medium mb-2">
          Content to Analyze
        </label>
        <textarea
          id="density-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your content here..."
          className={cn(
            "w-full px-4 py-3",
            "border border-gray-300 dark:border-gray-600 rounded-lg",
            "bg-white dark:bg-gray-800",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
            "resize-none"
          )}
          rows={6}
        />
      </div>

      {/* Target Keywords */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Target Keywords
        </label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTargetKeyword()}
            placeholder="Add target keyword..."
            className={cn(
              "flex-1 px-3 py-2",
              "border border-gray-300 dark:border-gray-600 rounded-lg",
              "bg-white dark:bg-gray-800",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            )}
          />
          <button
            onClick={addTargetKeyword}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Add
          </button>
        </div>
        
        {targetKeywords.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {targetKeywords.map(keyword => (
              <span
                key={keyword}
                className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
              >
                {keyword}
                <button
                  onClick={() => removeTargetKeyword(keyword)}
                  className="text-primary/60 hover:text-primary"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Filter Options */}
      <div className="flex items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showStopWords}
            onChange={(e) => setShowStopWords(e.target.checked)}
            className="rounded"
          />
          Include stop words
        </label>
        <label className="flex items-center gap-2">
          Min word length:
          <input
            type="number"
            value={minWordLength}
            onChange={(e) => setMinWordLength(Number(e.target.value))}
            min="1"
            max="10"
            className="w-12 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded"
          />
        </label>
      </div>

      {/* Analysis Results */}
      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Scores */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">SEO Score</span>
                  <Search className="w-4 h-4 text-gray-400" />
                </div>
                <div className={cn(
                  "text-2xl font-bold",
                  analysis.seoScore >= 80 ? 'text-green-600' : 
                  analysis.seoScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                )}>
                  {analysis.seoScore}%
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Readability</span>
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                </div>
                <div className={cn(
                  "text-2xl font-bold",
                  analysis.readabilityScore >= 80 ? 'text-green-600' : 
                  analysis.readabilityScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                )}>
                  {analysis.readabilityScore}%
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-blue-600 dark:text-blue-400 font-medium">
                    {analysis.totalWords}
                  </div>
                  <div className="text-blue-700 dark:text-blue-300">Total Words</div>
                </div>
                <div>
                  <div className="text-blue-600 dark:text-blue-400 font-medium">
                    {analysis.uniqueWords}
                  </div>
                  <div className="text-blue-700 dark:text-blue-300">Unique Words</div>
                </div>
                <div>
                  <div className="text-blue-600 dark:text-blue-400 font-medium">
                    {((analysis.uniqueWords / analysis.totalWords) * 100).toFixed(1)}%
                  </div>
                  <div className="text-blue-700 dark:text-blue-300">Vocabulary Ratio</div>
                </div>
                <div>
                  <div className="text-blue-600 dark:text-blue-400 font-medium">
                    {analysis.targetKeywords.filter(k => k.count > 0).length}/{targetKeywords.length}
                  </div>
                  <div className="text-blue-700 dark:text-blue-300">Keywords Found</div>
                </div>
              </div>
            </div>

            {/* Target Keywords Analysis */}
            {analysis.targetKeywords.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Target Keywords Analysis
                </h4>
                <div className="space-y-2">
                  {analysis.targetKeywords.map((kw, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{kw.keyword}</span>
                        <div className="flex items-center gap-4 text-sm">
                          <span>
                            Count: <span className="font-medium">{kw.count}</span>
                          </span>
                          <span className={getDensityColor(kw.density)}>
                            Density: <span className="font-medium">{kw.density.toFixed(2)}%</span>
                          </span>
                          <span className="text-gray-500">
                            Prominence: {kw.prominence.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      {kw.count === 0 && (
                        <div className="text-sm text-red-600 dark:text-red-400">
                          <AlertTriangle className="w-4 h-4 inline mr-1" />
                          Not found in text
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Keywords */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Top Keywords (Most Frequent)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {analysis.topKeywords.map((kw, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                  >
                    <span className="text-sm">{kw.keyword}</span>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-500">{kw.count}x</span>
                      <span className={getDensityColor(kw.density)}>
                        {kw.density.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Issues & Suggestions */}
            {(analysis.issues.length > 0 || analysis.suggestions.length > 0) && (
              <div className="space-y-3">
                {analysis.issues.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-red-600 dark:text-red-400 mb-2">
                      Issues Found
                    </h4>
                    {analysis.issues.map((issue, idx) => (
                      <div key={idx} className="p-3 bg-red-50 dark:bg-red-900/20 rounded text-sm">
                        {issue}
                      </div>
                    ))}
                  </div>
                )}
                
                {analysis.suggestions.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-blue-600 dark:text-blue-400 mb-2">
                      Suggestions
                    </h4>
                    {analysis.suggestions.map((suggestion, idx) => (
                      <div key={idx} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SEO Tips */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Keyword Density Best Practices
              </h4>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>• Target keyword density: 1-2%</li>
                <li>• Place primary keyword in first 100 words</li>
                <li>• Use keyword variations and synonyms</li>
                <li>• Avoid keyword stuffing (&gt;3% density)</li>
                <li>• Focus on natural, readable content</li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};