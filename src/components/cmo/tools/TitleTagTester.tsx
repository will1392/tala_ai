import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, Copy, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../../utils/cn';

interface TitleTagTesterProps {
  onResult?: (result: any) => void;
  initialData?: any;
  isFullscreen?: boolean;
}

interface TitleAnalysis {
  length: number;
  pixelWidth: number;
  status: 'good' | 'warning' | 'error';
  issues: string[];
  suggestions: string[];
  preview: {
    desktop: string;
    mobile: string;
  };
  score: number;
}

export const TitleTagTester: React.FC<TitleTagTesterProps> = ({
  onResult,
  initialData,
  isFullscreen = false
}) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [analysis, setAnalysis] = useState<TitleAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Character limits
  const OPTIMAL_MIN = 30;
  const OPTIMAL_MAX = 60;
  const MOBILE_MAX = 50;
  const PIXEL_MAX = 600;

  // Analyze title
  const analyzeTitle = () => {
    if (!title.trim()) {
      setAnalysis(null);
      return;
    }

    setIsAnalyzing(true);
    
    // Simulate analysis delay
    setTimeout(() => {
      const length = title.length;
      const pixelWidth = calculatePixelWidth(title);
      const issues: string[] = [];
      const suggestions: string[] = [];
      let score = 100;

      // Length analysis
      if (length < OPTIMAL_MIN) {
        issues.push(`Title is too short (${length} characters). Aim for ${OPTIMAL_MIN}-${OPTIMAL_MAX}.`);
        suggestions.push('Add more descriptive keywords to improve SEO value.');
        score -= 20;
      } else if (length > OPTIMAL_MAX) {
        issues.push(`Title may be truncated in search results (${length} characters).`);
        suggestions.push(`Shorten to under ${OPTIMAL_MAX} characters for full visibility.`);
        score -= 10;
      }

      // Mobile optimization
      if (length > MOBILE_MAX) {
        issues.push(`Title will be cut off on mobile devices (>${MOBILE_MAX} characters).`);
        score -= 10;
      }

      // Pixel width check
      if (pixelWidth > PIXEL_MAX) {
        issues.push(`Title is too wide (${pixelWidth}px). May be truncated.`);
        score -= 10;
      }

      // Keyword placement
      if (!hasKeywordAtStart(title)) {
        suggestions.push('Consider placing your main keyword at the beginning.');
        score -= 5;
      }

      // Special characters
      if (hasExcessiveSpecialChars(title)) {
        issues.push('Too many special characters may reduce readability.');
        score -= 5;
      }

      // Branding
      if (!hasBrandSeparator(title)) {
        suggestions.push('Consider adding your brand name with a separator (| or -).');
      }

      // All caps check
      if (hasExcessiveCaps(title)) {
        issues.push('Avoid excessive capitalization - it can appear spammy.');
        score -= 10;
      }

      const status = score >= 80 ? 'good' : score >= 60 ? 'warning' : 'error';

      const result: TitleAnalysis = {
        length,
        pixelWidth,
        status,
        issues,
        suggestions,
        preview: {
          desktop: truncateTitle(title, OPTIMAL_MAX),
          mobile: truncateTitle(title, MOBILE_MAX)
        },
        score: Math.max(0, score)
      };

      setAnalysis(result);
      setIsAnalyzing(false);

      if (onResult) {
        onResult({
          title,
          analysis: result,
          timestamp: new Date().toISOString()
        });
      }
    }, 300);
  };

  // Auto-analyze on title change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (title) {
        analyzeTitle();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [title]);

  // Helper functions
  const calculatePixelWidth = (text: string): number => {
    // Approximate pixel width calculation
    const avgCharWidth = 8.5;
    return Math.round(text.length * avgCharWidth);
  };

  const truncateTitle = (text: string, maxChars: number): string => {
    if (text.length <= maxChars) return text;
    return text.substring(0, maxChars - 3) + '...';
  };

  const hasKeywordAtStart = (text: string): boolean => {
    // Simple check - in real implementation, would check actual target keywords
    const firstWords = text.split(' ').slice(0, 3).join(' ').toLowerCase();
    return firstWords.length > 10; // Has substantial content at start
  };

  const hasExcessiveSpecialChars = (text: string): boolean => {
    const specialChars = text.match(/[!@#$%^&*()_+=[\]{};':"\\|,.<>/?]/g);
    return specialChars ? specialChars.length > 3 : false;
  };

  const hasBrandSeparator = (text: string): boolean => {
    return text.includes(' | ') || text.includes(' - ');
  };

  const hasExcessiveCaps = (text: string): boolean => {
    const capsCount = (text.match(/[A-Z]/g) || []).length;
    return capsCount / text.length > 0.5;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(title);
  };

  const getStatusIcon = () => {
    if (!analysis) return null;
    
    switch (analysis.status) {
      case 'good':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    if (!analysis) return '';
    
    switch (analysis.status) {
      case 'good':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
    }
  };

  return (
    <div className={cn(
      "space-y-4",
      isFullscreen ? "max-w-2xl mx-auto" : ""
    )}>
      <div>
        <label htmlFor="title-input" className="block text-sm font-medium mb-2">
          Enter Title Tag
        </label>
        <div className="relative">
          <input
            id="title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter your page title..."
            className={cn(
              "w-full px-4 py-2 pr-24",
              "border border-gray-300 dark:border-gray-600 rounded-lg",
              "bg-white dark:bg-gray-800",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
              "placeholder-gray-400 dark:placeholder-gray-500"
            )}
            maxLength={100}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button
              onClick={copyToClipboard}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Copy to clipboard"
            >
              <Copy className="w-4 h-4 text-gray-500" />
            </button>
            <span className={cn(
              "text-sm font-mono",
              title.length > OPTIMAL_MAX ? 'text-red-500' : 'text-gray-500'
            )}>
              {title.length}/60
            </span>
          </div>
        </div>
      </div>

      {/* Analysis Results */}
      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Score */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon()}
                <div>
                  <div className="font-medium">SEO Score</div>
                  <div className={cn("text-sm", getStatusColor())}>
                    {analysis.score}% - {analysis.status.charAt(0).toUpperCase() + analysis.status.slice(1)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Pixel Width</div>
                <div className="font-mono">{analysis.pixelWidth}px</div>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Search Result Preview</h4>
              
              {/* Desktop Preview */}
              <div className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded">
                <div className="text-xs text-gray-500 mb-1">Desktop</div>
                <div className="text-blue-600 dark:text-blue-400 font-medium">
                  {analysis.preview.desktop}
                </div>
                <div className="text-green-700 dark:text-green-500 text-sm mt-1">
                  www.example.com › page-url
                </div>
              </div>

              {/* Mobile Preview */}
              <div className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded">
                <div className="text-xs text-gray-500 mb-1">Mobile</div>
                <div className="text-blue-600 dark:text-blue-400 font-medium text-sm">
                  {analysis.preview.mobile}
                </div>
                <div className="text-green-700 dark:text-green-500 text-xs mt-1">
                  www.example.com
                </div>
              </div>
            </div>

            {/* Issues */}
            {analysis.issues.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                  Issues Found
                </h4>
                {analysis.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm"
                  >
                    {issue}
                  </div>
                ))}
              </div>
            )}

            {/* Suggestions */}
            {analysis.suggestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-500" />
                  Suggestions
                </h4>
                {analysis.suggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm"
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}

            {/* Best Practices */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Title Tag Best Practices</h4>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>• Keep titles between 30-60 characters</li>
                <li>• Place important keywords at the beginning</li>
                <li>• Include your brand name with a separator</li>
                <li>• Make each title unique and descriptive</li>
                <li>• Avoid keyword stuffing</li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};