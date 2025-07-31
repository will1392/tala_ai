import React, { useState } from 'react';
import { FileText, Star, Download, Copy, Edit, Eye, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/cn';

interface TemplateSelectorProps {
  context: string | null;
  resources: any[];
  favorites: string[];
  recentlyUsed: any[];
  onSelect: (resource: any) => void;
  onToggleFavorite: (resourceId: string) => void;
  trackUsage: (resourceId: string, action: string) => void;
  searchQuery?: string;
}

interface Template {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  format?: 'text' | 'html' | 'markdown' | 'json';
  variables?: TemplateVariable[];
  preview?: string;
  usage?: number;
}

interface TemplateVariable {
  name: string;
  description: string;
  type: 'text' | 'number' | 'date' | 'select';
  default?: string;
  options?: string[];
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  context,
  resources,
  favorites,
  recentlyUsed,
  onSelect,
  onToggleFavorite,
  trackUsage,
  searchQuery
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [templateValues, setTemplateValues] = useState<Record<string, any>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter resources to templates
  const templates = resources.filter(r => r.type === 'template') as Template[];

  // Get unique categories
  const categories = ['all', ...new Set(templates.map(t => t.category).filter(Boolean))];

  // Apply filters
  let filteredTemplates = templates;
  if (selectedCategory !== 'all') {
    filteredTemplates = filteredTemplates.filter(t => t.category === selectedCategory);
  }

  // Sort by usage (most used first)
  filteredTemplates.sort((a, b) => (b.usage || 0) - (a.usage || 0));

  // Process template with variables
  const processTemplate = (template: Template): string => {
    let processed = template.content;
    
    if (template.variables) {
      template.variables.forEach(variable => {
        const value = templateValues[`${template.id}-${variable.name}`] || variable.default || `{${variable.name}}`;
        const regex = new RegExp(`\\{\\{\\s*${variable.name}\\s*\\}\\}`, 'g');
        processed = processed.replace(regex, value);
      });
    }
    
    return processed;
  };

  // Copy to clipboard
  const copyToClipboard = async (template: Template) => {
    try {
      const processed = processTemplate(template);
      await navigator.clipboard.writeText(processed);
      setCopiedId(template.id);
      trackUsage(template.id, 'copy');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Download template
  const downloadTemplate = (template: Template) => {
    const processed = processTemplate(template);
    const blob = new Blob([processed], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.title.toLowerCase().replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    trackUsage(template.id, 'download');
  };

  // Handle template click
  const handleTemplateClick = (template: Template) => {
    if (expandedTemplate === template.id) {
      setExpandedTemplate(null);
      setEditingTemplate(null);
    } else {
      setExpandedTemplate(template.id);
      trackUsage(template.id, 'view');
      onSelect(template);
    }
  };

  // Handle variable change
  const handleVariableChange = (templateId: string, variableName: string, value: string) => {
    setTemplateValues(prev => ({
      ...prev,
      [`${templateId}-${variableName}`]: value
    }));
  };

  if (templates.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No templates available</p>
        {context && (
          <p className="text-sm mt-2">
            Templates for {context} will be added soon
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-all",
              selectedCategory === category
                ? "bg-primary text-white"
                : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
            )}
          >
            {category === 'all' ? 'All Templates' : category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {/* Templates grid */}
      <div className="space-y-3">
        {filteredTemplates.map((template) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* Template header */}
            <div
              className="p-4 cursor-pointer"
              onClick={() => handleTemplateClick(template)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{template.title}</h4>
                    {template.usage && template.usage > 10 && (
                      <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {template.description}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(template.id);
                    }}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Star
                      className={cn(
                        "w-4 h-4",
                        favorites.includes(template.id)
                          ? "text-yellow-500 fill-yellow-500"
                          : "text-gray-400"
                      )}
                    />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(template);
                    }}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Copy
                      className={cn(
                        "w-4 h-4",
                        copiedId === template.id
                          ? "text-green-500"
                          : "text-gray-400"
                      )}
                    />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadTemplate(template);
                    }}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Download className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-3">
                {template.tags.slice(0, 3).map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
                {template.variables && (
                  <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    {template.variables.length} variables
                  </span>
                )}
              </div>
            </div>

            {/* Expanded content */}
            <AnimatePresence>
              {expandedTemplate === template.id && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
                    {/* Variables editor */}
                    {template.variables && template.variables.length > 0 && (
                      <div className="mt-4 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-medium text-sm">Customize Template</h5>
                          <button
                            onClick={() => setEditingTemplate(
                              editingTemplate === template.id ? null : template.id
                            )}
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            <Edit className="w-3 h-3" />
                            {editingTemplate === template.id ? 'Hide' : 'Edit'}
                          </button>
                        </div>
                        
                        <AnimatePresence>
                          {editingTemplate === template.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="space-y-3"
                            >
                              {template.variables.map(variable => (
                                <div key={variable.name}>
                                  <label className="block text-sm font-medium mb-1">
                                    {variable.name}
                                  </label>
                                  <p className="text-xs text-gray-500 mb-1">
                                    {variable.description}
                                  </p>
                                  {variable.type === 'select' && variable.options ? (
                                    <select
                                      value={templateValues[`${template.id}-${variable.name}`] || variable.default || ''}
                                      onChange={(e) => handleVariableChange(template.id, variable.name, e.target.value)}
                                      className={cn(
                                        "w-full px-3 py-2 text-sm rounded-lg",
                                        "border border-gray-300 dark:border-gray-600",
                                        "bg-white dark:bg-gray-900",
                                        "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                                      )}
                                    >
                                      {variable.options.map(option => (
                                        <option key={option} value={option}>
                                          {option}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type={variable.type === 'number' ? 'number' : 'text'}
                                      value={templateValues[`${template.id}-${variable.name}`] || variable.default || ''}
                                      onChange={(e) => handleVariableChange(template.id, variable.name, e.target.value)}
                                      placeholder={`Enter ${variable.name}...`}
                                      className={cn(
                                        "w-full px-3 py-2 text-sm rounded-lg",
                                        "border border-gray-300 dark:border-gray-600",
                                        "bg-white dark:bg-gray-900",
                                        "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                                      )}
                                    />
                                  )}
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Template preview */}
                    <div className="relative">
                      <div className="absolute top-3 right-3 flex items-center gap-2">
                        <span className="text-xs text-gray-500">Preview</span>
                        <Eye className="w-4 h-4 text-gray-400" />
                      </div>
                      <pre className="whitespace-pre-wrap text-sm bg-gray-50 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
                        {processTemplate(template)}
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
      {filteredTemplates.length === 0 && (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No templates in this category</p>
          <button
            onClick={() => setSelectedCategory('all')}
            className="mt-3 text-sm text-primary hover:underline"
          >
            View all templates
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
            Template copied to clipboard!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};