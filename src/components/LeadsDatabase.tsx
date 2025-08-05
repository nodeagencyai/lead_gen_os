import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Download, ChevronDown, MoreHorizontal, Loader, Send, AlertCircle, X, CheckCircle, ArrowUpDown } from 'lucide-react';
import { useCampaignStore } from '../store/campaignStore';
import CampaignToggle from './CampaignToggle';
import { LeadsService } from '../services/leadsService';
// Sync status type
type SyncStatus = 'synced' | 'not-synced' | 'pending' | 'unknown';

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
  syncStatus?: SyncStatus;
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
  const [showSort, setShowSort] = useState(false);
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
  
  // Sync status states - now using instantly_synced column directly from lead data
  const [showSyncedFilter, setShowSyncedFilter] = useState<'all' | 'synced' | 'not-synced'>('all');
  
  // Processed status filter
  const [showProcessedFilter, setShowProcessedFilter] = useState<'all' | 'processed' | 'not-processed'>('all');
  
  // Sort/View options
  const [sortBy, setSortBy] = useState<'recent' | 'synced-first' | 'not-synced-first' | 'processed-first' | 'not-processed-first' | 'company-az' | 'company-za' | 'name-az' | 'name-za'>('recent');

  const formatFieldValue = (value: any): string => {
    if (value === null || value === undefined || value === '') {
      return 'N/A';
    }
    return String(value);
  };

  // Move fetchLeads to component scope so it can be called from anywhere
  const fetchLeads = useCallback(async () => {
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
  }, [searchTerm]);

  useEffect(() => {
    fetchLeads();
  }, [searchTerm, fetchLeads]);

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

  // No longer need complex sync status checking since we use instantly_synced column directly from lead data

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
    
    // Sync status filter using platform-specific sync column
    const isSynced = mode === 'email' 
      ? (lead as any).instantly_synced === true
      : (lead as any).heyreach_synced === true;
    const matchesSyncFilter = showSyncedFilter === 'all' ||
      (showSyncedFilter === 'synced' && isSynced) ||
      (showSyncedFilter === 'not-synced' && !isSynced);
    
    // Processed status filter
    const isProcessed = (lead as any).processed === true;
    const matchesProcessedFilter = showProcessedFilter === 'all' ||
      (showProcessedFilter === 'processed' && isProcessed) ||
      (showProcessedFilter === 'not-processed' && !isProcessed);
    
    return matchesSearch && matchesNiche && matchesTag && matchesDateRange && matchesSyncFilter && matchesProcessedFilter;
  }).sort((a, b) => {
    // Apply sorting based on sortBy state
    switch (sortBy) {
      case 'synced-first':
        const aSynced = mode === 'email' ? (a as any).instantly_synced === true : (a as any).heyreach_synced === true;
        const bSynced = mode === 'email' ? (b as any).instantly_synced === true : (b as any).heyreach_synced === true;
        if (aSynced === bSynced) return 0;
        return aSynced ? -1 : 1; // Synced first
        
      case 'not-synced-first':
        const aSyncedNot = mode === 'email' ? (a as any).instantly_synced === true : (a as any).heyreach_synced === true;
        const bSyncedNot = mode === 'email' ? (b as any).instantly_synced === true : (b as any).heyreach_synced === true;
        if (aSyncedNot === bSyncedNot) return 0;
        return aSyncedNot ? 1 : -1; // Not synced first
        
      case 'processed-first':
        const aProcessed = (a as any).processed === true;
        const bProcessed = (b as any).processed === true;
        if (aProcessed === bProcessed) return 0;
        return aProcessed ? -1 : 1; // Processed first
        
      case 'not-processed-first':
        const aProcessedNot = (a as any).processed === true;
        const bProcessedNot = (b as any).processed === true;
        if (aProcessedNot === bProcessedNot) return 0;
        return aProcessedNot ? 1 : -1; // Not processed first
        
      case 'company-az':
        const aCompany = (a.company || '').toLowerCase();
        const bCompany = (b.company || '').toLowerCase();
        return aCompany.localeCompare(bCompany);
        
      case 'company-za':
        const aCompanyZ = (a.company || '').toLowerCase();
        const bCompanyZ = (b.company || '').toLowerCase();
        return bCompanyZ.localeCompare(aCompanyZ);
        
      case 'name-az':
        const aName = (a.full_name || '').toLowerCase();
        const bName = (b.full_name || '').toLowerCase();
        return aName.localeCompare(bName);
        
      case 'name-za':
        const aNameZ = (a.full_name || '').toLowerCase();
        const bNameZ = (b.full_name || '').toLowerCase();
        return bNameZ.localeCompare(aNameZ);
        
      case 'recent':
      default:
        // Sort by created_at date, most recent first
        const aDate = new Date(a.created_at || 0);
        const bDate = new Date(b.created_at || 0);
        return bDate.getTime() - aDate.getTime();
    }
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
      
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      setSendingMessage(`Failed to load campaigns: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSendingStatus('error');
    } finally {
      setCampaignsLoading(false);
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

    const payload = {
      leadIds: selectedLeads.map(id => parseInt(id)),
      leadSource: mode === 'email' ? 'apollo' : 'linkedin',
      campaignId: campaignId,
      campaignName: campaignName,
      platform: mode === 'email' ? 'instantly' : 'heyreach'
    };

    console.log('🔍 FRONTEND DEBUG: Selected lead details:', {
      selectedLeadsRaw: selectedLeads,
      selectedLeadsCount: selectedLeads.length,
      actualLeadObjects: selectedLeads.map(id => {
        const lead = filteredLeads.find(l => l.id.toString() === id);
        return lead ? { id: lead.id, name: lead.full_name, email: lead.email } : null;
      }).filter(Boolean),
      payload
    });

    console.log('Sending leads with payload:', payload);

    try {
      const response = await fetch('/api/campaigns/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      console.log('Campaign send response:', response.status, result);

      if (!response.ok) {
        // Provide more detailed error information
        const errorDetails = result.details ? ` - ${result.details}` : '';
        throw new Error(result.error || `Failed to send leads: ${response.statusText}${errorDetails}`);
      }

      setSendingStatus('success');
      setSendingMessage(`Successfully sent ${selectedLeads.length} leads to ${campaignName}!`);
      
      // Clear selections and form
      setSelectedLeads([]);
      setCampaignId('');
      setCampaignName('');
      setSelectedCampaign(null);
      
      // Refresh leads data to get updated sync status from database
      fetchLeads();
      
      // Auto-hide after success
      setTimeout(() => {
        setShowCampaignSend(false);
        setSendingStatus('idle');
        setSendingMessage('');
      }, 3000);

    } catch (error) {
      console.error('Error sending leads to campaign:', error);
      setSendingStatus('error');
      
      // Provide helpful error messages
      let errorMessage = 'Failed to send leads to campaign';
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Add helpful hints for common errors
        if (errorMessage.includes('API key not configured')) {
          errorMessage += '. Please check your API keys in the Settings/Integrations page.';
        } else if (errorMessage.includes('404')) {
          errorMessage += '. Campaign may not exist or ID is incorrect.';
        } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
          errorMessage += '. API key may be invalid or expired.';
        } else if (errorMessage.includes('Instantly API error')) {
          errorMessage = 'Instantly API Error: ' + errorMessage;
        } else if (errorMessage.includes('HeyReach API error')) {
          errorMessage = 'HeyReach API Error: ' + errorMessage;
        }
      }
      
      setSendingMessage(errorMessage);
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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showExport && !target.closest('.export-dropdown')) {
        setShowExport(false);
      }
      if (showFilters && !target.closest('.filters-panel') && !target.closest('.filter-button')) {
        setShowFilters(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExport, showFilters]);

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
                style={{ backgroundColor: '#0A2540', border: '1px solid #082030', color: '#5BB0FF' }}
              >
                <Send size={16} />
                <span>Send to Campaign ({selectedLeads.length})</span>
              </button>
            )}

            <div className="relative">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="filter-button flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:opacity-80"
                style={{ backgroundColor: '#333333', border: '1px solid #555555', color: '#ffffff' }}
              >
                <Filter size={16} />
                <span>Filters</span>
                <ChevronDown size={16} />
              </button>
            </div>

            <div className="relative">
              <button 
                onClick={() => setShowSort(!showSort)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:opacity-80"
                style={{ backgroundColor: '#333333', border: '1px solid #555555', color: '#ffffff' }}
              >
                <ArrowUpDown size={16} />
                <span>Sort By</span>
                <ChevronDown size={16} />
              </button>
              
              {/* Sort Dropdown */}
              {showSort && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-xl z-10" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333333' }}>
                  <div className="py-2">
                    <button
                      onClick={() => { setSortBy('recent'); setShowSort(false); }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors hover:opacity-80 ${sortBy === 'recent' ? 'font-semibold' : ''}`}
                      style={{ 
                        color: sortBy === 'recent' ? '#ffffff' : '#cccccc',
                        backgroundColor: sortBy === 'recent' ? '#333333' : 'transparent'
                      }}
                    >
                      Most Recent First
                    </button>
                    <button
                      onClick={() => { setSortBy('synced-first'); setShowSort(false); }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors hover:opacity-80 ${sortBy === 'synced-first' ? 'font-semibold' : ''}`}
                      style={{ 
                        color: sortBy === 'synced-first' ? '#10b981' : '#cccccc',
                        backgroundColor: sortBy === 'synced-first' ? '#333333' : 'transparent'
                      }}
                    >
                      ✅ Synced First
                    </button>
                    <button
                      onClick={() => { setSortBy('not-synced-first'); setShowSort(false); }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors hover:opacity-80 ${sortBy === 'not-synced-first' ? 'font-semibold' : ''}`}
                      style={{ 
                        color: sortBy === 'not-synced-first' ? '#ef4444' : '#cccccc',
                        backgroundColor: sortBy === 'not-synced-first' ? '#333333' : 'transparent'
                      }}
                    >
                      ❌ Not Synced First
                    </button>
                    <button
                      onClick={() => { setSortBy('processed-first'); setShowSort(false); }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors hover:opacity-80 ${sortBy === 'processed-first' ? 'font-semibold' : ''}`}
                      style={{ 
                        color: sortBy === 'processed-first' ? '#10b981' : '#cccccc',
                        backgroundColor: sortBy === 'processed-first' ? '#333333' : 'transparent'
                      }}
                    >
                      ✅ Processed First
                    </button>
                    <button
                      onClick={() => { setSortBy('not-processed-first'); setShowSort(false); }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors hover:opacity-80 ${sortBy === 'not-processed-first' ? 'font-semibold' : ''}`}
                      style={{ 
                        color: sortBy === 'not-processed-first' ? '#ef4444' : '#cccccc',
                        backgroundColor: sortBy === 'not-processed-first' ? '#333333' : 'transparent'
                      }}
                    >
                      ❌ Not Processed First
                    </button>
                    <div className="border-t mx-2 my-1" style={{ borderColor: '#333333' }}></div>
                    <button
                      onClick={() => { setSortBy('name-az'); setShowSort(false); }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors hover:opacity-80 ${sortBy === 'name-az' ? 'font-semibold' : ''}`}
                      style={{ 
                        color: sortBy === 'name-az' ? '#ffffff' : '#cccccc',
                        backgroundColor: sortBy === 'name-az' ? '#333333' : 'transparent'
                      }}
                    >
                      Name A → Z
                    </button>
                    <button
                      onClick={() => { setSortBy('name-za'); setShowSort(false); }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors hover:opacity-80 ${sortBy === 'name-za' ? 'font-semibold' : ''}`}
                      style={{ 
                        color: sortBy === 'name-za' ? '#ffffff' : '#cccccc',
                        backgroundColor: sortBy === 'name-za' ? '#333333' : 'transparent'
                      }}
                    >
                      Name Z → A
                    </button>
                    <button
                      onClick={() => { setSortBy('company-az'); setShowSort(false); }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors hover:opacity-80 ${sortBy === 'company-az' ? 'font-semibold' : ''}`}
                      style={{ 
                        color: sortBy === 'company-az' ? '#ffffff' : '#cccccc',
                        backgroundColor: sortBy === 'company-az' ? '#333333' : 'transparent'
                      }}
                    >
                      Company A → Z
                    </button>
                    <button
                      onClick={() => { setSortBy('company-za'); setShowSort(false); }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors hover:opacity-80 ${sortBy === 'company-za' ? 'font-semibold' : ''}`}
                      style={{ 
                        color: sortBy === 'company-za' ? '#ffffff' : '#cccccc',
                        backgroundColor: sortBy === 'company-za' ? '#333333' : 'transparent'
                      }}
                    >
                      Company Z → A
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="relative export-dropdown">
              <button 
                onClick={() => setShowExport(!showExport)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:opacity-80"
                style={{ backgroundColor: '#333333', border: '1px solid #555555', color: '#ffffff' }}
              >
                <Download size={16} />
                <span>Export</span>
                <ChevronDown size={16} />
              </button>
              
              {/* Export Dropdown */}
              {showExport && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-xl z-10" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333333' }}>
                  <div className="py-2">
                    <button
                      onClick={() => {
                        const csvContent = [
                          ['Name', 'Title', 'Company', 'Email', 'Niche'].join(','),
                          ...filteredLeads.map(lead => [
                            lead.full_name || '',
                            lead.title || '',
                            lead.company || '',
                            lead.email || '',
                            lead.niche || ''
                          ].map(field => `"${field}"`).join(','))
                        ].join('\n');
                        
                        const blob = new Blob([csvContent], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${mode}-leads-${new Date().toISOString().split('T')[0]}.csv`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                        setShowExport(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm transition-colors hover:opacity-80"
                      style={{ color: '#ffffff' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#333333';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      Export as CSV
                    </button>
                    <button
                      onClick={() => {
                        const jsonContent = JSON.stringify(filteredLeads, null, 2);
                        const blob = new Blob([jsonContent], { type: 'application/json' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${mode}-leads-${new Date().toISOString().split('T')[0]}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                        setShowExport(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm transition-colors hover:opacity-80"
                      style={{ color: '#ffffff' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#333333';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      Export as JSON
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Enhanced Filters Panel */}
        {showFilters && (
          <div className="filters-panel mb-6 p-4 rounded-lg" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333333' }}>
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
                  setShowSyncedFilter('all');
                  setShowProcessedFilter('all');
                }}
                className="text-xs px-3 py-1 rounded transition-colors hover:opacity-80"
                style={{ backgroundColor: '#333333', border: '1px solid #555555', color: '#ffffff' }}
              >
                Clear Filters
              </button>
            </div>
            
            {/* Sync Status Filter */}
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid #333333' }}>
              <label className="block text-xs font-medium mb-2" style={{ color: '#cccccc' }}>
                Filter by Sync Status
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowSyncedFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    showSyncedFilter === 'all' ? 'text-white' : 'text-gray-400 hover:text-white'
                  }`}
                  style={{
                    backgroundColor: showSyncedFilter === 'all' ? '#333333' : '#0f0f0f',
                    border: showSyncedFilter === 'all' ? '1px solid #555555' : '1px solid #333333'
                  }}
                >
                  All Leads
                </button>
                <button
                  onClick={() => setShowSyncedFilter('synced')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    showSyncedFilter === 'synced' ? '' : 'hover:opacity-80'
                  }`}
                  style={{
                    backgroundColor: showSyncedFilter === 'synced' ? '#10b98120' : '#0f0f0f',
                    border: showSyncedFilter === 'synced' ? '1px solid #10b981' : '1px solid #333333',
                    color: showSyncedFilter === 'synced' ? '#10b981' : '#888888'
                  }}
                >
                  <CheckCircle size={14} />
                  <span>Synced</span>
                </button>
                <button
                  onClick={() => setShowSyncedFilter('not-synced')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    showSyncedFilter === 'not-synced' ? '' : 'hover:opacity-80'
                  }`}
                  style={{
                    backgroundColor: showSyncedFilter === 'not-synced' ? '#ef444420' : '#0f0f0f',
                    border: showSyncedFilter === 'not-synced' ? '1px solid #ef4444' : '1px solid #333333',
                    color: showSyncedFilter === 'not-synced' ? '#ef4444' : '#888888'
                  }}
                >
                  <X size={14} />
                  <span>Not Synced</span>
                </button>
              </div>
            </div>
            
            {/* Processed Status Filter */}
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid #333333' }}>
              <label className="block text-xs font-medium mb-2" style={{ color: '#cccccc' }}>
                Filter by Processed Status
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowProcessedFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    showProcessedFilter === 'all' ? 'text-white' : 'text-gray-400 hover:text-white'
                  }`}
                  style={{
                    backgroundColor: showProcessedFilter === 'all' ? '#333333' : '#0f0f0f',
                    border: showProcessedFilter === 'all' ? '1px solid #555555' : '1px solid #333333'
                  }}
                >
                  All Leads
                </button>
                <button
                  onClick={() => setShowProcessedFilter('processed')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    showProcessedFilter === 'processed' ? '' : 'hover:opacity-80'
                  }`}
                  style={{
                    backgroundColor: showProcessedFilter === 'processed' ? '#10b98120' : '#0f0f0f',
                    border: showProcessedFilter === 'processed' ? '1px solid #10b981' : '1px solid #333333',
                    color: showProcessedFilter === 'processed' ? '#10b981' : '#888888'
                  }}
                >
                  <CheckCircle size={14} />
                  <span>Processed</span>
                </button>
                <button
                  onClick={() => setShowProcessedFilter('not-processed')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    showProcessedFilter === 'not-processed' ? '' : 'hover:opacity-80'
                  }`}
                  style={{
                    backgroundColor: showProcessedFilter === 'not-processed' ? '#ef444420' : '#0f0f0f',
                    border: showProcessedFilter === 'not-processed' ? '1px solid #ef4444' : '1px solid #333333',
                    color: showProcessedFilter === 'not-processed' ? '#ef4444' : '#888888'
                  }}
                >
                  <X size={14} />
                  <span>Not Processed</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Campaign Selection Modal */}
        {showCampaignSend && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black bg-opacity-80 backdrop-blur-sm transition-opacity duration-300" 
              onClick={() => {
                setShowCampaignSend(false);
                setSendingStatus('idle');
                setSendingMessage('');
                setSelectedCampaign(null);
                setCampaignId('');
                setCampaignName('');
              }}
            />
            
            {/* Modal */}
            <div className="relative rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto transform transition-all duration-300" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333333' }}>
              <div className="p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-2" style={{ color: '#ffffff' }}>
                      Send to Campaign
                    </h2>
                    <p className="text-sm" style={{ color: '#888888' }}>
                      Add {selectedLeads.length} selected {selectedLeads.length === 1 ? 'lead' : 'leads'} to a {mode === 'email' ? 'email' : 'LinkedIn'} campaign
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowCampaignSend(false);
                      setSendingStatus('idle');
                      setSendingMessage('');
                      setSelectedCampaign(null);
                      setCampaignId('');
                      setCampaignName('');
                    }}
                    className="p-2 rounded-lg transition-colors hover:opacity-80"
                    style={{ backgroundColor: '#333333', border: '1px solid #555555' }}
                  >
                    <X size={20} style={{ color: '#888888' }} />
                  </button>
                </div>

                {/* Status Message */}
                {sendingMessage && (
                  <div className={`mb-4 p-3 rounded-lg flex items-center space-x-3`} style={{
                    backgroundColor: sendingStatus === 'error' ? '#1a0f0f' : sendingStatus === 'success' ? '#0f1a1a' : '#1a1a1a',
                    border: `1px solid ${sendingStatus === 'error' ? '#ef4444' : sendingStatus === 'success' ? '#0A2540' : '#333333'}`,
                    color: sendingStatus === 'error' ? '#ef4444' : sendingStatus === 'success' ? '#5BB0FF' : '#ffffff'
                  }}>
                    {sendingStatus === 'error' && <AlertCircle className="w-5 h-5" />}
                    {sendingStatus === 'success' && <CheckCircle className="w-5 h-5" />}
                    {sendingStatus === 'loading' && <Loader className="w-5 h-5 animate-spin" />}
                    <span>{sendingMessage}</span>
                  </div>
                )}

                {/* Campaign Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2" style={{ color: '#cccccc' }}>
                    Select Campaign *
                  </label>
                  
                  {campaignsLoading ? (
                    <div className="flex items-center space-x-2 px-4 py-3 rounded-lg" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333333' }}>
                      <Loader className="w-5 h-5 animate-spin" style={{ color: '#888888' }} />
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
                      className="w-full px-4 py-3 pr-12 rounded-lg focus:outline-none transition-all duration-300 appearance-none"
                      style={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #333333',
                        color: '#ffffff',
                        fontSize: '16px',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14'%3E%3Cpath fill='%23888888' d='M11.293 4.293L7 8.586 2.707 4.293A1 1 0 001.293 5.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 1.25rem center',
                        backgroundSize: '14px'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#555555';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#333333';
                      }}
                    >
                      <option value="" disabled style={{ backgroundColor: '#1a1a1a', color: '#888888' }}>Choose a campaign...</option>
                      {availableCampaigns.map((campaign) => (
                        <option 
                          key={campaign.id || campaign.campaignId} 
                          value={campaign.id || campaign.campaignId}
                          style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}
                        >
                          {campaign.name || campaign.campaignName}
                          {campaign.leadCount ? ` (${campaign.leadCount} leads)` : ''}
                          {campaign.status === 'active' || campaign.status === 'running' ? ' ✓' : campaign.status === 'paused' ? ' ⏸' : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-4 py-3 rounded-lg text-sm flex items-center space-x-2" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333333', color: '#ef4444' }}>
                      <AlertCircle size={16} />
                      <span>No campaigns available</span>
                    </div>
                  )}
                </div>

                {/* Selected leads preview */}
                {selectedLeads.length > 0 && (
                  <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: '#0f0f0f', border: '1px solid #333333' }}>
                    <p className="text-sm mb-1" style={{ color: '#888888' }}>Sending:</p>
                    <p className="text-sm" style={{ color: '#ffffff' }}>
                      {(() => {
                        const selectedLeadNames = selectedLeads
                          .map(leadId => {
                            const lead = filteredLeads.find(l => l.id.toString() === leadId);
                            return lead?.full_name || 'Unknown';
                          })
                          .filter(name => name !== 'Unknown');
                        
                        if (selectedLeadNames.length === 0) return `${selectedLeads.length} leads`;
                        if (selectedLeadNames.length <= 3) return selectedLeadNames.join(', ');
                        return `${selectedLeadNames.slice(0, 3).join(', ')} and ${selectedLeads.length - 3} more`;
                      })()}
                    </p>
                  </div>
                )}

                {/* Selected campaign info */}
                {selectedCampaign && (
                  <div className="mb-6 p-3 rounded-lg" style={{ backgroundColor: '#0f0f0f', border: '1px solid #333333' }}>
                    <p className="text-sm" style={{ color: '#888888' }}>
                      Campaign: <span style={{ color: '#ffffff', fontWeight: '500' }}>{selectedCampaign.name || selectedCampaign.campaignName}</span>
                      {selectedCampaign.status && <span style={{ color: '#cccccc' }}> • {selectedCampaign.status}</span>}
                      {selectedCampaign.leadCount && <span style={{ color: '#cccccc' }}> • {selectedCampaign.leadCount} existing leads</span>}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowCampaignSend(false);
                      setSendingStatus('idle');
                      setSendingMessage('');
                      setSelectedCampaign(null);
                      setCampaignId('');
                      setCampaignName('');
                    }}
                    className="px-6 py-2.5 rounded-lg font-medium transition-all duration-200 hover:opacity-80"
                    style={{ backgroundColor: '#333333', border: '1px solid #555555', color: '#ffffff' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendToCampaign}
                    disabled={!selectedCampaign || selectedLeads.length === 0 || sendingStatus === 'loading'}
                    className="px-6 py-2.5 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    style={{
                      backgroundColor: '#0A2540',
                      border: '1px solid #082030',
                      color: '#5BB0FF'
                    }}
                  >
                    {sendingStatus === 'loading' ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send {selectedLeads.length} {selectedLeads.length === 1 ? 'Lead' : 'Leads'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
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
                  <th className="text-left p-4 text-sm font-medium" style={{ color: '#999999' }}>Sync Status</th>
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
                      {(() => {
                        if (!lead.email) {
                          return <span className="text-xs" style={{ color: '#666666' }}>No email</span>;
                        }
                        
                        // Check platform-specific sync column
                        const isSynced = mode === 'email' 
                          ? (lead as any).instantly_synced === true
                          : (lead as any).heyreach_synced === true;
                        
                        if (isSynced) {
                          return (
                            <span className="flex items-center justify-center px-3 py-1.5 rounded text-xs font-medium w-[100px] h-[28px] whitespace-nowrap" style={{ 
                              backgroundColor: '#10b98120', 
                              color: '#10b981',
                              border: '1px solid #10b98140'
                            }}>
                              Synced
                            </span>
                          );
                        } else {
                          return (
                            <span className="flex items-center justify-center px-3 py-1.5 rounded text-xs font-medium w-[100px] h-[28px] whitespace-nowrap" style={{ 
                              backgroundColor: '#ef444420', 
                              color: '#ef4444',
                              border: '1px solid #ef444440'
                            }}>
                              Not Synced
                            </span>
                          );
                        }
                      })()}
                    </td>
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