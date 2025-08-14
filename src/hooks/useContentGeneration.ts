import { useState, useCallback } from 'react';
import axios from 'axios';

interface GenerationOptions {
  tone?: 'professional' | 'friendly' | 'casual' | 'urgent' | 'empathetic';
  length?: 'short' | 'medium' | 'long';
  audience?: string;
  keywords?: string[];
  platform?: string;
}

interface ContentResult {
  content: string;
  subject?: string;
  previewText?: string;
  sections?: any[];
  metaTitle?: string;
  metaDescription?: string;
  slug?: string;
}

interface PerformancePrediction {
  overallScore: number;
  openRateRange?: [number, number];
  clickRateRange?: [number, number];
  conversionEstimate?: number;
  seoScore?: number;
  readabilityScore?: number;
  keywordDensity?: number;
  expectedTraffic?: string;
  competitionLevel?: 'low' | 'medium' | 'high';
}

interface AdScore {
  relevance: number;
  clarity: number;
  urgency: number;
  overall: number;
  predictedCTR: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const useContentGeneration = () => {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate content based on type and prompt
  const generateContent = useCallback(async (
    type: 'email' | 'social' | 'blog-outline' | 'blog-section' | 'ad',
    prompt: string,
    options?: GenerationOptions
  ): Promise<ContentResult> => {
    setGenerating(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/cmo/generate`, {
        type,
        prompt,
        options
      });

      return response.data.result;
    } catch (err: any) {
      setError(err.message || 'Generation failed');
      // Return mock data for development
      return getMockContent(type, prompt, options);
    } finally {
      setGenerating(false);
    }
  }, []);

  // Adjust tone of existing content
  const adjustTone = useCallback(async (
    content: string,
    newTone: GenerationOptions['tone']
  ): Promise<string> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/cmo/adjust-tone`, {
        content,
        tone: newTone
      });

      return response.data.adjustedContent;
    } catch (err) {
      // Simple mock tone adjustment
      return mockAdjustTone(content, newTone);
    }
  }, []);

  // Generate hashtags for content
  const suggestHashtags = useCallback(async (
    content: string,
    platform: string
  ): Promise<string[]> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/cmo/suggest-hashtags`, {
        content,
        platform
      });

      return response.data.hashtags;
    } catch (err) {
      // Mock hashtag generation
      return getMockHashtags(content, platform);
    }
  }, []);

  // Optimize content for specific platform
  const optimizeForPlatform = useCallback(async (
    content: string,
    platform: string
  ): Promise<string> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/cmo/optimize-platform`, {
        content,
        platform
      });

