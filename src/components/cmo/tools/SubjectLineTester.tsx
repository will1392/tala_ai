import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, TrendingUp, Smartphone, Monitor, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/cn';

interface SubjectLineTesterProps {
  onResult?: (result: any) => void;
  initialData?: any;
  isFullscreen?: boolean;
}

interface SubjectLineAnalysis {
  text: string;
  length: number;
  score: number;
  spamScore: number;
  openRatePrediction: string;
  issues: string[];
  strengths: string[];
  preview: {
    desktop: string;
    mobile: string;
  };
  elements: {
    hasEmoji: boolean;
    hasPersonalization: boolean;
    hasUrgency: boolean;
    hasQuestion: boolean;
    hasNumber: boolean;
    hasPowerWord: boolean;
  };
}

const SPAM_WORDS = [
  'free', 'guarantee', 'no obligation', 'risk-free', 'act now', 'apply now',
  'buy now', 'click here', 'clearance', 'congratulations', 'dear friend',
  'for instant access', 'great offer', 'order now', 'promise you', 'special promotion',
  'this is not spam', 'unlimited', 'urgent', 'weight loss', 'winner', '100%',
  'amazing', 'cash', 'cheap', 'compare', 'discount', 'earn $', 'extra income',
  'f r e e', 'fast cash', 'financial freedom', 'hot', 'incredible', 'money',
  'no cost', 'no fees', 'online biz', 'online degree', 'opportunity',
  'prize', 'profits', 'refinance', 'save $', 'save big', 'save up to',
  'serious cash', 'subject to credit', 'unsecured', 'work from home'
];

const POWER_WORDS = [
  'exclusive', 'limited', 'new', 'proven', 'easy', 'discover', 'secret',
  'instantly', 'now', 'announcing', 'introducing', 'improvement', 'revolutionary',
  'breakthrough', 'how to', 'quick', 'simple', 'powerful', 'real', 'special'
];

