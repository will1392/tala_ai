/**
 * Marketing Dashboard Page
 * Test page for the marketing profile system
 */

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { AssessmentWizard } from '../components/marketing/AssessmentWizard';
import { GrowthPlanView } from '../components/marketing/GrowthPlanView';
import { GoalsView } from '../components/marketing/GoalsView';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/shared/Badge';
import {
  Target,
  TrendingUp,
  Award,
  BarChart3,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Download,
  Upload,
  Mail
} from 'lucide-react';
import type { MarketingProfile, Goal, GrowthPlan, EvidenceItem } from '../types/marketing';
import { generateRealisticGoals, generateRecommendations } from '../services/marketing/RealisticGoalGenerator';
import { getSkillLevel } from '../config/marketingAssessment';
import { marketingContext } from '../services/MarketingContextService';
import { marketingStorage, getStorageStatus, exportMarketingData, importMarketingData } from '../services/MarketingStorageService';
import { QuarterlyCheckIn } from '../components/marketing/QuarterlyCheckIn';
import { DirectMailDashboard } from '../components/marketing/DirectMailDashboard';
import { useToast } from '../components/toast/ToastProvider';

export default function MarketingDashboard() {
  const [activeTab, setActiveTab] = useState('assessment');
  const [profile, setProfile] = useState<MarketingProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const brandId = 'test-brand-1'; // For testing
  const { push: pushToast } = useToast();

  // Load profile data
  useEffect(() => {
    loadProfile();
  }, []);
  
  // Check if quarterly check-in is due
  useEffect(() => {
    if (profile?.assessment) {
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(profile.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceUpdate >= 90) {
        setShowCheckIn(true);
      }
    }
  }, [profile]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      // Try loading from storage service (handles multi-layer persistence)
      const storedProfile = await marketingStorage.loadProfile(brandId);
      
      if (storedProfile) {
        setProfile(storedProfile);
        marketingContext.setProfile(storedProfile, brandId);
        
        // If assessment is complete, show growth plan
        if (storedProfile.assessment && storedProfile.skillLevel !== 'new') {
          setActiveTab('growth');
        }
        
        console.log('📦 Loaded profile from storage:', getStorageStatus());
      } else {
        // Try API if no stored profile
        try {
          const response = await fetch(`/api/marketing-profile/${brandId}`);
          if (response.ok) {
            const data = await response.json();
            setProfile(data);
            
            // Save to storage service for persistence
            await marketingStorage.saveProfile(data, brandId);
            marketingContext.setProfile(data, brandId);
            
            // If assessment is complete, show growth plan
            if (data.assessment && data.skillLevel !== 'new') {
              setActiveTab('growth');
            }
          }
        } catch (apiError) {
          console.error('API failed, using mock data:', apiError);
          // Use mock data for testing if API fails
          const mockData = getMockProfile();
          setProfile(mockData);
          
          // Save mock data
          await marketingStorage.saveProfile(mockData, brandId);
          marketingContext.setProfile(mockData, brandId);
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      // Final fallback to mock data
      const mockData = getMockProfile();
      setProfile(mockData);
      marketingContext.setProfile(mockData, brandId);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle assessment completion
  const handleAssessmentComplete = async (assessmentResult: any) => {
    try {
      // Determine skill level based on score
      const skillLevel = getSkillLevel(assessmentResult.score);
      
      // Generate realistic goals based on assessment and business stage
      const initialGoals = generateRealisticGoals(
        assessmentResult,
        skillLevel,
        profile?.goals || []
      );
      
      // Generate growth plan
      const growthPlan = await generateGrowthPlan(skillLevel, assessmentResult);
      
      // Try to save to backend
      try {
        const response = await fetch(`/api/marketing-profile/${brandId}/assessment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answers: assessmentResult.inputs.reduce((acc: any, input: any) => {
              acc[input.id] = input.value;
              return acc;
            }, {}),
            signals: assessmentResult.signals
          })
        });

        if (response.ok) {
          const data = await response.json();
          
          // Save goals
          for (const goal of initialGoals) {
            await fetch(`/api/marketing-profile/${brandId}/goals`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(goal)
            });
          }
          
          setProfile(prev => ({
            ...prev!,
            assessment: data.assessment || assessmentResult,
            skillLevel: data.skillLevel || skillLevel,
            growthPlan: data.growthPlan || growthPlan,
            goals: [...(prev?.goals || []), ...initialGoals]
          }));
        }
      } catch (error) {
        console.error('Failed to save to backend:', error);
      }
      
      // Update local state regardless of backend
      const updatedProfile: MarketingProfile = {
        brandId,
        assessment: assessmentResult,
        skillLevel,
        growthPlan,
        goals: [...(profile?.goals || []), ...initialGoals],
        evidence: profile?.evidence || [],
        updatedAt: new Date().toISOString()
      };
      
      setProfile(updatedProfile);
      
      // Save to all storage layers for maximum persistence
      await marketingStorage.saveProfile(updatedProfile, brandId);
      
      // Save to context service for chat integration
      marketingContext.setProfile(updatedProfile, brandId);
      
      console.log('💾 Profile saved to storage:', getStorageStatus());
      
      setActiveTab('growth');
    } catch (error) {
      console.error('Failed to process assessment:', error);
    }
  };
  
  // Generate growth plan function
  async function generateGrowthPlan(skillLevel: string, assessment: any): Promise<GrowthPlan> {
    // This is a simplified version - in production, this would call the backend
    const plan: GrowthPlan = {
      phases: [],
      currentPhase: null,
      startedAt: new Date().toISOString(),
      estimatedCompletion: null
    };
    
    // Add phases based on skill level
    if (skillLevel === 'new') {
      plan.phases = [
        {
          id: 'foundation',
          label: 'Marketing Foundation',
          description: 'Set up essential tracking and define your strategy',
          prerequisites: [],
          estimatedWeeks: 4,
          order: 1,
          steps: [
            {
              id: 'setup-ga4',
              label: 'Set up Google Analytics 4',
              agent: 'ANALYTICS',
              description: 'Install and configure GA4 to track website performance',
              outputs: ['ga4-setup-complete.json'],
              evidenceRequired: [],
              estimateHours: 3,
              status: 'todo'
            },
            {
              id: 'define-icp',
              label: 'Define Ideal Client Profile',
              agent: 'GENERAL',
              description: 'Create detailed buyer personas for your target audience',
              outputs: ['icp-document.md'],
              evidenceRequired: [],
              estimateHours: 4,
              status: 'todo'
            }
          ]
        },
        {
          id: 'channel-setup',
          label: 'Channel Setup',
          description: 'Establish your marketing channels',
          prerequisites: ['foundation'],
          estimatedWeeks: 4,
          order: 2,
          steps: [
            {
              id: 'keyword-research',
              label: 'Conduct Keyword Research',
              agent: 'SEO',
              description: 'Identify target keywords for your business',
              outputs: ['keyword-research.csv'],
              evidenceRequired: [],
              estimateHours: 4,
              status: 'todo'
            }
          ]
        }
      ];
      plan.estimatedCompletion = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
    } else {
      // Intermediate/Advanced phases
      plan.phases = [
        {
          id: 'optimization',
          label: 'Campaign Optimization',
          description: 'Optimize existing marketing efforts',
          prerequisites: [],
          estimatedWeeks: 4,
          order: 1,
          steps: [
            {
              id: 'conversion-optimization',
              label: 'Optimize Conversion Rates',
              agent: 'ANALYTICS',
              description: 'A/B test and improve conversion paths',
              outputs: ['cro-report.json'],
              evidenceRequired: ['ga4_connected'],
              estimateHours: 8,
              status: 'todo'
            }
          ]
        }
      ];
      plan.estimatedCompletion = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    }
    
    plan.currentPhase = plan.phases[0]?.id || null;
    return plan;
  }

  // Handle goal creation
  const handleCreateGoal = async (goal: Partial<Goal>) => {
    try {
      const response = await fetch(`/api/marketing-profile/${brandId}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goal)
      });

      if (response.ok) {
        loadProfile();
      }
    } catch (error) {
      console.error('Failed to create goal:', error);
      // Update locally for testing
      setProfile(prev => ({
        ...prev!,
        goals: [...(prev?.goals || []), goal as Goal]
      }));
    }
  };

  // Handle goal update
  const handleUpdateGoal = async (goalId: string, updates: Partial<Goal>) => {
    try {
      const response = await fetch(`/api/marketing-profile/${brandId}/goals/${goalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        loadProfile();
      }
    } catch (error) {
      console.error('Failed to update goal:', error);
      // Update locally for testing
      setProfile(prev => ({
        ...prev!,
        goals: prev?.goals?.map(g => 
          g.id === goalId ? { ...g, ...updates } : g
        ) || []
      }));
    }
  };

  // Handle step actions
  const handleStepStart = async (phaseId: string, stepId: string) => {
    try {
      await fetch(`/api/marketing-profile/${brandId}/growth-plan/step`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phaseId,
          stepId,
          status: 'in_progress'
        })
      });
      loadProfile();
    } catch (error) {
      console.error('Failed to start step:', error);
    }
  };

  const handleStepComplete = async (phaseId: string, stepId: string, outputs: any) => {
    try {
      await fetch(`/api/marketing-profile/${brandId}/growth-plan/step`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phaseId,
          stepId,
          status: 'done',
          metadata: outputs
        })
      });
      loadProfile();
    } catch (error) {
      console.error('Failed to complete step:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading marketing profile...</p>
        </div>
      </div>
    );
  }

  const skillLevelColors = {
    new: 'bg-gray-100 text-gray-700',
    intermediate: 'bg-blue-100 text-blue-700',
    advanced: 'bg-purple-100 text-purple-700',
    expert: 'bg-green-100 text-green-700'
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Marketing Assistant</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Evidence-based marketing guidance powered by your data
            </p>
            {!profile?.assessment && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-red-700 dark:text-red-300">
                  Complete the assessment to unlock your personalized growth plan
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={async () => {
                try {
                  const exportData = await exportMarketingData(brandId);
                  const blob = new Blob([exportData], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `marketing-profile-${brandId}-${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  console.log('📥 Profile exported successfully');
                } catch (error) {
                  console.error('Export failed:', error);
                }
              }}
              variant="ghost"
              title="Export profile data"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    const text = await file.text();
                    try {
                      await importMarketingData(text, brandId);
                      await loadProfile(); // Reload after import
                      console.log('📤 Profile imported successfully');
                    } catch (error) {
                      console.error('Import failed:', error);
                      alert('Failed to import profile. Please check the file format.');
                    }
                  }
                };
                input.click();
              }}
              variant="ghost"
              title="Import profile data"
            >
              <Upload className="w-4 h-4" />
              Import
            </Button>
            <Button onClick={loadProfile} variant="ghost">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Profile Overview */}
        {profile?.assessment && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Award className="w-5 h-5 text-primary" />
                <Badge className={skillLevelColors[profile.skillLevel]}>
                  {profile.skillLevel}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">Skill Level</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                <span className="text-2xl font-bold">
                  {profile.assessment?.score || 0}%
                </span>
              </div>
              <p className="text-sm text-gray-600">Readiness Score</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-5 h-5 text-green-500" />
                <span className="text-2xl font-bold">
                  {profile.goals?.filter(g => g.status === 'active').length || 0}
                </span>
              </div>
              <p className="text-sm text-gray-600">Active Goals</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                <span className="text-2xl font-bold">
                  {profile.evidence?.filter(e => e.verified).length || 0}
                </span>
              </div>
              <p className="text-sm text-gray-600">Evidence Points</p>
            </Card>
          </div>
        )}
      </div>

      {/* Main Content */}
      {/* Quarterly Check-In Modal */}
      {showCheckIn && profile && (
        <div className="mb-6">
          <QuarterlyCheckIn
            profile={profile}
            onComplete={(updatedProfile) => {
              setProfile(updatedProfile);
              marketingContext.setProfile(updatedProfile, brandId);
              setShowCheckIn(false);
            }}
            onSkip={() => setShowCheckIn(false)}
          />
        </div>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger 
            value="assessment" 
            className={`flex items-center gap-2 relative ${
              profile?.assessment 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            <CheckCircle className={`w-4 h-4 ${
              profile?.assessment 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`} />
            Assessment
            {profile?.assessment ? (
              <Badge 
                variant="success" 
                className="ml-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-300 dark:border-green-700"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Complete
              </Badge>
            ) : (
              <Badge 
                variant="destructive" 
                className="ml-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-300 dark:border-red-700 animate-pulse"
              >
                <AlertCircle className="w-3 h-3 mr-1" />
                Required
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="growth" 
            disabled={!profile?.assessment}
            className="flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Growth Plan
          </TabsTrigger>
          <TabsTrigger 
            value="goals"
            disabled={!profile?.assessment}
            className="flex items-center gap-2"
          >
            <Target className="w-4 h-4" />
            Goals
          </TabsTrigger>
          <TabsTrigger 
            value="campaigns"
            disabled={!profile?.assessment}
            className="flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            Direct Mail
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assessment">
          {profile?.assessment ? (
            <Card className="p-8">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold mb-2">Assessment Complete</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Your skill level: <strong>{profile.skillLevel}</strong>
                </p>
                <div className="max-w-md mx-auto">
                  <h3 className="font-medium mb-2">Category Scores:</h3>
                  {profile.assessment.buckets && Object.entries(profile.assessment.buckets).map(([category, score]) => (
                    <div key={category} className="flex justify-between items-center mb-2">
                      <span className="capitalize">{category}:</span>
                      <span className="font-medium">{score}%</span>
                    </div>
                  ))}
                </div>
                <Button 
                  onClick={() => setActiveTab('growth')} 
                  variant="primary"
                  className="mt-6"
                >
                  View Growth Plan
                </Button>
              </div>
            </Card>
          ) : (
            <AssessmentWizard
              brandId={brandId}
              onComplete={handleAssessmentComplete}
              savedDraft={undefined}
            />
          )}
        </TabsContent>

        <TabsContent value="growth">
          <GrowthPlanView
            brandId={brandId}
            growthPlan={profile?.growthPlan || null}
            evidence={profile?.evidence || []}
            onStepStart={handleStepStart}
            onStepComplete={handleStepComplete}
            onRefresh={loadProfile}
          />
        </TabsContent>

        <TabsContent value="goals">
          <GoalsView
            brandId={brandId}
            goals={profile?.goals || []}
            evidence={profile?.evidence || []}
            onCreateGoal={handleCreateGoal}
            onUpdateGoal={handleUpdateGoal}
            onDeleteGoal={(goalId) => {
              setProfile(prev => ({
                ...prev!,
                goals: prev?.goals?.filter(g => g.id !== goalId) || []
              }));
            }}
            onUpdateProgress={(goalId, progress) => {
              handleUpdateGoal(goalId, progress);
            }}
            onRefresh={loadProfile}
          />
        </TabsContent>

        <TabsContent value="campaigns">
          <DirectMailDashboard
            brandId={brandId}
            profile={profile}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Mock data for testing without backend
function getMockProfile(): MarketingProfile {
  return {
    brandId: 'test-brand-1',
    skillLevel: 'new',
    assessment: null,
    goals: [
      {
        id: 'goal-1',
        metric: 'Website Traffic',
        target: 10000,
        current: 3500,
        unit: 'visitors/month',
        deadline: '2024-03-31',
        status: 'active',
        priority: 'high',
        owner: 'user',
        trend: 'up',
        description: 'Increase monthly website visitors',
        milestones: [
          { id: 'm1', label: 'Reach 5000 visitors', value: 5000, completed: false },
          { id: 'm2', label: 'Reach 7500 visitors', value: 7500, completed: false },
          { id: 'm3', label: 'Reach 10000 visitors', value: 10000, completed: false }
        ]
      },
      {
        id: 'goal-2',
        metric: 'Lead Generation',
        target: 100,
        current: 25,
        unit: 'leads',
        deadline: '2024-02-29',
        status: 'active',
        priority: 'medium',
        owner: 'user',
        trend: 'stable'
      }
    ],
    growthPlan: null,
    evidence: [
      {
        source: 'ga4',
        key: 'ga4_connected',
        timestamp: new Date().toISOString(),
        data: { connected: true, message: 'GA4 is properly configured' },
        verified: true,
        confidence: 1.0,
        relatedGoals: ['goal-1']
      },
      {
        source: 'manual',
        key: 'competitor_analysis',
        timestamp: new Date().toISOString(),
        data: { message: 'Identified 3 main competitors' },
        verified: false,
        confidence: 0.7
      }
    ],
    updatedAt: new Date().toISOString()
  };
}