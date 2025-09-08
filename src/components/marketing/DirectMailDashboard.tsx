/**
 * DirectMailDashboard - Main dashboard for managing direct mail campaigns
 * Allows users to create new consultations, view saved campaigns, and manage ongoing campaigns
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Plus,
  Search,
  Calendar,
  DollarSign,
  Target,
  Edit2,
  Trash2,
  Eye,
  Copy,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Package,
  Filter,
  Sparkles
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../shared/Input';
import { Badge } from '../shared/Badge';
import { Select } from '../ui/Select';
import { useToast } from '../toast/ToastProvider';
import { DirectMailConsultation } from './DirectMailConsultation';
import { PostcardAnalysisModal } from './PostcardAnalysisModal';
import type { MarketingProfile } from '../../types/marketing';

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: 'draft' | 'consultation_complete' | 'in_production' | 'mailed' | 'completed';
  created_at: string;
  updated_at: string;
  sections?: Record<string, any>;
  responses?: Record<string, any>;
  metadata?: {
    mailVolume?: string;
    budget?: string;
    targetAudience?: string;
    completedSections?: number;
    totalSections?: number;
  };
  analysis?: any; // Stored postcard analysis
}

interface DirectMailDashboardProps {
  brandId: string;
  profile?: MarketingProfile;
}

export function DirectMailDashboard({ brandId, profile }: DirectMailDashboardProps) {
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'status'>('date');
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [analysisModalData, setAnalysisModalData] = useState<{
    campaign: Campaign;
    isGenerating: boolean;
  } | null>(null);
  const { push: pushToast } = useToast();

  // Load campaigns on mount
  useEffect(() => {
    loadCampaigns();
  }, [brandId]);
  
  // Reload when returning to list view
  useEffect(() => {
    if (view === 'list') {
      loadCampaigns();
    }
  }, [view]);

  const loadCampaigns = async () => {
    setIsLoading(true);
    try {
      const userId = brandId; // Always use the passed brandId for consistency
      console.log('[DirectMailDashboard] Loading campaigns for user:', userId);
      
      // Add cache-busting to ensure fresh data
      const response = await fetch(`/api/direct-mail-campaigns?t=${Date.now()}`, {
        headers: {
          'x-user-id': userId,
          'Cache-Control': 'no-cache'
        }
      });

      console.log('[DirectMailDashboard] Load response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[DirectMailDashboard] Loaded campaigns:', data);
        console.log('[DirectMailDashboard] Campaign count:', data.campaigns?.length || 0);
        setCampaigns(data.campaigns || []);
        
        // Show toast if campaigns were found
        if (data.campaigns?.length > 0) {
          console.log('[DirectMailDashboard] Successfully loaded', data.campaigns.length, 'campaigns');
        }
      } else {
        console.error('[DirectMailDashboard] Failed to load campaigns:', response.status);
        pushToast({
          kind: 'error',
          message: 'Failed to load campaigns'
        });
      }
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      pushToast({
        kind: 'error',
        message: 'Failed to load campaigns',
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    // Clear any saved progress for a fresh start
    localStorage.removeItem(`dm_consultation_${brandId}`);
    setSelectedCampaign(null);
    setView('create');
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setView('edit');
  };

  const handleSendToTala = async (campaign: Campaign) => {
    // Open the analysis modal
    setAnalysisModalData({ campaign, isGenerating: true });
    setIsAnalysisModalOpen(true);
  };

  const handleViewAnalysis = (campaign: Campaign) => {
    // Open the modal with existing analysis
    setAnalysisModalData({ campaign, isGenerating: false });
    setIsAnalysisModalOpen(true);
  };

  const handleSaveAnalysis = async (analysisData: any) => {
    if (!analysisModalData?.campaign) return;
    
    try {
      // Update the campaign with the analysis
      const response = await fetch(`/api/direct-mail-campaigns/${analysisModalData.campaign.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': brandId
        },
        body: JSON.stringify({
          ...analysisModalData.campaign,
          analysis: analysisData
        })
      });

      if (response.ok) {
        pushToast({
          kind: 'success',
          message: 'Analysis saved to campaign'
        });
        // Reload campaigns to show updated data
        loadCampaigns();
      }
    } catch (error) {
      console.error('Failed to save analysis:', error);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      const response = await fetch(`/api/direct-mail-campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': brandId
        }
      });

      if (response.ok) {
        pushToast({
          kind: 'success',
          message: 'Campaign deleted successfully'
        });
        loadCampaigns();
      }
    } catch (error) {
      pushToast({
        kind: 'error',
        message: 'Failed to delete campaign'
      });
    }
  };

  const handleDuplicateCampaign = async (campaign: Campaign) => {
    try {
      const duplicateData = {
        ...campaign,
        name: `${campaign.name} (Copy)`,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      delete duplicateData.id;

      const response = await fetch('/api/direct-mail-campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': brandId
        },
        body: JSON.stringify(duplicateData)
      });

      if (response.ok) {
        pushToast({
          kind: 'success',
          message: 'Campaign duplicated successfully'
        });
        loadCampaigns();
      }
    } catch (error) {
      pushToast({
        kind: 'error',
        message: 'Failed to duplicate campaign'
      });
    }
  };

  const handleConsultationComplete = async (campaignData: any) => {
    console.log('[DirectMailDashboard] Consultation complete, received:', campaignData);
    
    // Extract campaign name from nested structure
    const campaignName = campaignData.campaign?.name || campaignData.name || 'Your campaign';
    
    pushToast({
      kind: 'success',
      message: 'Campaign saved successfully!',
      description: `"${campaignName}" has been saved and is ready for review`,
      duration: 5000 // Show for 5 seconds
    });
    
    // Change view first to see loading state
    setView('list');
    
    // Then force reload with a small delay to ensure view change is complete
    setTimeout(async () => {
      await loadCampaigns();
    }, 100);
  };

  // Filter and sort campaigns
  const filteredCampaigns = campaigns
    .filter(campaign => {
      const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'date':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-orange-100 text-orange-700';
      case 'consultation_complete':
        return 'bg-blue-100 text-blue-700';
      case 'in_production':
        return 'bg-yellow-100 text-yellow-700';
      case 'mailed':
        return 'bg-purple-100 text-purple-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return FileText;
      case 'consultation_complete':
        return CheckCircle;
      case 'in_production':
        return Package;
      case 'mailed':
        return Mail;
      case 'completed':
        return TrendingUp;
      default:
        return AlertCircle;
    }
  };

  if (view === 'create') {
    return (
      <DirectMailConsultation
        brandId={brandId}
        profile={profile}
        onComplete={handleConsultationComplete}
        onExit={() => setView('list')}
      />
    );
  }

  if (view === 'edit' && selectedCampaign) {
    return (
      <DirectMailConsultation
        brandId={brandId}
        profile={profile}
        existingCampaign={selectedCampaign}
        onComplete={handleConsultationComplete}
        onExit={() => setView('list')}
      />
    );
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="w-6 h-6 text-primary" />
            Direct Mail Campaigns
          </h2>
          <p className="text-gray-600 mt-1">
            Create and manage your direct mail marketing campaigns
          </p>
        </div>
        <Button onClick={handleCreateNew} variant="primary">
          <Plus className="w-4 h-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-5 h-5 text-gray-500" />
            <span className="text-2xl font-bold">{campaigns.length}</span>
          </div>
          <p className="text-sm text-gray-600">Total Campaigns</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Edit2 className="w-5 h-5 text-orange-500" />
            <span className="text-2xl font-bold">
              {campaigns.filter(c => c.status === 'draft').length}
            </span>
          </div>
          <p className="text-sm text-gray-600">Drafts</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Package className="w-5 h-5 text-yellow-500" />
            <span className="text-2xl font-bold">
              {campaigns.filter(c => c.status === 'in_production').length}
            </span>
          </div>
          <p className="text-sm text-gray-600">In Production</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Mail className="w-5 h-5 text-purple-500" />
            <span className="text-2xl font-bold">
              {campaigns.filter(c => c.status === 'mailed').length}
            </span>
          </div>
          <p className="text-sm text-gray-600">Mailed</p>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'draft', label: '📝 Drafts' },
              { value: 'consultation_complete', label: '✅ Ready for Production' },
              { value: 'in_production', label: '🏭 In Production' },
              { value: 'mailed', label: '📬 Mailed' },
              { value: 'completed', label: '🎉 Completed' }
            ]}
          />
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            options={[
              { value: 'date', label: 'Sort by Date' },
              { value: 'name', label: 'Sort by Name' },
              { value: 'status', label: 'Sort by Status' }
            ]}
          />
        </div>
      </Card>

      {/* Campaigns List */}
      {isLoading ? (
        <Card className="p-12 text-center">
          <div className="animate-pulse">Loading campaigns...</div>
        </Card>
      ) : (filteredCampaigns.length === 0 && campaigns.length > 0) ? (
        <Card className="p-12 text-center">
          <Filter className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No campaigns match filters</h3>
          <p className="text-gray-600 mb-4">
            Try adjusting your search or filter settings
          </p>
          <p className="text-sm text-gray-500">
            Total campaigns: {campaigns.length}
          </p>
        </Card>
      ) : campaigns.length === 0 ? (
        <Card className="p-12 text-center">
          <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No campaigns yet</h3>
          <p className="text-gray-600 mb-4">
            Create your first direct mail campaign to get started
          </p>
          <Button onClick={handleCreateNew} variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            Create Campaign
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredCampaigns.map((campaign) => {
            const StatusIcon = getStatusIcon(campaign.status);
            return (
              <Card key={campaign.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <StatusIcon className="w-6 h-6 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-1">{campaign.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(campaign.created_at).toLocaleDateString()}
                          </span>
                          {campaign.metadata?.mailVolume && (
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {campaign.metadata.mailVolume} recipients
                            </span>
                          )}
                          {campaign.metadata?.budget && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              {campaign.metadata.budget}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(campaign.status)}>
                            {campaign.status === 'draft' ? '📝 Draft' : campaign.status.replace('_', ' ')}
                          </Badge>
                          {campaign.metadata?.completedSections !== undefined && (
                            <Badge 
                              variant="outline"
                              className={campaign.metadata.completedSections === campaign.metadata.totalSections 
                                ? 'border-green-500 text-green-700 bg-green-50' 
                                : 'border-orange-500 text-orange-700 bg-orange-50'
                              }
                            >
                              {campaign.metadata.completedSections}/{campaign.metadata.totalSections} sections
                              {campaign.metadata.completedSections < campaign.metadata.totalSections && ' (incomplete)'}
                            </Badge>
                          )}
                          {campaign.metadata?.progress !== undefined && campaign.metadata.progress < 100 && (
                            <Badge variant="outline" className="border-gray-400">
                              {campaign.metadata.progress}% complete
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {campaign.analysis ? (
                      <Button
                        onClick={() => handleViewAnalysis(campaign)}
                        variant="primary"
                        size="sm"
                        title="View postcard analysis"
                        className="gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        View Analysis
                      </Button>
                    ) : (
                      (campaign.status === 'consultation_complete' || campaign.status === 'draft') && (
                        <Button
                          onClick={() => handleSendToTala(campaign)}
                          variant="primary"
                          size="sm"
                          title="Generate AI postcard analysis"
                          className="gap-1"
                        >
                          <Sparkles className="w-4 h-4" />
                          Generate Analysis
                        </Button>
                      )
                    )}
                    <Button
                      onClick={() => handleEditCampaign(campaign)}
                      variant="ghost"
                      size="sm"
                      title="View/Edit Campaign"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDuplicateCampaign(campaign)}
                      variant="ghost"
                      size="sm"
                      title="Duplicate Campaign"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      variant="ghost"
                      size="sm"
                      title="Delete Campaign"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Postcard Analysis Modal */}
      {analysisModalData && (
        <PostcardAnalysisModal
          isOpen={isAnalysisModalOpen}
          onClose={() => {
            setIsAnalysisModalOpen(false);
            setAnalysisModalData(null);
          }}
          campaignId={analysisModalData.campaign.id}
          campaignName={analysisModalData.campaign.name}
          consultationData={analysisModalData.campaign}
          brandId={brandId}
          onSave={handleSaveAnalysis}
        />
      )}
    </div>
  );
}