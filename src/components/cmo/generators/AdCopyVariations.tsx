import React, { useState } from 'react';
import { Megaphone, Plus, Copy, RefreshCw, Target, TrendingUp, Zap, AlertTriangle, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/cn';
import { useContentGeneration } from '../../../hooks/useContentGeneration';

interface AdCopyVariationsProps {
  onGenerate?: (variations: AdCampaign) => void;
  initialData?: any;
  context?: string;
}

interface AdCampaign {
  id: string;
  name: string;
  product: string;
  targetAudience: string;
  uniqueSellingPoint: string;
  platform: AdPlatform;
  adGroups: AdGroup[];
  testingStrategy: TestingStrategy;
}

interface AdGroup {
  id: string;
  name: string;
  theme: string;
  variations: AdVariation[];
}

interface AdVariation {
  id: string;
  headline: string;
  description: string;
  callToAction: string;
  displayUrl?: string;
  emotionalTrigger: string;
  score?: VariationScore;
}

interface VariationScore {
  relevance: number;
  clarity: number;
  urgency: number;
  overall: number;
  predictedCTR: string;
}

interface TestingStrategy {
  testType: 'headline' | 'description' | 'cta' | 'full';
  duration: number;
  successMetric: 'ctr' | 'conversions' | 'cpa';
}

type AdPlatform = 'google' | 'facebook' | 'linkedin' | 'instagram' | 'twitter';

const PLATFORM_LIMITS = {
  google: {
    headline: 30,
    description: 90,
    displayUrl: 35
  },
  facebook: {
    headline: 40,
    description: 125,
    displayUrl: 0
  },
  linkedin: {
    headline: 70,
    description: 100,
    displayUrl: 0
  },
  instagram: {
    headline: 40,
    description: 125,
    displayUrl: 0
  },
  twitter: {
    headline: 23,
    description: 70,
    displayUrl: 0
  }
};

const EMOTIONAL_TRIGGERS = [
  'Fear of Missing Out',
  'Curiosity',
  'Trust & Authority',
  'Urgency',
  'Social Proof',
  'Value & Savings',
  'Exclusivity',
  'Problem/Solution'
];

const AD_THEMES = [
  { id: 'benefit-focused', name: 'Benefit Focused', description: 'Highlight key benefits' },
  { id: 'problem-solution', name: 'Problem/Solution', description: 'Address pain points' },
  { id: 'social-proof', name: 'Social Proof', description: 'Use testimonials and numbers' },
  { id: 'urgency', name: 'Urgency/Scarcity', description: 'Create time pressure' },
  { id: 'question-based', name: 'Question Based', description: 'Engage with questions' }
];

export const AdCopyVariations: React.FC<AdCopyVariationsProps> = ({
  onGenerate,
  initialData,
  context
}) => {
  const { generateContent, scoreAdCopy, generateABVariations } = useContentGeneration();
  
  const [campaign, setCampaign] = useState<AdCampaign>({
    id: Date.now().toString(),
    name: '',
    product: '',
    targetAudience: '',
    uniqueSellingPoint: '',
    platform: 'google',
    adGroups: [],
    testingStrategy: {
      testType: 'headline',
      duration: 14,
      successMetric: 'ctr'
    }
  });

  const [generatingVariations, setGeneratingVariations] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string>('benefit-focused');

  // Add ad group
  const addAdGroup = () => {
    const theme = AD_THEMES.find(t => t.id === selectedTheme);
    const newGroup: AdGroup = {
      id: Date.now().toString(),
      name: theme?.name || 'New Ad Group',
      theme: selectedTheme,
      variations: []
    };
    
    setCampaign(prev => ({
      ...prev,
      adGroups: [...prev.adGroups, newGroup]
    }));
  };

  // Remove ad group
  const removeAdGroup = (groupId: string) => {
    setCampaign(prev => ({
      ...prev,
      adGroups: prev.adGroups.filter(g => g.id !== groupId)
    }));
  };

  // Generate variations for ad group
  const generateVariations = async (groupId: string) => {
    const group = campaign.adGroups.find(g => g.id === groupId);
    if (!group || !campaign.product || !campaign.targetAudience) return;
    
    setGeneratingVariations(groupId);
    
    try {
      const prompt = `
        Generate ad copy variations for:
        Product: ${campaign.product}
        Target Audience: ${campaign.targetAudience}
        USP: ${campaign.uniqueSellingPoint}
        Platform: ${campaign.platform}
        Theme: ${group.theme}
        Test Type: ${campaign.testingStrategy.testType}
      `;
      
      const variations = await generateABVariations(prompt, 5);
      
      const newVariations: AdVariation[] = variations.map((v: any, index: number) => ({
        id: `${groupId}-${index}`,
        headline: v.headline || '',
        description: v.description || '',
        callToAction: v.callToAction || 'Learn More',
        displayUrl: v.displayUrl,
        emotionalTrigger: v.emotionalTrigger || EMOTIONAL_TRIGGERS[index % EMOTIONAL_TRIGGERS.length]
      }));
      
      // Score each variation
      for (const variation of newVariations) {
        const score = await scoreAdCopy(variation, campaign.platform);
        variation.score = score;
      }
      
      setCampaign(prev => ({
        ...prev,
        adGroups: prev.adGroups.map(g => 
          g.id === groupId 
            ? { ...g, variations: newVariations }
            : g
        )
      }));
    } catch (error) {
      console.error('Error generating variations:', error);
    } finally {
      setGeneratingVariations(null);
    }
  };

  // Update variation
  const updateVariation = (groupId: string, variationId: string, updates: Partial<AdVariation>) => {
    setCampaign(prev => ({
      ...prev,
      adGroups: prev.adGroups.map(group => 
        group.id === groupId
          ? {
              ...group,
              variations: group.variations.map(v => 
                v.id === variationId ? { ...v, ...updates } : v
              )
            }
          : group
      )
    }));
  };

  // Copy variation
  const copyVariation = (variation: AdVariation) => {
    const text = `${variation.headline}\n${variation.description}\n${variation.callToAction}`;
    navigator.clipboard.writeText(text);
  };

  // Get character count status
  const getCharStatus = (text: string, limit: number) => {
    const length = text.length;
    if (length === 0) return { color: 'text-gray-400', status: 'empty' };
    if (length > limit) return { color: 'text-red-600', status: 'over' };
    if (length > limit * 0.9) return { color: 'text-yellow-600', status: 'near' };
    return { color: 'text-green-600', status: 'good' };
  };

  // Export variations
  const exportVariations = (format: 'csv' | 'json') => {
    let content = '';
    const filename = `ad-variations-${campaign.name || 'export'}`;
    
    if (format === 'csv') {
      content = 'Ad Group,Headline,Description,CTA,Emotional Trigger,Relevance Score,Clarity Score,Urgency Score,Overall Score,Predicted CTR\n';
      campaign.adGroups.forEach(group => {
        group.variations.forEach(v => {
          content += `"${group.name}","${v.headline}","${v.description}","${v.callToAction}","${v.emotionalTrigger}",${v.score?.relevance || ''},${v.score?.clarity || ''},${v.score?.urgency || ''},${v.score?.overall || ''},"${v.score?.predictedCTR || ''}"\n`;
        });
      });
    } else {
      content = JSON.stringify(campaign, null, 2);
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get best performing variation
  const getBestVariation = (group: AdGroup) => {
    if (group.variations.length === 0) return null;
    return group.variations.reduce((best, current) => 
      (current.score?.overall || 0) > (best.score?.overall || 0) ? current : best
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold mb-6">Ad Copy A/B Test Generator</h2>
        
        {/* Campaign Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Campaign Name</label>
            <input
              type="text"
              value={campaign.name}
              onChange={(e) => setCampaign(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Summer Sale Campaign"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Platform</label>
            <select
              value={campaign.platform}
              onChange={(e) => setCampaign(prev => ({ ...prev, platform: e.target.value as AdPlatform }))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
            >
              <option value="google">Google Ads</option>
              <option value="facebook">Facebook</option>
              <option value="linkedin">LinkedIn</option>
              <option value="instagram">Instagram</option>
              <option value="twitter">Twitter</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Product/Service</label>
            <input
              type="text"
              value={campaign.product}
              onChange={(e) => setCampaign(prev => ({ ...prev, product: e.target.value }))}
              placeholder="e.g., Project Management Software"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Target Audience</label>
            <input
              type="text"
              value={campaign.targetAudience}
              onChange={(e) => setCampaign(prev => ({ ...prev, targetAudience: e.target.value }))}
              placeholder="e.g., Small business owners, 25-45"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Unique Selling Point</label>
            <input
              type="text"
              value={campaign.uniqueSellingPoint}
              onChange={(e) => setCampaign(prev => ({ ...prev, uniqueSellingPoint: e.target.value }))}
              placeholder="e.g., All-in-one solution that saves 10 hours per week"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
            />
          </div>
        </div>
        
        {/* Testing Strategy */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Test Type</label>
            <select
              value={campaign.testingStrategy.testType}
              onChange={(e) => setCampaign(prev => ({
                ...prev,
                testingStrategy: { ...prev.testingStrategy, testType: e.target.value as any }
              }))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
            >
              <option value="headline">Headlines Only</option>
              <option value="description">Descriptions Only</option>
              <option value="cta">CTAs Only</option>
              <option value="full">Full Variations</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Test Duration (days)</label>
            <input
              type="number"
              value={campaign.testingStrategy.duration}
              onChange={(e) => setCampaign(prev => ({
                ...prev,
                testingStrategy: { ...prev.testingStrategy, duration: parseInt(e.target.value) }
              }))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Success Metric</label>
            <select
              value={campaign.testingStrategy.successMetric}
              onChange={(e) => setCampaign(prev => ({
                ...prev,
                testingStrategy: { ...prev.testingStrategy, successMetric: e.target.value as any }
              }))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
            >
              <option value="ctr">Click-Through Rate</option>
              <option value="conversions">Conversions</option>
              <option value="cpa">Cost Per Acquisition</option>
            </select>
          </div>
        </div>
        
        {/* Add Ad Group */}
        <div className="flex items-center gap-4">
          <select
            value={selectedTheme}
            onChange={(e) => setSelectedTheme(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
          >
            {AD_THEMES.map(theme => (
              <option key={theme.id} value={theme.id}>
                {theme.name} - {theme.description}
              </option>
            ))}
          </select>
          <button
            onClick={addAdGroup}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Ad Group
          </button>
        </div>
      </div>
      
      {/* Ad Groups */}
      {campaign.adGroups.map(group => {
        const bestVariation = getBestVariation(group);
        const limits = PLATFORM_LIMITS[campaign.platform];
        
        return (
          <motion.div
            key={group.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold">{group.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {AD_THEMES.find(t => t.id === group.theme)?.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {bestVariation && (
                  <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm">
                    Best: {bestVariation.score?.overall}% score
                  </div>
                )}
                <button
                  onClick={() => generateVariations(group.id)}
                  disabled={generatingVariations === group.id}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50"
                >
                  {generatingVariations === group.id ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Generate Variations
                    </>
                  )}
                </button>
                <button
                  onClick={() => removeAdGroup(group.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  ×
                </button>
              </div>
            </div>
            
            {/* Variations */}
            {group.variations.length > 0 ? (
              <div className="space-y-4">
                {group.variations.map((variation, index) => (
                  <div
                    key={variation.id}
                    className={cn(
                      "p-4 border rounded-lg",
                      variation.score && variation.score.overall >= 80
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                        : "border-gray-200 dark:border-gray-700"
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">Variation {index + 1}</span>
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                          {variation.emotionalTrigger}
                        </span>
                      </div>
                      <button
                        onClick={() => copyVariation(variation)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-sm font-medium">Headline</label>
                          <span className={cn(
                            "text-xs",
                            getCharStatus(variation.headline, limits.headline).color
                          )}>
                            {variation.headline.length}/{limits.headline}
                          </span>
                        </div>
                        <input
                          type="text"
                          value={variation.headline}
                          onChange={(e) => updateVariation(group.id, variation.id, { headline: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                        />
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-sm font-medium">Description</label>
                          <span className={cn(
                            "text-xs",
                            getCharStatus(variation.description, limits.description).color
                          )}>
                            {variation.description.length}/{limits.description}
                          </span>
                        </div>
                        <textarea
                          value={variation.description}
                          onChange={(e) => updateVariation(group.id, variation.id, { description: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium mb-1">Call to Action</label>
                          <input
                            type="text"
                            value={variation.callToAction}
                            onChange={(e) => updateVariation(group.id, variation.id, { callToAction: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                          />
                        </div>
                        
                        {limits.displayUrl > 0 && (
                          <div>
                            <label className="text-sm font-medium mb-1">Display URL</label>
                            <input
                              type="text"
                              value={variation.displayUrl || ''}
                              onChange={(e) => updateVariation(group.id, variation.id, { displayUrl: e.target.value })}
                              placeholder="example.com/offer"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Scores */}
                    {variation.score && (
                      <div className="mt-4 grid grid-cols-5 gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-center">
                          <div className="text-lg font-medium">{variation.score.relevance}%</div>
                          <div className="text-xs text-gray-600">Relevance</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-medium">{variation.score.clarity}%</div>
                          <div className="text-xs text-gray-600">Clarity</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-medium">{variation.score.urgency}%</div>
                          <div className="text-xs text-gray-600">Urgency</div>
                        </div>
                        <div className="text-center">
                          <div className={cn(
                            "text-lg font-medium",
                            variation.score.overall >= 80 ? "text-green-600" :
                            variation.score.overall >= 60 ? "text-yellow-600" :
                            "text-red-600"
                          )}>
                            {variation.score.overall}%
                          </div>
                          <div className="text-xs text-gray-600">Overall</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-medium text-blue-600">
                            {variation.score.predictedCTR}
                          </div>
                          <div className="text-xs text-gray-600">Predicted CTR</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Click "Generate Variations" to create ad copy variations
              </div>
            )}
          </motion.div>
        );
      })}
      
      {/* Export Actions */}
      {campaign.adGroups.some(g => g.variations.length > 0) && (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => exportVariations('csv')}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => exportVariations('json')}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </button>
        </div>
      )}
    </div>
  );
};