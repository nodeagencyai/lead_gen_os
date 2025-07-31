import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, ChevronDown, MoreHorizontal, Loader } from 'lucide-react';
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
  const filteredLeads = currentLeads;

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
                  <th className="text-left p-4 text-sm font-medium" style={{ color: '#999999' }}>City</th>
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
                    <td className="p-4 text-sm" style={{ color: '#cccccc' }}>{formatFieldValue(lead.city)}</td>
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