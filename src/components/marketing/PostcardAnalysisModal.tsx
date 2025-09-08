/**
 * PostcardAnalysisModal - Displays AI-generated postcard analysis
 * Shows comprehensive analysis for 4x6, 6x9, and 6x11 postcards
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Save, 
  Download, 
  Copy, 
  Image as ImageIcon,
  Type,
  Gift,
  Target,
  Palette,
  CheckCircle,
  Loader,
  AlertCircle,
  Maximize2,
  Minimize2,
  FileText
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../shared/Badge';
import { useToast } from '../toast/ToastProvider';

interface PostcardSize {
  size: '4x6' | '6x9' | '6x11';
  label: string;
  description: string;
}

interface PostcardAnalysis {
  size: string;
  headline: string;
  subheadline: string;
  bodyCopy: string;
  offer: string;
  callToAction: {
    primary: string;
    secondary: string;
  };
  imageRecommendations: string[];
  colorPalette: string[];
  layoutNotes: string;
  printSpecs: {
    bleed: string;
    safeZone: string;
    resolution: string;
  };
}

interface AnalysisData {
  campaignId: string;
  campaignName: string;
  analyses: PostcardAnalysis[];
  metadata: {
    generatedAt: string;
    models: {
      analysis: string;
      copywriting: string;
    };
  };
}

interface PostcardAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  campaignName: string;
  consultationData: any;
  brandId: string;
  onSave?: (analysisData: AnalysisData) => void;
}

const POSTCARD_SIZES: PostcardSize[] = [
  {
    size: '4x6',
    label: '4" × 6" Standard',
    description: 'Most cost-effective, perfect for simple offers'
  },
  {
    size: '6x9',
    label: '6" × 9" Jumbo',
    description: 'More space for details, higher visibility'
  },
  {
    size: '6x11',
    label: '6" × 11" Oversized',
    description: 'Maximum impact, ideal for luxury offerings'
  }
];

export function PostcardAnalysisModal({
  isOpen,
  onClose,
  campaignId,
  campaignName,
  consultationData,
  brandId,
  onSave
}: PostcardAnalysisModalProps) {
  console.log('[PostcardAnalysisModal] Component rendered with props:', {
    isOpen,
    campaignId,
    campaignName,
    hasConsultationData: !!consultationData,
    brandId
  });

  const [selectedSize, setSelectedSize] = useState<'4x6' | '6x9' | '6x11'>('6x9');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { push: pushToast } = useToast();

  // Load analysis when modal opens
  React.useEffect(() => {
    console.log('[PostcardAnalysisModal] useEffect triggered:', { isOpen, hasAnalysisData: !!analysisData });
    if (isOpen && !analysisData) {
      generateAnalysis();
    }
  }, [isOpen]);

  const generateAnalysis = async () => {
    console.log('[PostcardAnalysisModal] Generating analysis...');
    setIsLoading(true);
    try {
      const response = await fetch('/api/direct-mail-agent/analyze-postcards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': brandId
        },
        body: JSON.stringify({
          consultationData,
          campaignId,
          sizes: ['4x6', '6x9', '6x11']
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate analysis');
      }

      const data = await response.json();
      setAnalysisData(data);
      
    } catch (error) {
      console.error('Failed to generate analysis:', error);
      pushToast({
        kind: 'error',
        message: 'Failed to generate postcard analysis',
        description: 'Please try again'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveAnalysis = async () => {
    if (!analysisData) return;
    
    setIsSaving(true);
    try {
      // Save to campaign
      const response = await fetch(`/api/direct-mail-campaigns/${campaignId}/analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': brandId
        },
        body: JSON.stringify(analysisData)
      });

      if (!response.ok) {
        throw new Error('Failed to save analysis');
      }

      pushToast({
        kind: 'success',
        message: 'Analysis saved successfully',
        description: 'You can access it anytime from your campaign'
      });

      if (onSave) {
        onSave(analysisData);
      }
      
    } catch (error) {
      pushToast({
        kind: 'error',
        message: 'Failed to save analysis',
        description: 'Please try again'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    pushToast({
      kind: 'success',
      message: `${label} copied to clipboard`
    });
  };

  const downloadAnalysis = () => {
    if (!analysisData) return;
    
    const content = JSON.stringify(analysisData, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${campaignName.replace(/\s+/g, '-')}-postcard-analysis.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    pushToast({
      kind: 'success',
      message: 'Analysis downloaded'
    });
  };

  const currentAnalysis = analysisData?.analyses.find(a => a.size === selectedSize);

  console.log('[PostcardAnalysisModal] About to render, isOpen:', isOpen);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Modal Container - Centers the modal */}
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className={`relative bg-white rounded-xl shadow-2xl flex flex-col ${
                  isFullscreen 
                    ? 'w-full h-full max-w-none' 
                    : 'w-full max-w-7xl h-[90vh]'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0 bg-secondary text-white">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">Postcard Analysis</h2>
                <p className="text-primary-100 mt-1 text-sm sm:text-base font-medium">{campaignName}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  variant="ghost"
                  size="sm"
                  title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                  className="hidden sm:flex text-white hover:bg-white/20"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
                <Button
                  onClick={downloadAnalysis}
                  variant="ghost"
                  size="sm"
                  disabled={!analysisData}
                  title="Download analysis"
                  className="hidden sm:flex text-white hover:bg-white/20"
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  onClick={saveAnalysis}
                  variant="primary"
                  size="sm"
                  disabled={!analysisData || isSaving}
                  className="bg-primary text-white hover:bg-primary-dark"
                >
                  {isSaving ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span className="ml-1 sm:ml-2 hidden sm:inline">Save to Campaign</span>
                </Button>
                <Button
                  onClick={onClose}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col sm:flex-row">
              {/* Size Selector */}
              <div className="w-full sm:w-64 border-b sm:border-b-0 sm:border-r border-gray-200 p-4 sm:p-6 overflow-y-auto flex-shrink-0 bg-gray-50">
                <h3 className="font-semibold mb-3 sm:mb-4 text-secondary">Postcard Sizes</h3>
                <div className="flex sm:flex-col gap-2 sm:gap-3 overflow-x-auto sm:overflow-x-visible pb-2 sm:pb-0">
                  {POSTCARD_SIZES.map((size) => (
                    <button
                      key={size.size}
                      onClick={() => setSelectedSize(size.size)}
                      className={`flex-shrink-0 sm:w-full text-left p-3 sm:p-4 rounded-lg border-2 transition-all ${
                        selectedSize === size.size
                          ? 'border-primary bg-primary text-white shadow-md'
                          : 'border-gray-300 bg-white hover:border-primary-300 hover:shadow-sm'
                      }`}
                    >
                      <div className={`font-medium text-sm sm:text-base whitespace-nowrap sm:whitespace-normal ${
                        selectedSize === size.size ? 'text-white' : 'text-gray-900'
                      }`}>{size.label}</div>
                      <div className={`text-xs sm:text-sm mt-1 hidden sm:block ${
                        selectedSize === size.size ? 'text-white/90' : 'text-gray-600'
                      }`}>{size.description}</div>
                    </button>
                  ))}
                </div>

                {analysisData && (
                  <div className="mt-6 p-4 bg-primary-50 rounded-lg border border-primary-200">
                    <div className="flex items-center gap-2 text-sm text-secondary font-medium">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span>Analysis complete</span>
                    </div>
                    <div className="text-xs text-secondary-light mt-2">
                      Generated {new Date(analysisData.metadata.generatedAt).toLocaleTimeString()}
                    </div>
                  </div>
                )}
              </div>

              {/* Analysis Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {isLoading ? (
                  <div className="space-y-6">
                    {/* Show consultation summary while loading */}
                    <Card className="p-6 border-2 border-gray-200 bg-primary-50">
                      <h3 className="font-semibold text-lg mb-4">Analyzing Your Campaign</h3>
                      <div className="space-y-3 text-sm">
                        <div>
                          <span className="font-semibold">Travel Specialty:</span> {consultationData?.responses?.travel_specialty || consultationData?.travel_specialty || 'Not specified'}
                        </div>
                        <div>
                          <span className="font-semibold">Target Audience:</span> {consultationData?.responses?.ideal_client || consultationData?.ideal_client || 'Not specified'}
                        </div>
                        <div>
                          <span className="font-semibold">Primary Goal:</span> {consultationData?.responses?.primary_campaign_goal || consultationData?.primary_campaign_goal || 'Not specified'}
                        </div>
                        <div>
                          <span className="font-semibold">Main Offer:</span> {consultationData?.responses?.campaign_offer || consultationData?.campaign_offer || 'Not specified'}
                        </div>
                        <div>
                          <span className="font-semibold">Budget:</span> {consultationData?.responses?.campaign_budget || consultationData?.campaign_budget || 'Not specified'}
                        </div>
                      </div>
                    </Card>
                    
                    <div className="flex items-center justify-center p-8">
                      <div className="text-center">
                        <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                        <p className="text-secondary font-medium">Generating AI-powered postcard analysis...</p>
                        <p className="text-sm text-secondary-light mt-2">Analyzing 3 postcard sizes with multi-agent AI</p>
                      </div>
                    </div>
                  </div>
                ) : currentAnalysis ? (
                  <div className="space-y-6">
                    {/* Headline Section */}
                    <Card className="p-6 border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-secondary rounded-lg">
                            <Type className="w-5 h-5 text-white" />
                          </div>
                          <h3 className="font-semibold text-lg text-white">Headline & Copy</h3>
                        </div>
                        <Button
                          onClick={() => copyToClipboard(currentAnalysis.headline, 'Headline')}
                          variant="ghost"
                          size="sm"
                          className="hover:bg-gray-100"
                        >
                          <Copy className="w-4 h-4 text-secondary" />
                        </Button>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Headline</label>
                          <p className="mt-2 text-lg font-bold text-gray-900">{currentAnalysis.headline}</p>
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Subheadline</label>
                          <p className="mt-2 text-gray-800 font-medium">{currentAnalysis.subheadline}</p>
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Body Copy</label>
                          <p className="mt-2 text-gray-800 whitespace-pre-wrap leading-relaxed">{currentAnalysis.bodyCopy}</p>
                        </div>
                      </div>
                    </Card>

                    {/* Offer Section */}
                    <Card className="p-6 border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-primary rounded-lg">
                            <Gift className="w-5 h-5 text-white" />
                          </div>
                          <h3 className="font-semibold text-lg text-white">Offer & Call to Action</h3>
                        </div>
                        <Button
                          onClick={() => copyToClipboard(currentAnalysis.offer, 'Offer')}
                          variant="ghost"
                          size="sm"
                          className="hover:bg-gray-100"
                        >
                          <Copy className="w-4 h-4 text-secondary" />
                        </Button>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="p-4 bg-primary-50 rounded-lg border-2 border-primary-300">
                          <label className="text-xs font-semibold text-secondary uppercase tracking-wider">Special Offer</label>
                          <p className="mt-2 font-bold text-secondary text-lg">{currentAnalysis.offer}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-primary text-white p-4 rounded-lg">
                            <label className="text-xs font-semibold uppercase tracking-wider opacity-90">Primary CTA</label>
                            <p className="mt-2 font-bold text-lg">{currentAnalysis.callToAction.primary}</p>
                          </div>
                          <div className="bg-gray-100 p-4 rounded-lg">
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Secondary CTA</label>
                            <p className="mt-2 font-medium text-gray-800">{currentAnalysis.callToAction.secondary}</p>
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Visual Recommendations */}
                    <Card className="p-6 border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-secondary-light rounded-lg">
                          <ImageIcon className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="font-semibold text-lg text-white">Visual Recommendations</h3>
                      </div>
                      
                      <div className="space-y-6">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3 block">Image Suggestions</label>
                          <ul className="space-y-3">
                            {currentAnalysis.imageRecommendations.map((recommendation, idx) => (
                              <li key={idx} className="flex items-start gap-3 bg-white p-3 rounded-md border border-gray-200">
                                <span className="text-primary font-bold text-lg mt-0.5">{idx + 1}</span>
                                <span className="text-gray-800 flex-1">{recommendation}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-3">Color Palette</label>
                          <div className="flex gap-3 flex-wrap">
                            {currentAnalysis.colorPalette.map((color, idx) => (
                              <div key={idx} className="text-center">
                                <div
                                  className="w-16 h-16 rounded-lg shadow-md relative group cursor-pointer transform hover:scale-110 transition-transform"
                                  style={{ backgroundColor: color }}
                                  title={color}
                                >
                                  <span className="absolute inset-0 flex items-center justify-center text-xs font-mono opacity-0 group-hover:opacity-100 bg-black/75 text-white rounded-lg">
                                    {color}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 mt-1 font-mono">{color}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Layout & Print Specs */}
                    <Card className="p-6 border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-primary-dark rounded-lg">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="font-semibold text-lg text-white">Layout & Print Specifications</h3>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Layout Notes</label>
                          <p className="mt-2 text-gray-800 leading-relaxed">{currentAnalysis.layoutNotes}</p>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 pt-4 border-t-2 border-gray-200">
                          <div className="bg-primary-50 p-3 rounded-lg text-center">
                            <label className="text-xs font-semibold text-secondary uppercase">Bleed</label>
                            <p className="mt-1 font-mono text-lg font-bold text-secondary">{currentAnalysis.printSpecs.bleed}</p>
                          </div>
                          <div className="bg-secondary-50 p-3 rounded-lg text-center">
                            <label className="text-xs font-semibold text-secondary uppercase">Safe Zone</label>
                            <p className="mt-1 font-mono text-lg font-bold text-secondary">{currentAnalysis.printSpecs.safeZone}</p>
                          </div>
                          <div className="bg-gray-100 p-3 rounded-lg text-center">
                            <label className="text-xs font-semibold text-secondary uppercase">Resolution</label>
                            <p className="mt-1 font-mono text-lg font-bold text-secondary">{currentAnalysis.printSpecs.resolution}</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <AlertCircle className="w-8 h-8 mx-auto mb-4 text-primary-300" />
                      <p className="text-secondary font-medium">No analysis available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t-2 border-gray-200 p-3 sm:p-4 bg-gray-50 flex-shrink-0">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="text-xs sm:text-sm text-secondary font-medium text-center sm:text-left">
                  Powered by <span className="text-primary font-semibold">GPT-4o Analysis</span> & <span className="text-primary-dark font-semibold">AI Copywriting</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white shadow-md border border-gray-200">
                    <CheckCircle className="w-3 h-3 text-primary" />
                    <span className="text-xs sm:text-sm font-medium text-primary">{analysisData?.analyses.length || 0} sizes analyzed</span>
                  </div>
                </div>
              </div>
            </div>
              </motion.div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}