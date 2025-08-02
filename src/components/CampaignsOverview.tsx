import React, { useState, useCallback } from 'react';
import { Plus, Download, RefreshCw, List, Clock } from 'lucide-react';
import { useCampaignStore } from '../store/campaignStore';
import { useCampaignData } from '../hooks/useCampaignData';
import CampaignToggle from './CampaignToggle';
import SequenceViewerModal from './SequenceViewerModal';
import StatusFilter from './StatusFilter';
import { ErrorDisplay } from './ErrorHandler';

interface CampaignsOverviewProps {
  onNavigate: (view: 'dashboard' | 'leadfinder' | 'campaigns' | 'leads' | 'integrations' | 'monitoring') => void;
}

const CampaignsOverview: React.FC<CampaignsOverviewProps> = ({ onNavigate }) => {
  const { mode } = useCampaignStore();
  const [activeTab, setActiveTab] = useState('Campaigns');
  
  // Sequence viewer modal state
  const [sequenceModal, setSequenceModal] = useState<{
    isOpen: boolean;
    campaignId: string;
    campaignName: string;
  }>({
    isOpen: false,
    campaignId: '',
    campaignName: ''
  });
  
  // INVESTIGATE: Check what the service is actually returning
  const { campaigns: rawCampaigns, loading, error, refetch } = useCampaignData(mode);
  
  // DEBUG: Log what we're actually getting from the service
  console.log('🔍 INVESTIGATION: Raw campaigns from hook:', rawCampaigns);
  console.log('🔍 INVESTIGATION: Loading state:', loading);
  console.log('🔍 INVESTIGATION: Error state:', error);
  
  // Use the raw campaigns to see what the service is really returning
  const campaigns = rawCampaigns;
  
  // Local state for filter
  const [filter, setFilter] = useState<'All' | 'Draft' | 'Running' | 'Paused' | 'Stopped' | 'Completed'>('All');
  
  // Filter campaigns
  const filteredCampaigns = filter === 'All' 
    ? campaigns 
    : campaigns.filter(c => c.status.toLowerCase() === filter.toLowerCase());

  // Calculate stats
  const stats = {
    total: campaigns.length,
    draft: campaigns.filter(c => c.status === 'Draft').length,
    running: campaigns.filter(c => c.status === 'Running').length,
    paused: campaigns.filter(c => c.status === 'Paused').length,
    stopped: campaigns.filter(c => c.status === 'Stopped').length,
    completed: campaigns.filter(c => c.status === 'Completed').length
  };

  // Handle sequence modal
  const openSequenceModal = (campaignId: string, campaignName: string) => {
    setSequenceModal({
      isOpen: true,
      campaignId,
      campaignName
    });
  };

  const closeSequenceModal = () => {
    setSequenceModal({
      isOpen: false,
      campaignId: '',
      campaignName: ''
    });
  };

  // Export functionality
  const handleExport = useCallback(() => {
    const csvContent = [
      ['Campaign Name', 'Status', 'Total Contacted', 'Open Rate', 'Click Rate', 'Reply Rate', 'Leads Ready', 'Emails Sent'].join(','),
      ...filteredCampaigns.map(campaign => 
        [
          campaign.name,
          campaign.status,
          campaign.totalContacted || 0,
          `${campaign.openRate || 0}%`,
          `${campaign.clickRate || 0}%`,
          `${campaign.replyRate || 0}%`,
          campaign.leadsReady || 0,
          campaign.emailsSent || 0
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaigns-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [filteredCampaigns]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="px-6 py-4" style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #333333' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src="/Node Logo-White.png" 
              alt="Logo" 
              className="h-8 w-auto"
            />
          </div>
          <div className="flex space-x-8">
            <button 
              onClick={() => onNavigate('dashboard')}
              className="transition-colors hover:opacity-80"
             style={{ color: '#888888' }}
            >
              Dashboard
            </button>
            <button 
              onClick={() => onNavigate('leadfinder')}
              className="transition-colors hover:opacity-80"
             style={{ color: '#888888' }}
            >
              Generate
            </button>
            <button 
              onClick={() => onNavigate('leads')}
              className="transition-colors hover:opacity-80"
              style={{ color: '#888888' }}
            >
              Leads
            </button>
            <button 
              onClick={() => onNavigate('campaigns')}
              className="transition-colors hover:opacity-80"
             style={{ color: '#ffffff' }}
            >
              Campaigns
            </button>
            <button 
              onClick={() => onNavigate('monitoring')}
              className="transition-colors hover:opacity-80" 
             style={{ color: '#888888' }}
            >
              Monitoring
            </button>
            <button 
              className="transition-colors hover:opacity-80" 
             style={{ color: '#888888' }}
              onClick={() => onNavigate('integrations')}
            >
              Settings
            </button>
          </div>
          <div className="flex items-center">
            <CampaignToggle />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-white">
              Campaigns Overview
            </h1>
            <p className="text-base" style={{ color: '#ffffff' }}>
              {mode === 'email' 
                ? 'Real-time email campaign analytics from Instantly.ai'
                : 'LinkedIn campaign management (Coming Soon)'
              }
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={refetch}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: '#333333', border: '1px solid #555555', color: '#ffffff' }}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            <button 
              onClick={handleExport}
              disabled={campaigns.length === 0}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: '#333333', border: '1px solid #555555', color: '#ffffff' }}
            >
              <Download size={16} />
              <span>Export CSV</span>
            </button>
            <button 
              className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:opacity-80"
              style={{ backgroundColor: '#3b82f6', color: 'white' }}
            >
              <Plus size={16} />
              <span>New Campaign</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center space-x-1 mb-6 rounded-lg p-1 w-fit" style={{ backgroundColor: '#333333', border: '1px solid #555555' }}>
          {['Campaigns', 'Templates', 'Analytics'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                activeTab === tab 
                  ? 'text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              style={{
                backgroundColor: activeTab === tab ? '#555555' : 'transparent',
                border: activeTab === tab ? '1px solid #777777' : '1px solid transparent'
              }}
            >
              <span>{tab}</span>
            </button>
          ))}
        </div>

        {/* Status Filters */}
        <StatusFilter 
          filter={filter}
          setFilter={setFilter}
          stats={stats}
          loading={loading}
        />

        {/* Content */}
        {error ? (
          <ErrorDisplay 
            error={error} 
            onRetry={refetch}
          />
        ) : loading && campaigns.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-3">
              <RefreshCw size={20} className="animate-spin" style={{ color: '#888888' }} />
              <span style={{ color: '#888888' }}>Loading campaigns...</span>
            </div>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4">
              <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center" 
                   style={{ backgroundColor: '#333333' }}>
                <Plus size={24} style={{ color: '#888888' }} />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Campaigns Found</h3>
            <p className="text-gray-400 mb-6">
              {filter === 'All' 
                ? (mode === 'email' 
                    ? 'Create your first email campaign to get started'
                    : 'LinkedIn campaigns coming soon')
                : `No campaigns with status "${filter}"`
              }
            </p>
            {filter === 'All' && mode === 'email' && (
              <button 
                className="flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:opacity-80 mx-auto"
                style={{ backgroundColor: '#3b82f6', color: 'white' }}
              >
                <Plus size={16} />
                <span>Create Campaign</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => (
            <div 
              key={campaign.id}
              className="rounded-xl p-6 transition-all duration-200 hover:border-opacity-80"
              style={{ 
                backgroundColor: '#1a1a1a', 
                border: '1px solid #333333' 
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#555555';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#333333';
                e.currentTarget.style.transform = 'translateY(0px)';
              }}
            >
              {/* Campaign Header */}
              <div className="flex items-center space-x-3 mb-4">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: campaign.statusColor }}
                />
                <h3 className="text-lg font-semibold text-white">{campaign.name}</h3>
              </div>

              {/* Status */}
              <div className="mb-4">
                <span 
                  className="text-sm font-medium px-2 py-1 rounded"
                  style={{ 
                    backgroundColor: campaign.statusColor + '20',
                    color: campaign.statusColor 
                  }}
                >
                  {campaign.status}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: '#cccccc' }}>Preparation</span>
                  <span className="text-sm font-medium text-white">{campaign.preparation}%</span>
                </div>
                <div className="w-full rounded-full h-2" style={{ backgroundColor: '#333333' }}>
                  <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${campaign.preparation}%`,
                      backgroundColor: campaign.statusColor 
                    }}
                  />
                </div>
              </div>

              {/* Campaign Analytics */}
              <div className="space-y-3 mb-6">
                {/* Row 1: Contact & Engagement Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 rounded" style={{ backgroundColor: '#0f0f0f', border: '1px solid #333333' }}>
                    <div className="text-lg font-bold text-white">{campaign.totalContacted}</div>
                    <div className="text-xs" style={{ color: '#888888' }}>Total Contacted</div>
                  </div>
                  <div className="p-2 rounded" style={{ backgroundColor: '#0f0f0f', border: '1px solid #333333' }}>
                    <div className="text-lg font-bold text-white">{campaign.openRate}%</div>
                    <div className="text-xs" style={{ color: '#888888' }}>Open Rate</div>
                  </div>
                </div>

                {/* Row 2: Click & Reply Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 rounded" style={{ backgroundColor: '#0f0f0f', border: '1px solid #333333' }}>
                    <div className="text-lg font-bold text-white">{campaign.clickRate}%</div>
                    <div className="text-xs" style={{ color: '#888888' }}>Click Rate</div>
                  </div>
                  <div className="p-2 rounded" style={{ backgroundColor: '#0f0f0f', border: '1px solid #333333' }}>
                    <div className="text-lg font-bold text-white">{campaign.replyRate}%</div>
                    <div className="text-xs" style={{ color: '#888888' }}>Reply Rate</div>
                  </div>
                </div>

                {/* Row 3: Operational Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 rounded" style={{ backgroundColor: '#0f0f0f', border: '1px solid #333333' }}>
                    <div className="text-lg font-bold text-white">{campaign.leadsReady}</div>
                    <div className="text-xs" style={{ color: '#888888' }}>Leads Ready</div>
                  </div>
                  <div className="p-2 rounded" style={{ backgroundColor: '#0f0f0f', border: '1px solid #333333' }}>
                    <div className="text-lg font-bold text-white">{campaign.emailsSent}</div>
                    <div className="text-xs" style={{ color: '#888888' }}>Emails Sent</div>
                  </div>
                </div>
              </div>

              {/* View Sequences */}
              <div>
                <button
                  onClick={() => openSequenceModal(campaign.id, campaign.name)}
                  className="w-full flex items-center justify-center p-3 rounded-lg transition-all duration-200 hover:border-opacity-80"
                  style={{ backgroundColor: '#0f0f0f', border: '1px solid #333333' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#555555';
                    e.currentTarget.style.backgroundColor = '#1a1a1a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#333333';
                    e.currentTarget.style.backgroundColor = '#0f0f0f';
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <List size={16} style={{ color: '#888888' }} />
                    <span className="text-sm" style={{ color: '#888888' }}>View Sequences</span>
                  </div>
                </button>
              </div>
            </div>
          ))}
          </div>
        )}

      </div>
      
      {/* Sequence Viewer Modal */}
      <SequenceViewerModal
        isOpen={sequenceModal.isOpen}
        onClose={closeSequenceModal}
        campaignId={sequenceModal.campaignId}
        campaignName={sequenceModal.campaignName}
      />
    </div>
  );
};

export default CampaignsOverview;