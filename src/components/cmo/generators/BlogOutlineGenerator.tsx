import React, { useState } from 'react';
import { FileText, Plus, Trash2, ChevronDown, ChevronUp, Sparkles, Download, Copy, Target, Search, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/cn';
import { useContentGeneration } from '../../../hooks/useContentGeneration';

interface BlogOutlineGeneratorProps {
  onGenerate?: (outline: BlogOutline) => void;
  initialData?: any;
  context?: string;
}

interface BlogOutline {
  id: string;
  title: string;
  targetKeyword: string;
  secondaryKeywords: string[];
  targetAudience: string;
  contentGoal: string;
  wordCount: number;
  sections: Section[];
  seoMetadata: SEOMetadata;
  performance?: PerformanceEstimate;
}

interface Section {
  id: string;
  heading: string;
  level: 1 | 2 | 3;
  wordCount: number;
  keyPoints: string[];
  keywords: string[];
  expanded?: boolean;
  content?: string;
}

interface SEOMetadata {
  metaTitle: string;
  metaDescription: string;
  slug: string;
  focusKeyphrase: string;
  readingTime: number;
}

interface PerformanceEstimate {
  seoScore: number;
  readabilityScore: number;
  keywordDensity: number;
  expectedTraffic: string;
  competitionLevel: 'low' | 'medium' | 'high';
}

const BLOG_TEMPLATES = {
  howTo: {
    name: 'How-To Guide',
    sections: [
      { heading: 'Introduction', level: 1, keywords: ['problem', 'solution'] },
      { heading: 'What You\'ll Need', level: 2, keywords: ['requirements', 'tools'] },
      { heading: 'Step-by-Step Guide', level: 1, keywords: ['process', 'steps'] },
      { heading: 'Common Mistakes to Avoid', level: 2, keywords: ['mistakes', 'tips'] },
      { heading: 'Conclusion', level: 1, keywords: ['summary', 'next steps'] }
    ]
  },
  listicle: {
    name: 'Listicle',
    sections: [
      { heading: 'Introduction', level: 1, keywords: ['overview', 'benefits'] },
      { heading: 'The List', level: 1, keywords: ['items', 'tips', 'strategies'] },
      { heading: 'How to Implement', level: 2, keywords: ['action', 'implementation'] },
      { heading: 'Conclusion', level: 1, keywords: ['summary', 'takeaways'] }
    ]
  },
  comparison: {
    name: 'Comparison Post',
    sections: [
      { heading: 'Introduction', level: 1, keywords: ['overview', 'comparison'] },
      { heading: 'Option 1 Overview', level: 2, keywords: ['features', 'benefits'] },
      { heading: 'Option 2 Overview', level: 2, keywords: ['features', 'benefits'] },
      { heading: 'Detailed Comparison', level: 1, keywords: ['versus', 'differences'] },
      { heading: 'Our Recommendation', level: 2, keywords: ['recommendation', 'best choice'] },
      { heading: 'Conclusion', level: 1, keywords: ['summary', 'final thoughts'] }
    ]
  },
  ultimate: {
    name: 'Ultimate Guide',
    sections: [
      { heading: 'Introduction', level: 1, keywords: ['comprehensive', 'guide'] },
      { heading: 'Chapter 1: Fundamentals', level: 1, keywords: ['basics', 'foundation'] },
      { heading: 'Chapter 2: Advanced Strategies', level: 1, keywords: ['advanced', 'expert'] },
      { heading: 'Chapter 3: Tools and Resources', level: 1, keywords: ['tools', 'resources'] },
      { heading: 'Chapter 4: Case Studies', level: 1, keywords: ['examples', 'success stories'] },
      { heading: 'Chapter 5: Future Trends', level: 1, keywords: ['trends', 'future'] },
      { heading: 'Conclusion and Next Steps', level: 1, keywords: ['action plan', 'implementation'] }
    ]
  }
};

export const BlogOutlineGenerator: React.FC<BlogOutlineGeneratorProps> = ({
  onGenerate,
  initialData,
  context
}) => {
  const { generateContent, analyzeKeywords, predictSEOPerformance } = useContentGeneration();
  
  const [outline, setOutline] = useState<BlogOutline>({
    id: Date.now().toString(),
    title: '',
    targetKeyword: '',
    secondaryKeywords: [],
    targetAudience: '',
    contentGoal: '',
    wordCount: 2000,
    sections: [],
    seoMetadata: {
      metaTitle: '',
      metaDescription: '',
      slug: '',
      focusKeyphrase: '',
      readingTime: 0
    }
  });

  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [keywordInput, setKeywordInput] = useState('');
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [generatingOutline, setGeneratingOutline] = useState(false);
  const [analyzingSEO, setAnalyzingSEO] = useState(false);

  // Apply template
  const applyTemplate = (templateKey: string) => {
    const template = BLOG_TEMPLATES[templateKey as keyof typeof BLOG_TEMPLATES];
    if (!template) return;

    const sections = template.sections.map((section, index) => ({
      id: `section-${index}`,
      heading: section.heading,
      level: section.level as 1 | 2 | 3,
      wordCount: Math.floor(outline.wordCount / template.sections.length),
      keyPoints: [],
      keywords: section.keywords
    }));

    setOutline(prev => ({ ...prev, sections }));
    setSelectedTemplate(templateKey);
  };

  // Add section
  const addSection = (afterId?: string) => {
    const newSection: Section = {
      id: `section-${Date.now()}`,
      heading: 'New Section',
      level: 2,
      wordCount: 300,
      keyPoints: [],
      keywords: []
    };

    if (afterId) {
      const index = outline.sections.findIndex(s => s.id === afterId);
      const newSections = [...outline.sections];
      newSections.splice(index + 1, 0, newSection);
      setOutline(prev => ({ ...prev, sections: newSections }));
    } else {
      setOutline(prev => ({ ...prev, sections: [...prev.sections, newSection] }));
    }
  };

  // Remove section
  const removeSection = (sectionId: string) => {
    setOutline(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== sectionId)
    }));
  };

  // Update section
  const updateSection = (sectionId: string, updates: Partial<Section>) => {
    setOutline(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    }));
  };

  // Add secondary keyword
  const addSecondaryKeyword = () => {
    if (keywordInput && !outline.secondaryKeywords.includes(keywordInput)) {
      setOutline(prev => ({
        ...prev,
        secondaryKeywords: [...prev.secondaryKeywords, keywordInput]
      }));
      setKeywordInput('');
    }
  };

  // Remove secondary keyword
  const removeSecondaryKeyword = (keyword: string) => {
    setOutline(prev => ({
      ...prev,
      secondaryKeywords: prev.secondaryKeywords.filter(k => k !== keyword)
    }));
  };

  // Generate full outline
  const generateFullOutline = async () => {
    if (!outline.title || !outline.targetKeyword) return;
    
    setGeneratingOutline(true);
    
    try {
      const prompt = `
        Generate a comprehensive blog outline for:
        Title: ${outline.title}
        Target Keyword: ${outline.targetKeyword}
        Secondary Keywords: ${outline.secondaryKeywords.join(', ')}
        Target Audience: ${outline.targetAudience}
        Content Goal: ${outline.contentGoal}
        Word Count: ${outline.wordCount}
      `;
      
      const generated = await generateContent('blog-outline', prompt);
      
      // Parse generated outline and create sections
      const sections = generated.sections || [];
      setOutline(prev => ({
        ...prev,
        sections: sections.map((section: any, index: number) => ({
          id: `section-${index}`,
          heading: section.heading,
          level: section.level || 2,
          wordCount: section.wordCount || Math.floor(outline.wordCount / sections.length),
          keyPoints: section.keyPoints || [],
          keywords: section.keywords || []
        })),
        seoMetadata: {
          metaTitle: generated.metaTitle || outline.title,
          metaDescription: generated.metaDescription || '',
          slug: generated.slug || outline.title.toLowerCase().replace(/\s+/g, '-'),
          focusKeyphrase: outline.targetKeyword,
          readingTime: Math.ceil(outline.wordCount / 200)
        }
      }));
    } catch (error) {
      console.error('Error generating outline:', error);
    } finally {
      setGeneratingOutline(false);
    }
  };

  // Generate section content
  const generateSectionContent = async (sectionId: string) => {
    const section = outline.sections.find(s => s.id === sectionId);
    if (!section) return;
    
    const prompt = `
      Generate content for blog section:
      Heading: ${section.heading}
      Word Count: ${section.wordCount}
      Key Points: ${section.keyPoints.join(', ')}
      Keywords to include: ${section.keywords.join(', ')}
      Target Keyword: ${outline.targetKeyword}
    `;
    
    const generated = await generateContent('blog-section', prompt);
    updateSection(sectionId, { content: generated.content });
  };

  // Analyze SEO performance
  const analyzeSEO = async () => {
    setAnalyzingSEO(true);
    
    try {
      const performance = await predictSEOPerformance({
        title: outline.title,
        keyword: outline.targetKeyword,
        secondaryKeywords: outline.secondaryKeywords,
        wordCount: outline.wordCount,
        sections: outline.sections.length
      });
      
      setOutline(prev => ({ ...prev, performance }));
    } catch (error) {
      console.error('Error analyzing SEO:', error);
    } finally {
      setAnalyzingSEO(false);
    }
  };

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Calculate total word count
  const totalWordCount = outline.sections.reduce((sum, section) => sum + section.wordCount, 0);

  // Export outline
  const exportOutline = (format: 'markdown' | 'json' | 'html') => {
    let content = '';
    const filename = outline.title.toLowerCase().replace(/\s+/g, '-') || 'blog-outline';
    
    switch (format) {
      case 'markdown':
        content = `# ${outline.title}\n\n`;
        content += `**Target Keyword:** ${outline.targetKeyword}\n`;
        content += `**Secondary Keywords:** ${outline.secondaryKeywords.join(', ')}\n`;
        content += `**Word Count:** ${outline.wordCount}\n\n`;
        
        outline.sections.forEach(section => {
          const prefix = '#'.repeat(section.level + 1);
          content += `${prefix} ${section.heading} (${section.wordCount} words)\n\n`;
          if (section.keyPoints.length > 0) {
            section.keyPoints.forEach(point => {
              content += `- ${point}\n`;
            });
            content += '\n';
          }
          if (section.content) {
            content += `${section.content}\n\n`;
          }
        });
        break;
        
      case 'json':
        content = JSON.stringify(outline, null, 2);
        break;
        
      case 'html':
        content = `<!DOCTYPE html><html><head><title>${outline.title}</title></head><body>`;
        content += `<h1>${outline.title}</h1>`;
        outline.sections.forEach(section => {
          content += `<h${section.level + 1}>${section.heading}</h${section.level + 1}>`;
          if (section.content) {
            content += `<p>${section.content}</p>`;
          }
        });
        content += '</body></html>';
        break;
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${format === 'markdown' ? 'md' : format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold mb-6">SEO Blog Outline Generator</h2>
        
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Blog Title</label>
            <input
              type="text"
              value={outline.title}
              onChange={(e) => setOutline(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., The Ultimate Guide to Content Marketing"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Target Keyword</label>
            <input
              type="text"
              value={outline.targetKeyword}
              onChange={(e) => setOutline(prev => ({ ...prev, targetKeyword: e.target.value }))}
              placeholder="e.g., content marketing strategy"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Target Audience</label>
            <input
              type="text"
              value={outline.targetAudience}
              onChange={(e) => setOutline(prev => ({ ...prev, targetAudience: e.target.value }))}
              placeholder="e.g., Marketing managers, Small business owners"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Content Goal</label>
            <input
              type="text"
              value={outline.contentGoal}
              onChange={(e) => setOutline(prev => ({ ...prev, contentGoal: e.target.value }))}
              placeholder="e.g., Educate, Generate leads, Build authority"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        
        {/* Secondary Keywords */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Secondary Keywords</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addSecondaryKeyword()}
              placeholder="Add secondary keywords..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
            />
            <button
              onClick={addSecondaryKeyword}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {outline.secondaryKeywords.map(keyword => (
              <span
                key={keyword}
                className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm"
              >
                {keyword}
                <button
                  onClick={() => removeSecondaryKeyword(keyword)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
        
        {/* Word Count and Templates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Target Word Count</label>
            <input
              type="number"
              value={outline.wordCount}
              onChange={(e) => setOutline(prev => ({ ...prev, wordCount: parseInt(e.target.value) }))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Template</label>
            <div className="flex gap-2">
              {Object.entries(BLOG_TEMPLATES).map(([key, template]) => (
                <button
                  key={key}
                  onClick={() => applyTemplate(key)}
                  className={cn(
                    "px-3 py-2 rounded-lg border text-sm",
                    selectedTemplate === key
                      ? "bg-primary text-white border-primary"
                      : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  )}
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={generateFullOutline}
            disabled={generatingOutline || !outline.title || !outline.targetKeyword}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {generatingOutline ? 'Generating...' : 'Generate Outline'}
          </button>
          <button
            onClick={analyzeSEO}
            disabled={analyzingSEO || outline.sections.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Target className="w-4 h-4" />
            {analyzingSEO ? 'Analyzing...' : 'Analyze SEO'}
          </button>
        </div>
      </div>
      
      {/* SEO Performance */}
      {outline.performance && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6"
        >
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            SEO Performance Estimate
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {outline.performance.seoScore}%
              </div>
              <div className="text-sm text-gray-600">SEO Score</div>
            </div>
            <div>
              <div className="text-lg font-medium">
                {outline.performance.readabilityScore}%
              </div>
              <div className="text-sm text-gray-600">Readability</div>
            </div>
            <div>
              <div className="text-lg font-medium">
                {outline.performance.keywordDensity}%
              </div>
              <div className="text-sm text-gray-600">Keyword Density</div>
            </div>
            <div>
              <div className="text-lg font-medium">
                {outline.performance.expectedTraffic}
              </div>
              <div className="text-sm text-gray-600">Expected Traffic</div>
            </div>
            <div>
              <div className={cn(
                "text-lg font-medium",
                outline.performance.competitionLevel === 'low' ? 'text-green-600' :
                outline.performance.competitionLevel === 'medium' ? 'text-yellow-600' :
                'text-red-600'
              )}>
                {outline.performance.competitionLevel}
              </div>
              <div className="text-sm text-gray-600">Competition</div>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Sections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Blog Structure ({totalWordCount} / {outline.wordCount} words)</h3>
          <button
            onClick={() => addSection()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Section
          </button>
        </div>
        
        {outline.sections.map((section, index) => (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <select
                    value={section.level}
                    onChange={(e) => updateSection(section.id, { level: parseInt(e.target.value) as 1 | 2 | 3 })}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm"
                  >
                    <option value="1">H2</option>
                    <option value="2">H3</option>
                    <option value="3">H4</option>
                  </select>
                  <input
                    type="text"
                    value={section.heading}
                    onChange={(e) => updateSection(section.id, { heading: e.target.value })}
                    className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg"
                  />
                  <input
                    type="number"
                    value={section.wordCount}
                    onChange={(e) => updateSection(section.id, { wordCount: parseInt(e.target.value) })}
                    className="w-24 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                  />
                  <span className="text-sm text-gray-500">words</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  {expandedSections.includes(section.id) ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => removeSection(section.id)}
                  className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <AnimatePresence>
              {expandedSections.includes(section.id) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium mb-1">Key Points</label>
                    <textarea
                      value={section.keyPoints.join('\n')}
                      onChange={(e) => updateSection(section.id, { keyPoints: e.target.value.split('\n').filter(p => p.trim()) })}
                      placeholder="Enter key points (one per line)"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Keywords for this section</label>
                    <input
                      type="text"
                      value={section.keywords.join(', ')}
                      onChange={(e) => updateSection(section.id, { keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k) })}
                      placeholder="Enter keywords separated by commas"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                    />
                  </div>
                  
                  {section.content && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Generated Content</label>
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">{section.content}</p>
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={() => generateSectionContent(section.id)}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate Content
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
      
      {/* SEO Metadata */}
      {outline.seoMetadata.metaTitle && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">SEO Metadata</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Meta Title</label>
              <input
                type="text"
                value={outline.seoMetadata.metaTitle}
                onChange={(e) => setOutline(prev => ({
                  ...prev,
                  seoMetadata: { ...prev.seoMetadata, metaTitle: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Meta Description</label>
              <textarea
                value={outline.seoMetadata.metaDescription}
                onChange={(e) => setOutline(prev => ({
                  ...prev,
                  seoMetadata: { ...prev.seoMetadata, metaDescription: e.target.value }
                }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">URL Slug</label>
                <input
                  type="text"
                  value={outline.seoMetadata.slug}
                  onChange={(e) => setOutline(prev => ({
                    ...prev,
                    seoMetadata: { ...prev.seoMetadata, slug: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reading Time</label>
                <input
                  type="text"
                  value={`${outline.seoMetadata.readingTime} min`}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50"
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Export Actions */}
      <div className="flex justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => exportOutline('markdown')}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Markdown
          </button>
          <button
            onClick={() => exportOutline('json')}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </button>
        </div>
        
        <button
          onClick={() => onGenerate && onGenerate(outline)}
          disabled={outline.sections.length === 0}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          Generate Blog Post
        </button>
      </div>
    </div>
  );
};