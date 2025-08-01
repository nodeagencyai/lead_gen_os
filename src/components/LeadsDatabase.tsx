import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, ChevronDown, MoreHorizontal, Loader, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { useCampaignStore } from '../store/campaignStore';
import CampaignToggle from './CampaignToggle';
import { LeadsService, type ApolloLead, type LinkedInLead } from '../services/leadsService';

interface DisplayLead {
  id: number;
  full_name?: string;
  title?: string;
  company?: string;
  city?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  website?: string;
  industry?: string;
  company_size?: string;
  location?: string;
  created_at?: string;
  niche?: string;
  tags?: string[];
  selected: boolean;
  [key: string]: any;
}

interface LeadsDatabaseProps {
  onNavigate: (view: 'dashboard' | 'leadfinder' | 'campaigns' | 'leads' | 'integrations' | 'monitoring') => void;
}

const LeadsDatabase: React.FC<LeadsDatabaseProps> = ({ onNavigate }) => {
  const { mode } = useCampaignStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [apolloLeads, setApolloLeads] = useState<DisplayLead[]>([]);
  const [linkedinLeads, setLinkedinLeads] = useState<DisplayLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // New filter states
  const [nicheFilter, setNicheFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  // Campaign sending states
  const [showCampaignSend, setShowCampaignSend] = useState(false);
  const [campaignId, setCampaignId] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [sendingStatus, setSendingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [sendingMessage, setSendingMessage] = useState('');
  
  // Campaign selection states
  const [availableCampaigns, setAvailableCampaigns] = useState<any[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [lastUsedCampaigns, setLastUsedCampaigns] = useState<{[key: string]: string}>({});

  const formatFieldValue = (value: any): string => {
    if (value === null || value === undefined || value === '') {
      return 'N/A';
    }
    return String(value);
  };

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch both Apollo and LinkedIn leads
        const [apolloData, linkedinData] = await Promise.all([
          LeadsService.getApolloLeads(searchTerm || undefined),
          LeadsService.getLinkedInLeads(searchTerm || undefined)
        ]);
        
        const apolloDisplayLeads: DisplayLead[] = apolloData.map(lead => ({
          ...lead,
          id: lead.id || 0,
          selected: false
        }));
        
        const linkedinDisplayLeads: DisplayLead[] = linkedinData.map(lead => ({
          ...lead,
          id: lead.id || 0,
          selected: false
        }));
        
        setApolloLeads(apolloDisplayLeads);
        setLinkedinLeads(linkedinDisplayLeads);
      } catch (err) {
        console.error('Failed to fetch leads:', err);
        setError(`Database connection error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setApolloLeads([]);
        setLinkedinLeads([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [searchTerm]);

  // Real-time subscriptions for live updates
  useEffect(() => {
    const apolloSubscription = LeadsService.subscribeToApolloUpdates((updatedLead) => {
      setApolloLeads(prev => {
        const existingIndex = prev.findIndex(l => l.id === updatedLead.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = { ...updatedLead, id: updatedLead.id || 0, selected: false };
          return updated;
        } else {
          return [{ ...updatedLead, id: updatedLead.id || 0, selected: false }, ...prev];
        }
      });
    });

    const linkedinSubscription = LeadsService.subscribeToLinkedInUpdates((updatedLead) => {
      setLinkedinLeads(prev => {
        const existingIndex = prev.findIndex(l => l.id === updatedLead.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = { ...updatedLead, id: updatedLead.id || 0, selected: false };
          return updated;
        } else {
          return [{ ...updatedLead, id: updatedLead.id || 0, selected: false }, ...prev];
        }
      });
    });

    return () => {
      apolloSubscription.unsubscribe();
      linkedinSubscription.unsubscribe();
    };
  }, []);

  const currentLeads = mode === 'email' ? apolloLeads : linkedinLeads;
  
  // Enhanced filtering logic
  const filteredLeads = currentLeads.filter(lead => {
    // Search term filter (existing)
    const matchesSearch = !searchTerm || 
      lead.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Niche filter
    const matchesNiche = !nicheFilter || 
      (lead.niche && lead.niche.toLowerCase().includes(nicheFilter.toLowerCase()));
    
    // Tag filter
    const matchesTag = !tagFilter || 
      (lead.tags && Array.isArray(lead.tags) && 
       lead.tags.some(tag => tag.toLowerCase().includes(tagFilter.toLowerCase())));
    
    // Date range filter
    const matchesDateRange = (!dateRange.start || !lead.created_at || 
      new Date(lead.created_at) >= new Date(dateRange.start)) &&
      (!dateRange.end || !lead.created_at || 
       new Date(lead.created_at) <= new Date(dateRange.end));
    
    return matchesSearch && matchesNiche && matchesTag && matchesDateRange;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(filteredLeads.map(lead => lead.id.toString()));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleSelectLead = (leadId: number, checked: boolean) => {
    const leadIdStr = leadId.toString();
    if (checked) {
      setSelectedLeads([...selectedLeads, leadIdStr]);
    } else {
      setSelectedLeads(selectedLeads.filter(id => id !== leadIdStr));
    }
  };

  const isAllSelected = filteredLeads.length > 0 && selectedLeads.length === filteredLeads.length;
  const isIndeterminate = selectedLeads.length > 0 && selectedLeads.length < filteredLeads.length;

  // Fetch available campaigns
  const fetchCampaigns = async () => {
    if (availableCampaigns.length > 0) return; // Use cache
    
    setCampaignsLoading(true);
    try {
      const endpoint = mode === 'email' ? '/api/instantly/campaigns' : '/api/heyreach/campaigns';
      const method = mode === 'email' ? 'GET' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        ...(mode === 'linkedin' && { body: JSON.stringify({}) })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch campaigns');
      }

      const campaigns = data.items || data.campaigns || [];
      setAvailableCampaigns(campaigns);
      
      // Auto-select based on niche intelligence
      autoSelectCampaign(campaigns);
      
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      setSendingMessage(`Failed to load campaigns: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSendingStatus('error');
    } finally {
      setCampaignsLoading(false);
    }
  };

  // Smart campaign auto-selection based on lead niches
  const autoSelectCampaign = (campaigns: any[]) => {
    if (campaigns.length === 0) return;

    // Get niches from selected leads
    const selectedLeadNiches = selectedLeads
      .map(leadId => {
        const lead = filteredLeads.find(l => l.id.toString() === leadId);
        return lead?.niche?.toLowerCase();
      })
      .filter(Boolean);

    // Find most common niche
    const nicheCount: {[key: string]: number} = {};
    selectedLeadNiches.forEach(niche => {
      if (niche) nicheCount[niche] = (nicheCount[niche] || 0) + 1;
    });
    
    const dominantNiche = Object.keys(nicheCount).reduce((a, b) => 
      nicheCount[a] > nicheCount[b] ? a : b, ''
    );

    // Try to find matching campaign by niche
    let bestCampaign = null;
    
    if (dominantNiche) {
      // Look for campaigns with niche in name
      bestCampaign = campaigns.find(campaign => 
        campaign.name?.toLowerCase().includes(dominantNiche)
      );
    }
    
    // Fallback to last used campaign for this niche
    if (!bestCampaign && dominantNiche && lastUsedCampaigns[dominantNiche]) {
      bestCampaign = campaigns.find(campaign => 
        campaign.id === lastUsedCampaigns[dominantNiche]
      );
    }
    
    // Final fallback to first campaign
    if (!bestCampaign) {
      bestCampaign = campaigns[0];
    }

    if (bestCampaign) {
      setSelectedCampaign(bestCampaign);
      setCampaignId(bestCampaign.id || bestCampaign.campaignId || '');
      setCampaignName(bestCampaign.name || bestCampaign.campaignName || '');
    }
  };

  // Campaign sending function
  const handleSendToCampaign = async () => {
    if (!campaignId || !campaignName || selectedLeads.length === 0) {
      setSendingMessage('Please select leads and enter campaign details');
      setSendingStatus('error');
      return;
    }

    setSendingStatus('loading');
    setSendingMessage(`Sending ${selectedLeads.length} leads to campaign...`);

    try {
      const response = await fetch('/api/campaigns/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadIds: selectedLeads.map(id => parseInt(id)),
          leadSource: mode === 'email' ? 'apollo' : 'linkedin',
          campaignId: campaignId,
          campaignName: campaignName,
          platform: mode === 'email' ? 'instantly' : 'heyreach'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to send leads: ${response.statusText}`);
      }

      setSendingStatus('success');
      setSendingMessage(`Successfully sent ${selectedLeads.length} leads to ${campaignName}!`);
      
      // Remember this campaign for the dominant niche
      if (selectedCampaign) {
        const selectedLeadNiches = selectedLeads
          .map(leadId => {
            const lead = filteredLeads.find(l => l.id.toString() === leadId);
            return lead?.niche?.toLowerCase();
          })
          .filter(Boolean);

        const nicheCount: {[key: string]: number} = {};
        selectedLeadNiches.forEach(niche => {
          if (niche) nicheCount[niche] = (nicheCount[niche] || 0) + 1;
        });
        
        const dominantNiche = Object.keys(nicheCount).reduce((a, b) => 
          nicheCount[a] > nicheCount[b] ? a : b, ''
        );

        if (dominantNiche) {
          setLastUsedCampaigns(prev => ({
            ...prev,
            [dominantNiche]: selectedCampaign.id || selectedCampaign.campaignId
          }));
        }
      }
      
      // Clear selections and form
      setSelectedLeads([]);
      setCampaignId('');
      setCampaignName('');
      setSelectedCampaign(null);
      
      // Auto-hide after success
      setTimeout(() => {
        setShowCampaignSend(false);
        setSendingStatus('idle');
        setSendingMessage('');
      }, 3000);

    } catch (error) {
      console.error('Error sending leads to campaign:', error);
      setSendingStatus('error');
      setSendingMessage(error instanceof Error ? error.message : 'Failed to send leads to campaign');
    }
  };

  // Auto-clear status messages after 5 seconds
  useEffect(() => {
    if (sendingStatus === 'success' || sendingStatus === 'error') {
      const timer = setTimeout(() => {
        if (sendingStatus !== 'success') { // Don't clear success messages automatically
          setSendingStatus('idle');
          setSendingMessage('');
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [sendingStatus]);

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
              style={{ color: '#ffffff' }}
            >
              Leads
            </button>
            <button 
              onClick={() => onNavigate('campaigns')}
              className="transition-colors hover:opacity-80" 
              style={{ color: '#888888' }}
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
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#ffffff' }}>
              {mode === 'email' ? 'Apollo Leads' : 'LinkedIn Leads'} Database
            </h1>
            <div className="text-sm" style={{ color: '#888888' }}>
              {loading ? 'Loading...' : error ? 'Error loading leads' : `${filteredLeads.length} leads • ${selectedLeads.length} selected`}
            </div>
          </div>
        </div>

        {/* Search and Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#888888' }} />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-300"
              style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #333333',
                color: '#ffffff'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#555555';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#333333';
              }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {/* Send to Campaign Button - Only show when leads are selected */}
            {selectedLeads.length > 0 && (
              <button 
                onClick={() => {
                  setShowCampaignSend(!showCampaignSend);
                  if (!showCampaignSend) {
                    fetchCampaigns();
                  }
                }}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:opacity-80"
                style={{ backgroundColor: '#10b981', border: '1px solid #059669', color: '#ffffff' }}
              >
                <Send size={16} />
                <span>Send to Campaign ({selectedLeads.length})</span>
              </button>
            )}

            <div className="relative">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:opacity-80"
                style={{ backgroundColor: '#333333', border: '1px solid #555555', color: '#ffffff' }}
              >
                <Filter size={16} />
                <span>Filters</span>
                <ChevronDown size={16} />
              </button>
            </div>

            <div className="relative">
              <button 
                onClick={() => setShowExport(!showExport)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:opacity-80"
                style={{ backgroundColor: '#333333', border: '1px solid #555555', color: '#ffffff' }}
              >
                <Download size={16} />
                <span>Export</span>
                <ChevronDown size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Filters Panel */}
        {showFilters && (
          <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333333' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Niche Filter */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: '#cccccc' }}>
                  Filter by Niche/Industry
                </label>
                <input
                  type="text"
                  placeholder="e.g., SaaS, Fintech..."
                  value={nicheFilter}
                  onChange={(e) => setNicheFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg focus:outline-none transition-all duration-300"
                  style={{
                    backgroundColor: '#0f0f0f',
                    border: '1px solid #333333',
                    color: '#ffffff',
                    fontSize: '14px'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#555555';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#333333';
                  }}
                />
              </div>

              {/* Tag Filter */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: '#cccccc' }}>
                  Filter by Tags
                </label>
                <input
                  type="text"
                  placeholder="e.g., enterprise, series-a..."
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg focus:outline-none transition-all duration-300"
                  style={{
                    backgroundColor: '#0f0f0f',
                    border: '1px solid #333333',
                    color: '#ffffff',
                    fontSize: '14px'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#555555';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#333333';
                  }}
                />
              </div>

              {/* Date Range Start */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: '#cccccc' }}>
                  From Date
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg focus:outline-none transition-all duration-300"
                  style={{
                    backgroundColor: '#0f0f0f',
                    border: '1px solid #333333',
                    color: '#ffffff',
                    fontSize: '14px'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#555555';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#333333';
                  }}
                />
              </div>

              {/* Date Range End */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: '#cccccc' }}>
                  To Date
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg focus:outline-none transition-all duration-300"
                  style={{
                    backgroundColor: '#0f0f0f',
                    border: '1px solid #333333',
                    color: '#ffffff',
                    fontSize: '14px'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#555555';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#333333';
                  }}
                />
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-xs" style={{ color: '#888888' }}>
                {filteredLeads.length} leads match your filters
              </div>
              <button
                onClick={() => {
                  setNicheFilter('');
                  setTagFilter('');
                  setDateRange({ start: '', end: '' });
                }}
                className="text-xs px-3 py-1 rounded transition-colors hover:opacity-80"
                style={{ backgroundColor: '#333333', border: '1px solid #555555', color: '#ffffff' }}
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Smart Campaign Selection Bar */}
        {showCampaignSend && (
          <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#1a1a1a', border: '1px solid #10b981' }}>
            {/* Status Message */}
            {sendingMessage && (
              <div className={`mb-4 p-3 rounded-lg flex items-center space-x-3`} style={{
                backgroundColor: sendingStatus === 'error' ? '#1a0f0f' : sendingStatus === 'success' ? '#0f1a0f' : '#1a1a1a',
                border: `1px solid ${sendingStatus === 'error' ? '#ef4444' : sendingStatus === 'success' ? '#10b981' : '#333333'}`,
                color: sendingStatus === 'error' ? '#ef4444' : sendingStatus === 'success' ? '#10b981' : '#ffffff'
              }}>
                {sendingStatus === 'error' && <AlertCircle className="w-5 h-5" />}
                {sendingStatus === 'success' && <CheckCircle className="w-5 h-5" />}
                {sendingStatus === 'loading' && <Loader className="w-5 h-5 animate-spin" />}
                <span>{sendingMessage}</span>
              </div>
            )}

            {/* Inline Campaign Selection */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Selection Count */}
                <div className="flex items-center space-x-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#0f0f0f', border: '1px solid #333333' }}>
                  <CheckCircle size={16} style={{ color: '#10b981' }} />
                  <span className="text-sm font-medium" style={{ color: '#10b981' }}>
                    {selectedLeads.length} selected
                  </span>
                </div>

                {/* Campaign Dropdown */}
                <div className="relative">
                  {campaignsLoading ? (
                    <div className="flex items-center space-x-2 px-4 py-2 rounded-lg" style={{ backgroundColor: '#0f0f0f', border: '1px solid #333333' }}>
                      <Loader className="w-4 h-4 animate-spin" style={{ color: '#888888' }} />
                      <span className="text-sm" style={{ color: '#888888' }}>Loading campaigns...</span>
                    </div>
                  ) : availableCampaigns.length > 0 ? (
                    <select
                      value={selectedCampaign?.id || selectedCampaign?.campaignId || ''}
                      onChange={(e) => {
                        const campaign = availableCampaigns.find(c => 
                          (c.id || c.campaignId) === e.target.value
                        );
                        if (campaign) {
                          setSelectedCampaign(campaign);
                          setCampaignId(campaign.id || campaign.campaignId || '');
                          setCampaignName(campaign.name || campaign.campaignName || '');
                        }
                      }}
                      className="px-4 py-2 rounded-lg focus:outline-none transition-all duration-300 min-w-[200px]"
                      style={{
                        backgroundColor: '#0f0f0f',
                        border: '1px solid #333333',
                        color: '#ffffff'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#10b981';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#333333';
                      }}
                    >
                      <option value="" disabled>Select Campaign</option>
                      {availableCampaigns.map((campaign) => (
                        <option 
                          key={campaign.id || campaign.campaignId} 
                          value={campaign.id || campaign.campaignId}
                          style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}
                        >
                          {campaign.name || campaign.campaignName} 
                          {campaign.leadCount ? ` (${campaign.leadCount} leads)` : ''}
                          {campaign.status ? ` - ${campaign.status}` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: '#1a0f0f', border: '1px solid #ef4444', color: '#ef4444' }}>
                      No campaigns available
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    setShowCampaignSend(false);
                    setSendingStatus('idle');
                    setSendingMessage('');
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-80"
                  style={{ backgroundColor: '#333333', border: '1px solid #555555', color: '#ffffff' }}
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleSendToCampaign}
                  disabled={!selectedCampaign || selectedLeads.length === 0 || sendingStatus === 'loading'}
                  className="px-6 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: '#10b981',
                    border: '1px solid #059669',
                    color: '#ffffff'
                  }}
                >
                  {sendingStatus === 'loading' ? (
                    <div className="flex items-center space-x-2">
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Sending...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Send size={16} />
                      <span>Send to {mode === 'email' ? 'Instantly' : 'HeyReach'}</span>
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Campaign Info */}
            {selectedCampaign && (
              <div className="mt-3 text-xs" style={{ color: '#888888' }}>
                Sending to: <span style={{ color: '#10b981' }}>{selectedCampaign.name || selectedCampaign.campaignName}</span>
                {selectedCampaign.status && <span> • Status: {selectedCampaign.status}</span>}
                {selectedCampaign.leadCount && <span> • Current leads: {selectedCampaign.leadCount}</span>}
              </div>
            )}
          </div>
        )}

        {/* Leads Table */}
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333333' }}>
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader className="w-8 h-8 animate-spin" style={{ color: '#888888' }} />
              <span className="ml-3" style={{ color: '#888888' }}>Loading leads...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center p-12">
              <span style={{ color: '#ef4444' }}>{error}</span>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12">
              <span style={{ color: '#888888', fontSize: '18px', marginBottom: '8px' }}>
                No {mode === 'email' ? 'Apollo' : 'LinkedIn'} leads found
              </span>
              <span style={{ color: '#666666', fontSize: '14px' }}>
                Use the Generate tab to scrape leads into your {mode === 'email' ? 'Apollo' : 'LinkedIn'} table
              </span>
            </div>
          ) : (
            <table className="w-full">
              <thead style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #333333' }}>
                <tr>
                  <th className="text-left p-4 w-12">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isIndeterminate;
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="text-left p-4 text-sm font-medium" style={{ color: '#999999' }}>Full Name</th>
                  <th className="text-left p-4 text-sm font-medium" style={{ color: '#999999' }}>Title</th>
                  <th className="text-left p-4 text-sm font-medium" style={{ color: '#999999' }}>Company</th>
                  <th className="text-left p-4 text-sm font-medium" style={{ color: '#999999' }}>Niche</th>
                  <th className="text-left p-4 text-sm font-medium" style={{ color: '#999999' }}>Tags</th>
                  <th className="text-left p-4 text-sm font-medium" style={{ color: '#999999' }}>Email</th>
                  <th className="text-left p-4 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead, index) => (
                  <tr 
                    key={lead.id} 
                    className="transition-colors"
                    style={{ borderTop: index > 0 ? '1px solid #333333' : 'none' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2a2a2a';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id.toString())}
                        onChange={(e) => handleSelectLead(lead.id, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-4 text-sm" style={{ color: '#ffffff' }}>{formatFieldValue(lead.full_name)}</td>
                    <td className="p-4 text-sm" style={{ color: '#cccccc' }}>{formatFieldValue(lead.title)}</td>
                    <td className="p-4 text-sm" style={{ color: '#cccccc' }}>{formatFieldValue(lead.company)}</td>
                    <td className="p-4 text-sm" style={{ color: '#cccccc' }}>
                      {lead.niche ? (
                        <span className="px-2 py-1 rounded-full text-xs" style={{ 
                          backgroundColor: '#333333', 
                          color: '#ffffff',
                          border: '1px solid #555555'
                        }}>
                          {lead.niche}
                        </span>
                      ) : (
                        <span style={{ color: '#666666' }}>N/A</span>
                      )}
                    </td>
                    <td className="p-4 text-sm" style={{ color: '#cccccc' }}>
                      {lead.tags && Array.isArray(lead.tags) && lead.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {lead.tags.slice(0, 2).map((tag, index) => (
                            <span key={index} className="px-2 py-1 rounded-full text-xs" style={{ 
                              backgroundColor: '#1a1a1a', 
                              color: '#cccccc',
                              border: '1px solid #333333'
                            }}>
                              {tag}
                            </span>
                          ))}
                          {lead.tags.length > 2 && (
                            <span className="text-xs" style={{ color: '#888888' }}>
                              +{lead.tags.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#666666' }}>N/A</span>
                      )}
                    </td>
                    <td className="p-4 text-sm" style={{ color: '#cccccc' }}>{formatFieldValue(lead.email)}</td>
                    <td className="p-4">
                      <button className="p-1 rounded hover:bg-gray-700 transition-colors">
                        <MoreHorizontal size={16} style={{ color: '#888888' }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Stats */}
        <div className="mt-6 text-center text-sm" style={{ color: '#777777' }}>
          Showing {filteredLeads.length} leads • {selectedLeads.length} selected
        </div>
      </div>
    </div>
  );
};

export default LeadsDatabase;