import React, { useState, useEffect } from 'react';
import { Mail, Plus, Trash2, Edit3, Copy, Download, Sparkles, ChevronDown, ChevronUp, Target, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { cn } from '../../../utils/cn';
import { useContentGeneration } from '../../../hooks/useContentGeneration';

interface EmailSequenceBuilderProps {
  onGenerate?: (sequence: EmailSequence) => void;
  initialData?: any;
  context?: string;
}

interface EmailSequence {
  id: string;
  name: string;
  goal: string;
  targetAudience: string;
  emails: Email[];
  settings: SequenceSettings;
}

interface Email {
  id: string;
  subject: string;
  previewText: string;
  content: string;
  sendAfter: number; // days after trigger
  tone: 'professional' | 'friendly' | 'casual' | 'urgent' | 'empathetic';
  purpose: string;
  callToAction: string;
  personalization: string[];
}

interface SequenceSettings {
  triggerEvent: string;
  totalDuration: number;
  includeABTesting: boolean;
  performancePrediction?: PerformancePrediction;
}

interface PerformancePrediction {
  overallScore: number;
  openRateRange: [number, number];
  clickRateRange: [number, number];
  conversionEstimate: number;
}

const EMAIL_TEMPLATES = {
  welcome: {
    name: 'Welcome Series',
    emails: [
      { day: 0, purpose: 'Welcome & set expectations', tone: 'friendly' },
      { day: 1, purpose: 'Share value proposition', tone: 'professional' },
      { day: 3, purpose: 'Customer success story', tone: 'friendly' },
      { day: 7, purpose: 'Special offer', tone: 'urgent' }
    ]
  },
  abandonment: {
    name: 'Cart Abandonment',
    emails: [
      { day: 0, purpose: 'Gentle reminder', tone: 'friendly' },
      { day: 1, purpose: 'Urgency + discount', tone: 'urgent' },
      { day: 3, purpose: 'Last chance + social proof', tone: 'empathetic' }
    ]
  },
  nurture: {
    name: 'Lead Nurture',
    emails: [
      { day: 0, purpose: 'Educational content', tone: 'professional' },
      { day: 3, purpose: 'Case study', tone: 'professional' },
      { day: 7, purpose: 'Product demo invite', tone: 'friendly' },
      { day: 14, purpose: 'Consultation offer', tone: 'professional' }
    ]
  }
};

export const EmailSequenceBuilder: React.FC<EmailSequenceBuilderProps> = ({
  onGenerate,
  initialData,
  context
}) => {
  const [sequence, setSequence] = useState<EmailSequence>({
    id: Date.now().toString(),
    name: '',
    goal: '',
    targetAudience: '',
    emails: [],
    settings: {
      triggerEvent: '',
      totalDuration: 7,
      includeABTesting: false
    }
  });

  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [generatingContent, setGeneratingContent] = useState<string | null>(null);
  const [expandedEmails, setExpandedEmails] = useState<string[]>([]);

  const { generateContent, adjustTone, predictPerformance } = useContentGeneration();

  // Initialize with data if provided
  useEffect(() => {
    if (initialData) {
      setSequence(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  // Apply template
  const applyTemplate = (templateKey: string) => {
    const template = EMAIL_TEMPLATES[templateKey as keyof typeof EMAIL_TEMPLATES];
    if (!template) return;

    const emails = template.emails.map((emailTemplate, index) => ({
      id: Date.now().toString() + index,
      subject: '',
      previewText: '',
      content: '',
      sendAfter: emailTemplate.day,
      tone: emailTemplate.tone,
      purpose: emailTemplate.purpose,
      callToAction: '',
      personalization: ['first_name']
    }));

    setSequence(prev => ({
      ...prev,
      name: template.name,
      emails
    }));
    setSelectedTemplate(templateKey);
  };

  // Add new email
  const addEmail = () => {
    const newEmail: Email = {
      id: Date.now().toString(),
      subject: '',
      previewText: '',
      content: '',
      sendAfter: sequence.emails.length > 0 
        ? Math.max(...sequence.emails.map(e => e.sendAfter)) + 1 
        : 0,
      tone: 'professional',
      purpose: '',
      callToAction: '',
      personalization: ['first_name']
    };

    setSequence(prev => ({
      ...prev,
      emails: [...prev.emails, newEmail]
    }));
    setEditingEmail(newEmail.id);
    setExpandedEmails([...expandedEmails, newEmail.id]);
  };

  // Remove email
  const removeEmail = (emailId: string) => {
    setSequence(prev => ({
      ...prev,
      emails: prev.emails.filter(e => e.id !== emailId)
    }));
    setExpandedEmails(expandedEmails.filter(id => id !== emailId));
  };

  // Update email
  const updateEmail = (emailId: string, updates: Partial<Email>) => {
    setSequence(prev => ({
      ...prev,
      emails: prev.emails.map(email => 
        email.id === emailId ? { ...email, ...updates } : email
      )
    }));
  };

  // Generate email content
  const generateEmailContent = async (emailId: string) => {
    const email = sequence.emails.find(e => e.id === emailId);
    if (!email || !sequence.goal || !sequence.targetAudience) return;

    setGeneratingContent(emailId);
    
    try {
      const prompt = `
        Generate email content for:
        Sequence Goal: ${sequence.goal}
        Target Audience: ${sequence.targetAudience}
        Email Purpose: ${email.purpose}
        Tone: ${email.tone}
        Send Day: ${email.sendAfter}
        CTA: ${email.callToAction || 'Learn more'}
      `;

      const generated = await generateContent('email', prompt);
      
      updateEmail(emailId, {
        subject: generated.subject || `Email ${email.sendAfter + 1}: ${email.purpose}`,
        previewText: generated.previewText || email.purpose,
        content: generated.content || ''
      });
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setGeneratingContent(null);
    }
  };

  // Predict sequence performance
  const analyzeSequence = async () => {
    if (sequence.emails.length === 0) return;

    const prediction = await predictPerformance('email-sequence', {
      emailCount: sequence.emails.length,
      duration: sequence.settings.totalDuration,
      audience: sequence.targetAudience,
      tones: sequence.emails.map(e => e.tone)
    });

    setSequence(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        performancePrediction: prediction
      }
    }));
  };

  // Export sequence
  const exportSequence = (format: 'json' | 'csv' | 'html') => {
    let content = '';
    const filename = `${sequence.name.toLowerCase().replace(/\s+/g, '-')}-sequence`;

    switch (format) {
      case 'json':
        content = JSON.stringify(sequence, null, 2);
        break;
      case 'csv':
        content = 'Day,Subject,Preview,Purpose,Tone,CTA\n';
        sequence.emails.forEach(email => {
          content += `${email.sendAfter},"${email.subject}","${email.previewText}","${email.purpose}",${email.tone},"${email.callToAction}"\n`;
        });
        break;
      case 'html':
        content = `<html><body><h1>${sequence.name}</h1>`;
        sequence.emails.forEach(email => {
          content += `<div><h2>Day ${email.sendAfter}: ${email.subject}</h2><p>${email.content}</p></div>`;
        });
        content += '</body></html>';
        break;
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

  // Toggle email expansion
  const toggleEmailExpansion = (emailId: string) => {
    setExpandedEmails(prev => 
      prev.includes(emailId) 
        ? prev.filter(id => id !== emailId)
        : [...prev, emailId]
    );
  };

  // Handle drag end
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(sequence.emails);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSequence(prev => ({ ...prev, emails: items }));
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold mb-6">Email Sequence Builder</h2>
        
        {/* Sequence Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Sequence Name</label>
            <input
              type="text"
              value={sequence.name}
              onChange={(e) => setSequence(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Welcome Series, Cart Recovery"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Trigger Event</label>
            <input
              type="text"
              value={sequence.settings.triggerEvent}
              onChange={(e) => setSequence(prev => ({ 
                ...prev, 
                settings: { ...prev.settings, triggerEvent: e.target.value }
              }))}
              placeholder="e.g., Sign up, Cart abandonment, Download"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Campaign Goal</label>
            <input
              type="text"
              value={sequence.goal}
              onChange={(e) => setSequence(prev => ({ ...prev, goal: e.target.value }))}
              placeholder="e.g., Convert trials to paid, Recover abandoned carts"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Target Audience</label>
            <input
              type="text"
              value={sequence.targetAudience}
              onChange={(e) => setSequence(prev => ({ ...prev, targetAudience: e.target.value }))}
              placeholder="e.g., New subscribers, Cart abandoners, Trial users"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Templates */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Start with a Template</label>
          <div className="flex gap-2">
            {Object.entries(EMAIL_TEMPLATES).map(([key, template]) => (
              <button
                key={key}
                onClick={() => applyTemplate(key)}
                className={cn(
                  "px-4 py-2 rounded-lg border transition-all",
                  selectedTemplate === key
                    ? "bg-primary text-white border-primary"
                    : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-primary"
                )}
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={sequence.settings.includeABTesting}
              onChange={(e) => setSequence(prev => ({
                ...prev,
                settings: { ...prev.settings, includeABTesting: e.target.checked }
              }))}
              className="rounded"
            />
            <span className="text-sm">Include A/B Testing Variants</span>
          </label>
          
          <button
            onClick={analyzeSequence}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Target className="w-4 h-4" />
            Predict Performance
          </button>
        </div>
      </div>

      {/* Performance Prediction */}
      {sequence.settings.performancePrediction && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6"
        >
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Performance Prediction
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {sequence.settings.performancePrediction.overallScore}%
              </div>
              <div className="text-sm text-gray-600">Overall Score</div>
            </div>
            <div>
              <div className="text-lg font-medium">
                {sequence.settings.performancePrediction.openRateRange[0]}-
                {sequence.settings.performancePrediction.openRateRange[1]}%
              </div>
              <div className="text-sm text-gray-600">Open Rate</div>
            </div>
            <div>
              <div className="text-lg font-medium">
                {sequence.settings.performancePrediction.clickRateRange[0]}-
                {sequence.settings.performancePrediction.clickRateRange[1]}%
              </div>
              <div className="text-sm text-gray-600">Click Rate</div>
            </div>
            <div>
              <div className="text-lg font-medium">
                {sequence.settings.performancePrediction.conversionEstimate}%
              </div>
              <div className="text-sm text-gray-600">Est. Conversion</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Email List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Email Sequence</h3>
          <button
            onClick={addEmail}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Email
          </button>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="emails">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                {sequence.emails.map((email, index) => (
                  <Draggable key={email.id} draggableId={email.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={cn(
                          "bg-white dark:bg-gray-800 rounded-lg shadow-sm",
                          snapshot.isDragging && "shadow-lg"
                        )}
                      >
                        <div className="p-4">
                          {/* Email Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3 flex-1">
                              <div {...provided.dragHandleProps} className="cursor-move">
                                <Mail className="w-5 h-5 text-gray-400" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">Day {email.sendAfter}</span>
                                  <span className="text-sm text-gray-500">•</span>
                                  <span className="text-sm text-gray-500">{email.purpose || 'No purpose set'}</span>
                                </div>
                                {email.subject && (
                                  <div className="text-sm text-gray-600 mt-1">
                                    Subject: {email.subject}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleEmailExpansion(email.id)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                              >
                                {expandedEmails.includes(email.id) ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => removeEmail(email.id)}
                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Expanded Content */}
                          <AnimatePresence>
                            {expandedEmails.includes(email.id) && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="space-y-4"
                              >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Send After (days)</label>
                                    <input
                                      type="number"
                                      value={email.sendAfter}
                                      onChange={(e) => updateEmail(email.id, { sendAfter: parseInt(e.target.value) })}
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                                    />
                                  </div>
                                  
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Tone</label>
                                    <select
                                      value={email.tone}
                                      onChange={(e) => updateEmail(email.id, { tone: e.target.value as Email['tone'] })}
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                                    >
                                      <option value="professional">Professional</option>
                                      <option value="friendly">Friendly</option>
                                      <option value="casual">Casual</option>
                                      <option value="urgent">Urgent</option>
                                      <option value="empathetic">Empathetic</option>
                                    </select>
                                  </div>
                                  
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Purpose</label>
                                    <input
                                      type="text"
                                      value={email.purpose}
                                      onChange={(e) => updateEmail(email.id, { purpose: e.target.value })}
                                      placeholder="e.g., Welcome, Educate, Convert"
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                                    />
                                  </div>
                                  
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Call to Action</label>
                                    <input
                                      type="text"
                                      value={email.callToAction}
                                      onChange={(e) => updateEmail(email.id, { callToAction: e.target.value })}
                                      placeholder="e.g., Shop Now, Learn More"
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium mb-1">Subject Line</label>
                                  <input
                                    type="text"
                                    value={email.subject}
                                    onChange={(e) => updateEmail(email.id, { subject: e.target.value })}
                                    placeholder="Enter email subject line"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium mb-1">Preview Text</label>
                                  <input
                                    type="text"
                                    value={email.previewText}
                                    onChange={(e) => updateEmail(email.id, { previewText: e.target.value })}
                                    placeholder="Text that appears after subject line"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium mb-1">Email Content</label>
                                  <textarea
                                    value={email.content}
                                    onChange={(e) => updateEmail(email.id, { content: e.target.value })}
                                    placeholder="Write your email content here..."
                                    rows={6}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                                  />
                                </div>

                                <div className="flex gap-2">
                                  <button
                                    onClick={() => generateEmailContent(email.id)}
                                    disabled={generatingContent === email.id}
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50"
                                  >
                                    <Sparkles className="w-4 h-4" />
                                    {generatingContent === email.id ? 'Generating...' : 'Generate Content'}
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => exportSequence('json')}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </button>
          <button
            onClick={() => exportSequence('csv')}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
        
        <button
          onClick={() => onGenerate && onGenerate(sequence)}
          disabled={sequence.emails.length === 0}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Generate Sequence
        </button>
      </div>
    </div>
  );
};