      return response.data.optimizedContent;
    } catch (err) {
      // Mock platform optimization
      return mockOptimizeForPlatform(content, platform);
    }
  }, []);

  // Predict performance of content
  const predictPerformance = useCallback(async (
    type: string,
    data: any
  ): Promise<PerformancePrediction> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/cmo/predict-performance`, {
        type,
        data
      });

      return response.data.prediction;
    } catch (err) {
      // Mock performance prediction
      return getMockPerformance(type);
    }
  }, []);

  // Analyze keywords for SEO
  const analyzeKeywords = useCallback(async (
    keywords: string[],
    content?: string
  ): Promise<any> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/cmo/analyze-keywords`, {
        keywords,
        content
      });

      return response.data.analysis;
    } catch (err) {
      // Mock keyword analysis
      return getMockKeywordAnalysis(keywords);
    }
  }, []);

  // Score ad copy
  const scoreAdCopy = useCallback(async (
    adCopy: any,
    platform: string
  ): Promise<AdScore> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/cmo/score-ad`, {
        adCopy,
        platform
      });

      return response.data.score;
    } catch (err) {
      // Mock ad scoring
      return getMockAdScore();
    }
  }, []);

  // Generate A/B test variations
  const generateABVariations = useCallback(async (
    prompt: string,
    count: number = 3
  ): Promise<any[]> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/cmo/generate-variations`, {
        prompt,
        count
      });

      return response.data.variations;
    } catch (err) {
      // Mock variations
      return getMockVariations(prompt, count);
    }
  }, []);

  // Predict SEO performance
  const predictSEOPerformance = useCallback(async (
    data: any
  ): Promise<PerformancePrediction> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/cmo/predict-seo`, {
        data
      });

      return response.data.prediction;
    } catch (err) {
      // Mock SEO prediction
      return getMockSEOPerformance();
    }
  }, []);

  return {
    generating,
    error,
    generateContent,
    adjustTone,
    suggestHashtags,
    optimizeForPlatform,
    predictPerformance,
    analyzeKeywords,
    scoreAdCopy,
    generateABVariations,
    predictSEOPerformance
  };
};

// Mock data functions for development
function getMockContent(type: string, prompt: string, options?: GenerationOptions): ContentResult {
  switch (type) {
    case 'email':
      return {
        subject: 'Your Weekly Update: New Features & Insights',
        previewText: 'Discover what\'s new this week',
        content: `Hi {{first_name}},

We're excited to share this week's updates with you!

**New Features:**
- Advanced analytics dashboard
- Team collaboration tools
- Mobile app improvements

**Pro Tip:** Did you know you can save 2 hours per week by using our automation features?

[CTA: Explore New Features]

Best regards,
The Team`
      };

    case 'social':
      return {
        content: `🚀 Big news! We just launched our most requested feature.

Swipe to see how it can transform your workflow →

What feature would you like to see next? Let us know in the comments! 👇`
      };

    case 'blog-outline':
      return {
        sections: [
          { heading: 'Introduction', level: 1, wordCount: 300, keyPoints: ['Hook', 'Context', 'Thesis'] },
          { heading: 'The Problem', level: 1, wordCount: 500, keyPoints: ['Current challenges', 'Impact', 'Why it matters'] },
          { heading: 'The Solution', level: 1, wordCount: 800, keyPoints: ['Overview', 'Implementation', 'Benefits'] },
          { heading: 'Best Practices', level: 1, wordCount: 600, keyPoints: ['Do\'s', 'Don\'ts', 'Expert tips'] },
          { heading: 'Conclusion', level: 1, wordCount: 300, keyPoints: ['Summary', 'Next steps', 'CTA'] }
        ],
        metaTitle: 'The Ultimate Guide to Content Marketing in 2024',
        metaDescription: 'Learn proven content marketing strategies that drive results. Includes examples, templates, and expert tips.',
        slug: 'ultimate-guide-content-marketing-2024'
      };

    default:
      return { content: 'Generated content for ' + type };
  }
}

function mockAdjustTone(content: string, tone?: GenerationOptions['tone']): string {
  const toneMap = {
    professional: 'We are pleased to inform you that',
    friendly: 'Hey there! Great news -',
    casual: 'Yo! Check this out:',
    urgent: 'URGENT: Action required -',
    empathetic: 'We understand your concerns, and'
  };

  return `${toneMap[tone || 'professional']} ${content}`;
}

function getMockHashtags(content: string, platform: string): string[] {
  const baseHashtags = ['#marketing', '#business', '#growth', '#success', '#innovation'];
  const platformSpecific = {
    instagram: ['#instagood', '#instadaily', '#photooftheday'],
    twitter: ['#MarketingTwitter', '#BusinessTips'],
    linkedin: ['#B2B', '#Leadership', '#ProfessionalDevelopment'],
    tiktok: ['#fyp', '#LearnOnTikTok', '#BusinessTok']
  };

  return [...baseHashtags, ...(platformSpecific[platform as keyof typeof platformSpecific] || [])];
}

function mockOptimizeForPlatform(content: string, platform: string): string {
  const limits = {
    twitter: 280,
    instagram: 2200,
    linkedin: 3000,
    facebook: 63206
  };

  const limit = limits[platform as keyof typeof limits] || 1000;
  return content.substring(0, limit);
}

function getMockPerformance(type: string): PerformancePrediction {
  return {
    overallScore: Math.floor(Math.random() * 30) + 70,
    openRateRange: [18, 25],
    clickRateRange: [2, 5],
    conversionEstimate: Math.floor(Math.random() * 5) + 2
  };
}

function getMockKeywordAnalysis(keywords: string[]): any {
  return keywords.map(keyword => ({
    keyword,
    searchVolume: Math.floor(Math.random() * 10000) + 1000,
    difficulty: Math.floor(Math.random() * 100),
    cpc: (Math.random() * 5 + 0.5).toFixed(2)
  }));
}

function getMockAdScore(): AdScore {
  return {
    relevance: Math.floor(Math.random() * 20) + 80,
    clarity: Math.floor(Math.random() * 20) + 80,
    urgency: Math.floor(Math.random() * 30) + 70,
    overall: Math.floor(Math.random() * 20) + 80,
    predictedCTR: `${(Math.random() * 3 + 2).toFixed(1)}%`
  };
}

function getMockVariations(prompt: string, count: number): any[] {
  const variations = [];
  const templates = [
    { headline: 'Transform Your Business Today', description: 'Discover the tools that leading companies use to succeed', callToAction: 'Get Started' },
    { headline: 'Save 50% This Week Only', description: 'Limited time offer on our premium plans - don\'t miss out!', callToAction: 'Claim Offer' },
    { headline: 'Join 10,000+ Happy Customers', description: 'See why businesses choose us for their growth', callToAction: 'Learn More' },
    { headline: 'Free Trial - No Credit Card', description: 'Try all features risk-free for 14 days', callToAction: 'Start Trial' },
    { headline: 'Boost ROI by 300%', description: 'Our proven strategies deliver measurable results', callToAction: 'See How' }
  ];

  for (let i = 0; i < count; i++) {
    variations.push(templates[i % templates.length]);
  }

  return variations;
}

function getMockSEOPerformance(): PerformancePrediction {
  return {
    seoScore: Math.floor(Math.random() * 20) + 80,
    readabilityScore: Math.floor(Math.random() * 20) + 75,
    keywordDensity: (Math.random() * 2 + 0.5).toFixed(1) as any,
    expectedTraffic: `${Math.floor(Math.random() * 5000) + 1000}/mo`,
    competitionLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any
  };
}