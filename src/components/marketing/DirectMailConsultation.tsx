/**
 * DirectMailConsultation - In-dashboard consultation for direct mail campaigns
 * Guides users through all 8 sections of the questionnaire
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  ChevronLeft, 
  Save, 
  Send, 
  Mail,
  Target,
  MessageSquare,
  Palette,
  Calendar,
  DollarSign,
  TrendingUp,
  Package,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../shared/Input';
import { Textarea } from '../shared/Textarea';
import { Badge } from '../shared/Badge';
import { Select } from '../ui/Select';
import { Progress } from '../ui/Progress';
import { useToast } from '../toast/ToastProvider';
import type { MarketingProfile } from '../../types/marketing';
import { TalaFieldAssistant } from './TalaFieldAssistant';

// Section definitions
const CONSULTATION_SECTIONS = [
  {
    id: 'business_objectives',
    title: 'Business & Marketing Objectives',
    icon: Target,
    description: 'Understanding your agency and goals',
    questions: [
      {
        id: 'travel_specialty',
        label: 'What type of travel experiences do you specialize in?',
        type: 'select',
        options: [
          'Luxury Cruises',
          'River Cruises',
          'Adventure Travel',
          'Family Vacations',
          'All-Inclusive Resorts',
          'Guided Tours',
          'Custom/FIT Travel',
          'Corporate Travel',
          'Other'
        ],
        required: true
      },
      {
        id: 'business_goals',
        label: 'What are your primary business goals for the next 6-12 months?',
        type: 'textarea',
        placeholder: 'e.g., Increase bookings by 20%, expand into luxury market, etc.',
        required: true
      },
      {
        id: 'previous_direct_mail',
        label: 'Have you used direct mail before?',
        type: 'radio',
        options: ['Yes', 'No'],
        required: true
      },
      {
        id: 'previous_results',
        label: 'If yes, what results did you see?',
        type: 'textarea',
        placeholder: 'Share your experience with previous campaigns',
        conditional: { field: 'previous_direct_mail', value: 'Yes' }
      },
      {
        id: 'primary_campaign_goal',
        label: 'What\'s the primary goal for this campaign?',
        type: 'select',
        options: [
          'Generate new leads',
          'Book specific trips',
          'Drive brand awareness',
          'Reactivate past clients',
          'Promote special offers',
          'Other'
        ],
        required: true
      }
    ]
  },
  {
    id: 'target_audience',
    title: 'Target Audience Discovery',
    icon: Target,
    description: 'Defining who you want to reach',
    questions: [
      {
        id: 'ideal_client',
        label: 'Describe your ideal client for this campaign',
        type: 'textarea',
        placeholder: 'Be specific about demographics, interests, travel preferences, etc.',
        required: true
      },
      {
        id: 'audience_type',
        label: 'Who are you targeting?',
        type: 'checkbox',
        options: [
          'New prospects',
          'Existing clients',
          'Past clients (inactive)',
          'Referral sources'
        ],
        required: true
      },
      {
        id: 'demographics',
        label: 'What demographics best describe your target?',
        type: 'group',
        fields: [
          {
            id: 'age_range',
            label: 'Age Range',
            type: 'select',
            options: ['25-34', '35-44', '45-54', '55-64', '65+', 'Mixed'],
            required: true
          },
          {
            id: 'income_level',
            label: 'Income Level',
            type: 'select',
            options: ['$50k-75k', '$75k-100k', '$100k-150k', '$150k-250k', '$250k+'],
            required: true
          },
          {
            id: 'location',
            label: 'Geographic Location',
            type: 'text',
            placeholder: 'City, state, or region',
            required: true
          }
        ]
      },
      {
        id: 'mailing_list',
        label: 'Do you have a mailing list?',
        type: 'radio',
        options: ['Yes - I have my own list', 'No - I need to purchase/build one', 'Partial - I need to expand it'],
        required: true
      },
      {
        id: 'list_size',
        label: 'If you have a list, how many contacts?',
        type: 'number',
        placeholder: 'Number of contacts',
        conditional: { field: 'mailing_list', value: 'Yes - I have my own list' }
      }
    ]
  },
  {
    id: 'offer_message',
    title: 'Offer & Message Strategy',
    icon: MessageSquare,
    description: 'Crafting your compelling message',
    questions: [
      {
        id: 'campaign_offer',
        label: 'What\'s the main offer or message?',
        type: 'textarea',
        placeholder: 'e.g., Save $500 on European river cruises, Exclusive small group tours',
        required: true
      },
      {
        id: 'value_proposition',
        label: 'What value do you want to emphasize?',
        type: 'checkbox',
        options: [
          'Special pricing/discounts',
          'Exclusive access',
          'Personalized service',
          'Expertise/knowledge',
          'Unique experiences',
          'Convenience',
          'Safety/security'
        ],
        required: true
      },
      {
        id: 'common_objections',
        label: 'What objections does your audience typically have?',
        type: 'textarea',
        placeholder: 'e.g., Too expensive, too much planning, safety concerns',
        required: true
      },
      {
        id: 'differentiators',
        label: 'What makes you different from online booking sites?',
        type: 'textarea',
        placeholder: 'Your unique value proposition',
        required: true
      },
      {
        id: 'featured_destinations',
        label: 'Any specific destinations or partners to feature?',
        type: 'textarea',
        placeholder: 'e.g., Viking River Cruises, Sandals Resorts, specific destinations'
      }
    ]
  },
  {
    id: 'design_format',
    title: 'Design & Format',
    icon: Palette,
    description: 'Visual and format decisions',
    questions: [
      {
        id: 'format_preference',
        label: 'What format do you prefer?',
        type: 'select',
        options: [
          '4x6 Standard Postcard',
          '5x7 Postcard',
          '6x9 Jumbo Postcard',
          '6x11 Extra Large Postcard',
          'Folded Mailer',
          'Letter in Envelope',
          'Not sure - need recommendation'
        ],
        required: true
      },
      {
        id: 'design_assets',
        label: 'Do you have design assets?',
        type: 'checkbox',
        options: [
          'Logo files',
          'Brand guidelines',
          'Photo library',
          'Previous designs to reference',
          'Need everything created'
        ],
        required: true
      },
      {
        id: 'imagery_style',
        label: 'What imagery resonates with your audience?',
        type: 'checkbox',
        options: [
          'Destination photos',
          'Happy travelers',
          'Luxury amenities',
          'Local culture',
          'Your team',
          'Maps/itineraries'
        ],
        required: true
      },
      {
        id: 'personalization',
        label: 'Do you want personalization?',
        type: 'radio',
        options: [
          'Yes - Names and custom content',
          'Yes - Just names',
          'No - Keep it general',
          'Not sure'
        ],
        required: true
      },
      {
        id: 'call_to_action',
        label: 'Primary call to action?',
        type: 'select',
        options: [
          'Call us',
          'Visit website/landing page',
          'Email us',
          'Visit our office',
          'Scan QR code',
          'Book online',
          'Schedule consultation'
        ],
        required: true
      }
    ]
  },
  {
    id: 'timing_frequency',
    title: 'Timing & Frequency',
    icon: Calendar,
    description: 'When and how often to mail',
    questions: [
      {
        id: 'arrival_date',
        label: 'When should postcards arrive?',
        type: 'date',
        required: true
      },
      {
        id: 'seasonal_targeting',
        label: 'Are you targeting specific travel seasons?',
        type: 'select',
        options: [
          'Spring travel (Mar-May)',
          'Summer travel (Jun-Aug)',
          'Fall travel (Sep-Nov)',
          'Winter travel (Dec-Feb)',
          'Holiday travel',
          'Wave season (Jan-Mar)',
          'Not seasonal'
        ],
        required: true
      },
      {
        id: 'booking_window',
        label: 'How far in advance do clients typically book?',
        type: 'select',
        options: [
          '2-4 weeks',
          '1-2 months',
          '3-4 months',
          '6+ months',
          'Varies greatly'
        ],
        required: true
      },
      {
        id: 'campaign_frequency',
        label: 'Is this a one-time or ongoing campaign?',
        type: 'radio',
        options: [
          'One-time campaign',
          'Monthly series',
          'Quarterly series',
          'Seasonal campaigns',
          'Not sure yet'
        ],
        required: true
      },
      {
        id: 'followup_plan',
        label: 'Will you coordinate follow-ups?',
        type: 'checkbox',
        options: [
          'Email follow-up',
          'Phone calls',
          'Social media',
          'Second mailing',
          'No follow-up planned'
        ]
      }
    ]
  },
  {
    id: 'budget_roi',
    title: 'Budget & ROI Expectations',
    icon: DollarSign,
    description: 'Financial planning and goals',
    questions: [
      {
        id: 'campaign_budget',
        label: 'What\'s your total budget?',
        type: 'select',
        options: [
          'Under $500',
          '$500-1,000',
          '$1,000-2,500',
          '$2,500-5,000',
          '$5,000-10,000',
          'Over $10,000'
        ],
        required: true
      },
      {
        id: 'mail_volume',
        label: 'How many pieces do you want to mail?',
        type: 'number',
        placeholder: 'Number of postcards',
        required: true
      },
      {
        id: 'customer_value',
        label: 'What\'s your average booking value?',
        type: 'number',
        placeholder: 'Average $ per booking',
        prefix: '$',
        required: true
      },
      {
        id: 'success_metrics',
        label: 'What response rate would make this successful?',
        type: 'select',
        options: [
          '0.5-1%',
          '1-2%',
          '2-3%',
          '3-5%',
          'Over 5%',
          'Not sure'
        ],
        required: true
      },
      {
        id: 'tracking_methods',
        label: 'How will you track results?',
        type: 'checkbox',
        options: [
          'Unique phone number',
          'Promo codes',
          'Dedicated landing page',
          'QR codes',
          'Ask customers',
          'CRM tracking'
        ],
        required: true
      }
    ]
  },
  {
    id: 'campaign_optimization',
    title: 'Campaign Optimization',
    icon: TrendingUp,
    description: 'For existing campaigns only',
    optional: true,
    questions: [
      {
        id: 'past_results',
        label: 'What were your last campaign results?',
        type: 'group',
        fields: [
          {
            id: 'response_rate',
            label: 'Response Rate (%)',
            type: 'number',
            suffix: '%'
          },
          {
            id: 'conversion_rate',
            label: 'Conversion Rate (%)',
            type: 'number',
            suffix: '%'
          },
          {
            id: 'roi',
            label: 'ROI (%)',
            type: 'number',
            suffix: '%'
          }
        ]
      },
      {
        id: 'performance_analysis',
        label: 'What exceeded expectations? What fell short?',
        type: 'textarea',
        placeholder: 'Share what worked and what didn\'t'
      },
      {
        id: 'testing_history',
        label: 'Did you test different versions?',
        type: 'textarea',
        placeholder: 'Describe any A/B tests and results'
      },
      {
        id: 'improvement_areas',
        label: 'What would you change this time?',
        type: 'textarea',
        placeholder: 'Areas for improvement'
      }
    ]
  },
  {
    id: 'logistics_fulfillment',
    title: 'Logistics & Fulfillment',
    icon: Package,
    description: 'Execution details',
    questions: [
      {
        id: 'design_responsibility',
        label: 'Who will handle design?',
        type: 'radio',
        options: [
          'Our team',
          'We have a designer',
          'Need a designer recommendation',
          'Use template'
        ],
        required: true
      },
      {
        id: 'print_partner',
        label: 'Do you have a printer/mail house?',
        type: 'radio',
        options: [
          'Yes - We have a partner',
          'No - Need recommendations',
          'Will handle separately'
        ],
        required: true
      },
      {
        id: 'mail_class',
        label: 'Mail class preference?',
        type: 'select',
        options: [
          'First-Class (faster, more expensive)',
          'Marketing Mail (slower, cost-effective)',
          'EDDM (neighborhood saturation)',
          'Need recommendation'
        ],
        required: true
      },
      {
        id: 'list_support',
        label: 'Do you need mailing list help?',
        type: 'checkbox',
        options: [
          'List acquisition',
          'List cleaning/hygiene',
          'NCOA update',
          'Merge/purge',
          'No help needed'
        ]
      },
      {
        id: 'crm_integration',
        label: 'Need CRM/tracking integration?',
        type: 'radio',
        options: [
          'Yes - Help integrate with our CRM',
          'No - We\'ll handle it',
          'Don\'t have a CRM'
        ]
      }
    ]
  }
];

interface DirectMailConsultationProps {
  brandId: string;
  profile?: MarketingProfile;
  existingCampaign?: any;
  onComplete?: (campaignData: any) => void;
  onExit?: () => void;
}

export function DirectMailConsultation({ 
  brandId, 
  profile,
  existingCampaign,
  onComplete,
  onExit
}: DirectMailConsultationProps) {
  const [currentSection, setCurrentSection] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showOptionalSections, setShowOptionalSections] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const { push: pushToast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  // Load saved progress or existing campaign
  useEffect(() => {
    if (existingCampaign) {
      // Load from existing campaign
      setCampaignName(existingCampaign.name || '');
      setResponses(existingCampaign.responses || {});
      
      // Calculate which section to start from based on completion
      let lastCompleteSection = 0;
      if (existingCampaign.sections) {
        CONSULTATION_SECTIONS.forEach((section, index) => {
          if (existingCampaign.sections[section.id]?.completed) {
            lastCompleteSection = index;
          }
        });
      }
      setCurrentSection(lastCompleteSection);
    } else {
      // For new campaigns, check if there's saved progress
      const savedProgress = localStorage.getItem(`dm_consultation_${brandId}`);
      if (savedProgress) {
        const parsed = JSON.parse(savedProgress);
        setResponses(parsed.responses || {});
        setCurrentSection(parsed.currentSection || 0);
        setShowOptionalSections(parsed.showOptionalSections || false);
        setCampaignName(parsed.campaignName || '');
      } else {
        // Fresh start - ensure we're at the beginning
        setCurrentSection(0);
        setResponses({});
        setCampaignName('');
      }
    }
  }, [brandId, existingCampaign]);

  // Save progress to localStorage (silent)
  const autoSaveProgress = () => {
    const progress = {
      responses,
      currentSection,
      showOptionalSections,
      campaignName,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(`dm_consultation_${brandId}`, JSON.stringify(progress));
  };
  
  // Save progress with notification
  const saveProgress = () => {
    autoSaveProgress();
    pushToast({
      kind: 'success',
      message: 'Progress saved'
    });
  };
  
  // Save incomplete consultation to backend
  const saveIncompleteConsultation = async () => {
    try {
      const finalCampaignName = campaignName || `Draft - ${new Date().toLocaleDateString()}`;
      
      // Build campaign data with current progress
      const campaignData = {
        brandId,
        type: 'direct_mail',
        name: finalCampaignName,
        status: 'draft', // Mark as draft since it's incomplete
        sections: CONSULTATION_SECTIONS.reduce((acc, section, index) => {
          acc[section.id] = {
            completed: index < currentSection, // Sections before current are completed
            responses: section.questions.reduce((qAcc, question) => {
              if (responses[question.id] !== undefined) {
                qAcc[question.id] = responses[question.id];
              }
              return qAcc;
            }, {})
          };
          return acc;
        }, {}),
        responses,
        metadata: {
          mailVolume: responses.mail_volume || 'Not specified',
          budget: responses.campaign_budget || 'Not specified',
          targetAudience: responses.ideal_client || 'Not specified',
          completedSections: currentSection,
          totalSections: CONSULTATION_SECTIONS.filter(s => !s.optional).length,
          lastSavedAt: new Date().toISOString(),
          progress: calculateProgress()
        },
        createdAt: existingCampaign?.created_at || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Save to backend
      const url = existingCampaign 
        ? `/api/direct-mail-campaigns/${existingCampaign.id}`
        : '/api/direct-mail-campaigns';
      
      const method = existingCampaign ? 'PUT' : 'POST';
      
      console.log('[DirectMail] Saving incomplete consultation:', {
        name: finalCampaignName,
        progress: calculateProgress(),
        currentSection
      });
      
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': brandId
        },
        body: JSON.stringify(campaignData)
      });
      
      if (response.ok) {
        const savedCampaign = await response.json();
        console.log('[DirectMail] Incomplete consultation saved:', savedCampaign);
        
        // Clear local storage
        localStorage.removeItem(`dm_consultation_${brandId}`);
        
        pushToast({
          kind: 'success',
          message: 'Campaign draft saved!',
          description: `You can continue working on "${finalCampaignName}" anytime`
        });
        
        return savedCampaign;
      } else {
        throw new Error('Failed to save draft');
      }
    } catch (error) {
      console.error('[DirectMail] Failed to save incomplete consultation:', error);
      pushToast({
        kind: 'error',
        message: 'Failed to save draft',
        description: 'Your progress is saved locally'
      });
      throw error;
    }
  };

  // Calculate overall progress
  const calculateProgress = () => {
    const requiredSections = CONSULTATION_SECTIONS.filter(s => !s.optional);
    const totalQuestions = requiredSections.reduce((sum, section) => 
      sum + section.questions.filter(q => !q.conditional).length, 0
    );
    
    const answeredQuestions = Object.keys(responses).length;
    return Math.round((answeredQuestions / totalQuestions) * 100);
  };

  // Validate current section
  const validateSection = () => {
    const section = CONSULTATION_SECTIONS[currentSection];
    const sectionErrors: Record<string, string> = {};
    
    // Validate campaign name on first section
    if (currentSection === 0 && !existingCampaign && !campaignName.trim()) {
      sectionErrors.campaignName = 'Campaign name is required';
    }
    
    section.questions.forEach(question => {
      // Skip conditional questions if condition not met
      if (question.conditional) {
        const conditionValue = responses[question.conditional.field];
        if (conditionValue !== question.conditional.value) {
          return;
        }
      }
      
      // Check required fields
      if (question.required && !responses[question.id]) {
        sectionErrors[question.id] = 'This field is required';
      }
      
      // Check group fields
      if (question.type === 'group' && question.fields) {
        question.fields.forEach(field => {
          const fieldKey = `${question.id}_${field.id}`;
          if (field.required && !responses[fieldKey]) {
            sectionErrors[fieldKey] = 'This field is required';
          }
        });
      }
    });
    
    setErrors(sectionErrors);
    return Object.keys(sectionErrors).length === 0;
  };

  // Handle response update
  const updateResponse = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
    
    // Clear error for this field
    if (errors[questionId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
    
    // Auto-save progress silently
    autoSaveProgress();
  };

  // Navigate sections
  const goToNextSection = () => {
    if (validateSection()) {
      if (currentSection < CONSULTATION_SECTIONS.length - 1) {
        setCurrentSection(prev => prev + 1);
        formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      pushToast({
        kind: 'error',
        message: 'Please complete all required fields'
      });
    }
  };

  const goToPreviousSection = () => {
    if (currentSection > 0) {
      setCurrentSection(prev => prev - 1);
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Submit consultation
  const submitConsultation = async () => {
    if (!validateSection()) {
      pushToast({
        kind: 'error',
        message: 'Please complete all required fields'
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Use the campaign name that was set at the beginning
      const finalCampaignName = campaignName || `Direct Mail Campaign - ${new Date().toLocaleDateString()}`;
      
      // Process responses into campaign data
      const campaignData = {
        brandId,
        type: 'direct_mail',
        name: finalCampaignName,
        status: 'consultation_complete',
        sections: CONSULTATION_SECTIONS.reduce((acc, section) => {
          acc[section.id] = {
            completed: true,
            responses: section.questions.reduce((qAcc, question) => {
              if (responses[question.id] !== undefined) {
                qAcc[question.id] = responses[question.id];
              }
              return qAcc;
            }, {})
          };
          return acc;
        }, {}),
        responses,
        metadata: {
          mailVolume: responses.mail_volume,
          budget: responses.campaign_budget,
          targetAudience: responses.ideal_client,
          completedSections: CONSULTATION_SECTIONS.filter(s => !s.optional).length,
          totalSections: CONSULTATION_SECTIONS.length
        },
        createdAt: existingCampaign?.created_at || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Save to backend (create or update)
      const url = existingCampaign 
        ? `/api/direct-mail-campaigns/${existingCampaign.id}`
        : '/api/direct-mail-campaigns';
      
      const method = existingCampaign ? 'PUT' : 'POST';
      
      console.error('[SAVE DEBUG] About to save campaign:', {
        url,
        method,
        brandId,
        campaignName: finalCampaignName,
        hasExistingCampaign: !!existingCampaign,
        fullCampaignData: campaignData
      });
      
      const requestBody = JSON.stringify(campaignData);
      console.error('[SAVE DEBUG] Request body:', requestBody);
      console.error('[SAVE DEBUG] Headers:', {
        'Content-Type': 'application/json',
        'x-user-id': brandId
      });
      
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': brandId
        },
        body: requestBody
      });
      
      console.error('[SAVE DEBUG] Response status:', response.status);
      console.error('[SAVE DEBUG] Response headers:', response.headers);
      
      const responseText = await response.text();
      console.error('[SAVE DEBUG] Response text:', responseText);
      
      if (!response.ok) {
        console.error('[SAVE DEBUG] Save failed with status:', response.status);
        console.error('[SAVE DEBUG] Error response:', responseText);
        throw new Error(`Failed to save campaign: ${response.status} - ${responseText}`);
      }
      
      let savedCampaign;
      try {
        savedCampaign = JSON.parse(responseText);
      } catch (e) {
        console.error('[SAVE DEBUG] Failed to parse response:', e);
        throw new Error('Invalid response from server');
      }
      
      console.error('[SAVE DEBUG] Parsed response from server:', savedCampaign);
      
      // Clear local storage
      localStorage.removeItem(`dm_consultation_${brandId}`);
      
      // Notify parent
      if (onComplete) {
        console.error('[SAVE DEBUG] Calling onComplete with:', savedCampaign);
        onComplete(savedCampaign);
      } else {
        console.error('[SAVE DEBUG] No onComplete callback provided!');
      }
      
      pushToast({
        kind: 'success',
        message: 'Campaign consultation completed!'
      });
      
    } catch (error) {
      console.error('[DirectMail] Failed to submit consultation:', error);
      pushToast({
        kind: 'error',
        message: 'Failed to save campaign. Please try again.',
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const currentSectionData = CONSULTATION_SECTIONS[currentSection];
  const isLastSection = currentSection === CONSULTATION_SECTIONS.length - 1;
  const progress = calculateProgress();

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {campaignName || 'Direct Mail Campaign Consultation'}
              </h1>
              <p className="text-gray-600">{existingCampaign ? 'Edit your campaign' : 'Let\'s create a campaign that drives bookings'}</p>
            </div>
          </div>
          <Button
            onClick={async () => {
              if (progress < 100) {
                if (confirm(`Your consultation is ${progress}% complete. Would you like to save it as a draft?`)) {
                  try {
                    const saved = await saveIncompleteConsultation();
                    if (onComplete) {
                      onComplete(saved);
                    } else {
                      onExit();
                    }
                  } catch (error) {
                    // Still exit even if save fails (progress is in localStorage)
                    onExit();
                  }
                }
              } else {
                saveProgress();
                onExit();
              }
            }}
            variant="outline"
          >
            Save & Exit
          </Button>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress: {progress}%</span>
            <span>Section {currentSection + 1} of {CONSULTATION_SECTIONS.filter(s => !s.optional).length}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Section Navigation */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-2 min-w-max pb-2">
          {CONSULTATION_SECTIONS.map((section, index) => {
            const Icon = section.icon;
            const isActive = index === currentSection;
            const isCompleted = index < currentSection;
            
            return (
              <Button
                key={section.id}
                onClick={() => setCurrentSection(index)}
                variant={isActive ? 'primary' : isCompleted ? 'secondary' : 'outline'}
                size="sm"
                className="flex items-center gap-2"
                disabled={section.optional && !showOptionalSections}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{section.title}</span>
                <span className="sm:hidden">{index + 1}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Campaign Name (shown at start) */}
      {currentSection === 0 && !existingCampaign && (
        <Card className="mb-6 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-primary" />
              Campaign Name
            </CardTitle>
            <p className="text-gray-600">Give your campaign a memorable name to easily identify it later</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={campaignName}
                  onChange={(e) => {
                    setCampaignName(e.target.value);
                    autoSaveProgress();
                  }}
                  placeholder="e.g., Spring 2024 Luxury Cruise Promotion"
                  className={errors.campaignName ? 'border-red-500' : 'flex-1'}
                />
                <TalaFieldAssistant
                  fieldId="campaign_name"
                  fieldLabel="Campaign Name"
                  fieldType="text"
                  currentValue={campaignName}
                  context={{
                    sectionTitle: "Campaign Setup",
                    previousResponses: responses,
                    businessInfo: profile
                  }}
                  onApplySuggestion={(value) => {
                    setCampaignName(value);
                    autoSaveProgress();
                  }}
                  brandId={brandId}
                />
              </div>
            </div>
            {errors.campaignName && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.campaignName}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Current Section Content */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <currentSectionData.icon className="w-5 h-5 text-primary" />
            {currentSectionData.title}
          </CardTitle>
          <p className="text-gray-600">{currentSectionData.description}</p>
        </CardHeader>
        <CardContent>
          <div ref={formRef} className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
            {currentSectionData.questions.map((question) => {
              // Check conditional display
              if (question.conditional) {
                const conditionValue = responses[question.conditional.field];
                if (conditionValue !== question.conditional.value) {
                  return null;
                }
              }
              
              return (
                <div key={question.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium">
                      {question.label}
                      {question.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <TalaFieldAssistant
                      fieldId={question.id}
                      fieldLabel={question.label}
                      fieldType={question.type as any}
                      fieldOptions={question.options}
                      currentValue={responses[question.id]}
                      context={{
                        sectionTitle: currentSectionData.title,
                        previousResponses: responses,
                        businessInfo: profile
                      }}
                      onApplySuggestion={(value) => updateResponse(question.id, value)}
                      brandId={brandId}
                    />
                  </div>
                  
                  {/* Text Input */}
                  {question.type === 'text' && (
                    <Input
                      value={responses[question.id] || ''}
                      onChange={(e) => updateResponse(question.id, e.target.value)}
                      placeholder={question.placeholder}
                      className={errors[question.id] ? 'border-red-500' : ''}
                    />
                  )}
                  
                  {/* Number Input */}
                  {question.type === 'number' && (
                    <div className="relative">
                      {question.prefix && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                          {question.prefix}
                        </span>
                      )}
                      <Input
                        type="number"
                        value={responses[question.id] || ''}
                        onChange={(e) => updateResponse(question.id, e.target.value)}
                        placeholder={question.placeholder}
                        className={`${errors[question.id] ? 'border-red-500' : ''} ${question.prefix ? 'pl-8' : ''}`}
                      />
                      {question.suffix && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                          {question.suffix}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Date Input */}
                  {question.type === 'date' && (
                    <Input
                      type="date"
                      value={responses[question.id] || ''}
                      onChange={(e) => updateResponse(question.id, e.target.value)}
                      className={errors[question.id] ? 'border-red-500' : ''}
                    />
                  )}
                  
                  {/* Textarea */}
                  {question.type === 'textarea' && (
                    <Textarea
                      value={responses[question.id] || ''}
                      onChange={(e) => updateResponse(question.id, e.target.value)}
                      placeholder={question.placeholder}
                      rows={3}
                      className={errors[question.id] ? 'border-red-500' : ''}
                    />
                  )}
                  
                  {/* Select */}
                  {question.type === 'select' && (
                    <Select
                      value={responses[question.id] || ''}
                      onChange={(e) => updateResponse(question.id, e.target.value)}
                      error={!!errors[question.id]}
                      placeholder="Select an option"
                      options={question.options?.map(opt => ({ value: opt, label: opt })) || []}
                    />
                  )}
                  
                  {/* Radio */}
                  {question.type === 'radio' && (
                    <div className="space-y-2">
                      {question.options?.map((option) => (
                        <label key={option} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={question.id}
                            value={option}
                            checked={responses[question.id] === option}
                            onChange={(e) => updateResponse(question.id, e.target.value)}
                            className="w-4 h-4 text-primary"
                          />
                          <span className="text-sm">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  
                  {/* Checkbox */}
                  {question.type === 'checkbox' && (
                    <div className="space-y-2">
                      {question.options?.map((option) => {
                        const values = responses[question.id] || [];
                        return (
                          <label key={option} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              value={option}
                              checked={values.includes(option)}
                              onChange={(e) => {
                                const newValues = e.target.checked
                                  ? [...values, option]
                                  : values.filter((v: string) => v !== option);
                                updateResponse(question.id, newValues);
                              }}
                              className="w-4 h-4 text-primary"
                            />
                            <span className="text-sm">{option}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Group Fields */}
                  {question.type === 'group' && question.fields && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      {question.fields.map((field) => {
                        const fieldKey = `${question.id}_${field.id}`;
                        return (
                          <div key={field.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium">
                                {field.label}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                              </label>
                              <TalaFieldAssistant
                                fieldId={fieldKey}
                                fieldLabel={field.label}
                                fieldType={field.type as any}
                                fieldOptions={field.options}
                                currentValue={responses[fieldKey]}
                                context={{
                                  sectionTitle: currentSectionData.title,
                                  previousResponses: responses,
                                  businessInfo: profile
                                }}
                                onApplySuggestion={(value) => updateResponse(fieldKey, value)}
                                brandId={brandId}
                              />
                            </div>
                            {field.type === 'select' ? (
                              <Select
                                value={responses[fieldKey] || ''}
                                onChange={(e) => updateResponse(fieldKey, e.target.value)}
                                error={!!errors[fieldKey]}
                                placeholder="Select"
                                options={field.options?.map(opt => ({ value: opt, label: opt })) || []}
                              />
                            ) : (
                              <Input
                                type={field.type}
                                value={responses[fieldKey] || ''}
                                onChange={(e) => updateResponse(fieldKey, e.target.value)}
                                placeholder={field.placeholder}
                                className={errors[fieldKey] ? 'border-red-500' : ''}
                              />
                            )}
                            {errors[fieldKey] && (
                              <p className="text-red-500 text-xs">{errors[fieldKey]}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Error Message */}
                  {errors[question.id] && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors[question.id]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center">
        <Button
          onClick={goToPreviousSection}
          variant="outline"
          disabled={currentSection === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        
        <div className="flex gap-2">
          <Button
            onClick={saveProgress}
            variant="outline"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Progress
          </Button>
          
          {isLastSection ? (
            <Button
              onClick={submitConsultation}
              variant="primary"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Complete Consultation
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={goToNextSection}
              variant="primary"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}