export const SubjectLineTester: React.FC<SubjectLineTesterProps> = ({
  onResult,
  initialData,
  isFullscreen = false
}) => {
  const [subjectLine, setSubjectLine] = useState(initialData?.subjectLine || '');
  const [analysis, setAnalysis] = useState<SubjectLineAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeSubjectLine = () => {
    if (!subjectLine.trim()) {
      setAnalysis(null);
      return;
    }

    setIsAnalyzing(true);

    setTimeout(() => {
      const text = subjectLine.trim();
      const length = text.length;
      const lowerText = text.toLowerCase();
      
      let score = 100;
      let spamScore = 0;
      const issues: string[] = [];
      const strengths: string[] = [];

      // Length analysis
      if (length < 20) {
        issues.push('Subject line is too short. Aim for 30-50 characters.');
        score -= 15;
      } else if (length > 60) {
        issues.push('Subject line is too long. It will be cut off on mobile devices.');
        score -= 20;
      } else if (length >= 30 && length <= 50) {
        strengths.push('Perfect length for both desktop and mobile.');
        score += 5;
      }

      // Spam word check
      const foundSpamWords = SPAM_WORDS.filter(word => 
        lowerText.includes(word.toLowerCase())
      );
      
      if (foundSpamWords.length > 0) {
        spamScore += foundSpamWords.length * 15;
        issues.push(`Contains spam trigger words: ${foundSpamWords.join(', ')}`);
        score -= foundSpamWords.length * 10;
      }

      // Check for ALL CAPS
      const capsWords = text.split(' ').filter(word => 
        word.length > 2 && word === word.toUpperCase()
      );
      if (capsWords.length > 1) {
        spamScore += 20;
        issues.push('Excessive use of ALL CAPS can trigger spam filters.');
        score -= 15;
      }

      // Excessive punctuation
      const exclamationCount = (text.match(/!/g) || []).length;
      const questionCount = (text.match(/\?/g) || []).length;
      if (exclamationCount > 1) {
        spamScore += 10;
        issues.push('Multiple exclamation marks can appear spammy.');
        score -= 10;
      }

      // Check for symbols that trigger spam
      if (text.includes('$') || text.includes('€') || text.includes('£')) {
        spamScore += 10;
        issues.push('Currency symbols can increase spam score.');
        score -= 5;
      }

      // Analyze elements
      const elements = {
        hasEmoji: /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/u.test(text),
        hasPersonalization: text.includes('{{') || text.includes('{name}') || text.includes('[name]'),
        hasUrgency: /\b(today|now|last chance|ending|expires|deadline)\b/i.test(text),
        hasQuestion: text.includes('?'),
        hasNumber: /\d/.test(text),
        hasPowerWord: POWER_WORDS.some(word => lowerText.includes(word.toLowerCase()))
      };

      // Positive elements
      if (elements.hasPersonalization) {
        strengths.push('Uses personalization tokens - great for engagement!');
        score += 10;
      }

      if (elements.hasQuestion) {
        strengths.push('Questions can increase open rates by creating curiosity.');
        score += 5;
      }

      if (elements.hasNumber) {
        strengths.push('Numbers make subject lines more specific and trustworthy.');
        score += 5;
      }

      if (elements.hasPowerWord) {
        strengths.push('Contains power words that can boost engagement.');
        score += 5;
      }

      if (elements.hasEmoji) {
        strengths.push('Emojis can increase open rates (test with your audience).');
        score += 3;
      }

      // Open rate prediction
      let openRatePrediction = 'Average (15-20%)';
      if (score >= 85 && spamScore < 20) {
        openRatePrediction = 'High (25-30%)';
      } else if (score >= 70 && spamScore < 40) {
        openRatePrediction = 'Above Average (20-25%)';
      } else if (score < 50 || spamScore > 60) {
        openRatePrediction = 'Below Average (<15%)';
      }

      // Ensure scores are within bounds
      score = Math.max(0, Math.min(100, score));
      spamScore = Math.min(100, spamScore);

      const result: SubjectLineAnalysis = {
        text,
        length,
        score,
        spamScore,
        openRatePrediction,
        issues,
        strengths,
        preview: {
          desktop: text.length > 60 ? text.substring(0, 57) + '...' : text,
          mobile: text.length > 35 ? text.substring(0, 32) + '...' : text
        },
        elements
      };

      setAnalysis(result);
      setIsAnalyzing(false);

      if (onResult) {
        onResult({
          subjectLine: text,
          analysis: result,
          timestamp: new Date().toISOString()
        });
      }
    }, 500);
  };

  // Auto-analyze on change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (subjectLine) {
        analyzeSubjectLine();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [subjectLine]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getSpamScoreColor = (score: number) => {
    if (score <= 20) return 'text-green-600 dark:text-green-400';
    if (score <= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className={cn(
      "space-y-4",
      isFullscreen ? "max-w-2xl mx-auto" : ""
    )}>
      <div>
        <label htmlFor="subject-input" className="block text-sm font-medium mb-2">
          Email Subject Line
        </label>
        <div className="relative">
          <input
            id="subject-input"
            type="text"
            value={subjectLine}
            onChange={(e) => setSubjectLine(e.target.value)}
            placeholder="Enter your email subject line..."
            className={cn(
              "w-full px-4 py-2 pr-16",
              "border border-gray-300 dark:border-gray-600 rounded-lg",
              "bg-white dark:bg-gray-800",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
              "placeholder-gray-400 dark:placeholder-gray-500"
            )}
            maxLength={150}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <span className={cn(
              "text-sm font-mono",
              subjectLine.length > 60 ? 'text-red-500' : 'text-gray-500'
            )}>
              {subjectLine.length}
            </span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Scores */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Overall Score</span>
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                </div>
                <div className={cn("text-2xl font-bold", getScoreColor(analysis.score))}>
                  {analysis.score}%
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Spam Score</span>
                  <AlertTriangle className="w-4 h-4 text-gray-400" />
                </div>
                <div className={cn("text-2xl font-bold", getSpamScoreColor(analysis.spamScore))}>
                  {analysis.spamScore}%
                </div>
              </div>
            </div>

            {/* Open Rate Prediction */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="font-medium">Predicted Open Rate</span>
              </div>
              <div className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                {analysis.openRatePrediction}
              </div>
            </div>

            {/* Previews */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Email Client Preview</h4>
              
              {/* Desktop Preview */}
              <div className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <Monitor className="w-3 h-3" />
                  Desktop Client
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-full flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-sm mb-1">{analysis.preview.desktop}</div>
                    <div className="text-xs text-gray-500">Your Company Name</div>
                  </div>
                </div>
              </div>

              {/* Mobile Preview */}
              <div className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <Smartphone className="w-3 h-3" />
                  Mobile Client
                </div>
                <div className="space-y-1">
                  <div className="font-medium text-sm">{analysis.preview.mobile}</div>
                  <div className="text-xs text-gray-500">Your Company</div>
                </div>
              </div>
            </div>

            {/* Elements */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium text-sm mb-3">Subject Line Elements</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(analysis.elements).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <div className={cn(
                      "w-4 h-4 rounded-full",
                      value ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                    )} />
                    <span className="text-gray-600 dark:text-gray-400">
                      {key.replace(/has/i, '').replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Issues & Strengths */}
            {analysis.issues.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-red-600 dark:text-red-400">Issues to Fix</h4>
                {analysis.issues.map((issue, idx) => (
                  <div key={idx} className="p-3 bg-red-50 dark:bg-red-900/20 rounded text-sm">
                    {issue}
                  </div>
                ))}
              </div>
            )}

            {analysis.strengths.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-green-600 dark:text-green-400">Strengths</h4>
                {analysis.strengths.map((strength, idx) => (
                  <div key={idx} className="p-3 bg-green-50 dark:bg-green-900/20 rounded text-sm">
                    {strength}
                  </div>
                ))}
              </div>
            )}

            {/* Tips */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Subject Line Best Practices
              </h4>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>• Keep it between 30-50 characters</li>
                <li>• Personalize when possible</li>
                <li>• Create urgency without being spammy</li>
                <li>• Use numbers for specificity</li>
                <li>• A/B test different variations</li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};