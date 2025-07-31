import React, { useState, useEffect } from 'react';
import { Filter, Download, Send, Calendar, Search, X, ChevronDown, Check } from 'lucide-react';

interface Lead {
  id: string;
  full_name: string;
  email: string;
  title: string;
  company: string;
  niche: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  campaign_history?: Array<{
    campaign_id: string;
    campaign_name: string;
    platform: string;
    sent_at: string;
    status: string;
  }>;
}

interface Campaign {
  id: string;
  name: string;
  platform: string;
}

interface LeadsDatabaseEnhancedProps {
  source?: 'linkedin' | 'apollo';
}

const LeadsDatabaseEnhanced: React.FC<LeadsDatabaseEnhancedProps> = ({ source = 'linkedin' }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [nicheFilter, setNicheFilter] = useState('');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [campaignStatus, setCampaignStatus] = useState('all');
  
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('instantly');
  
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableNiches, setAvailableNiches] = useState<string[]>([]);

  useEffect(() => {
    fetchLeads();
    fetchCampaigns();
    fetchAvailableFilters();
  }, [source]);

  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams({
        source,
        niche: nicheFilter,
        tags: tagFilter.join(','),
        dateStart: dateRange.start,
        dateEnd: dateRange.end,
        campaignStatus
      });
      
      const response = await fetch(`/api/leads/filter?${params}`);
      const data = await response.json();
      
      setLeads(data.leads);
      setFilteredLeads(data.leads);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching leads:', error);
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    const mockCampaigns: Campaign[] = [
      { id: 'camp1', name: 'Q1 Marketing Campaign', platform: 'instantly' },
      { id: 'camp2', name: 'SaaS Outreach 2025', platform: 'instantly' },
      { id: 'camp3', name: 'Enterprise Sales', platform: 'heyreach' }
    ];
    setCampaigns(mockCampaigns);
  };

  const fetchAvailableFilters = async () => {
    try {
      const response = await fetch(`/api/filters/available?source=${source}`);
      const data = await response.json();
      setAvailableTags(data.tags || []);
      setAvailableNiches(data.niches || []);
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  useEffect(() => {
    let filtered = [...leads];

    if (nicheFilter) {
      filtered = filtered.filter(lead => 
        lead.niche && lead.niche.toLowerCase().includes(nicheFilter.toLowerCase())
      );
    }

    if (tagFilter.length > 0) {
      filtered = filtered.filter(lead => 
        lead.tags && tagFilter.some(tag => lead.tags.includes(tag))
      );
    }

    if (dateRange.start) {
      filtered = filtered.filter(lead => 
        new Date(lead.created_at) >= new Date(dateRange.start)
      );
    }
    if (dateRange.end) {
      filtered = filtered.filter(lead => 
        new Date(lead.created_at) <= new Date(dateRange.end)
      );
    }

    if (campaignStatus === 'sent') {
      filtered = filtered.filter(lead => lead.campaign_history && lead.campaign_history.length > 0);
    } else if (campaignStatus === 'not-sent') {
      filtered = filtered.filter(lead => !lead.campaign_history || lead.campaign_history.length === 0);
    }

    setFilteredLeads(filtered);
  }, [leads, nicheFilter, tagFilter, dateRange, campaignStatus]);

  const handleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(lead => lead.id));
    }
  };

  const handleSelectLead = (leadId: string) => {
    if (selectedLeads.includes(leadId)) {
      setSelectedLeads(selectedLeads.filter(id => id !== leadId));
    } else {
      setSelectedLeads([...selectedLeads, leadId]);
    }
  };

  const handleSendToCampaign = async () => {
    if (!selectedCampaign || selectedLeads.length === 0) return;

    try {
      const response = await fetch('/api/campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: selectedLeads,
          leadSource: source,
          campaignId: selectedCampaign,
          platform: selectedPlatform
        })
      });

      if (response.ok) {
        alert(`Successfully sent ${selectedLeads.length} leads to campaign`);
        setShowCampaignModal(false);
        setSelectedLeads([]);
        fetchLeads();
      }
    } catch (error) {
      console.error('Error sending to campaign:', error);
      alert('Error sending leads to campaign');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{source === 'linkedin' ? 'LinkedIn' : 'Apollo'} Leads Database</h1>
            <p className="text-gray-400 mt-1">
              {filteredLeads.length} leads found · {selectedLeads.length} selected
            </p>
          </div>
          
          <div className="flex gap-3">
            {selectedLeads.length > 0 && (
              <button
                onClick={() => setShowCampaignModal(true)}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center"
              >
                <Send className="w-4 h-4 mr-2" />
                Send to Campaign ({selectedLeads.length})
              </button>
            )}
            <button className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg flex items-center">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <Filter className="w-5 h-5 text-gray-400" />
            
            <div className="relative">
              <input
                type="text"
                value={nicheFilter}
                onChange={(e) => setNicheFilter(e.target.value)}
                placeholder="Filter by niche..."
                className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {nicheFilter && (
                <X 
                  className="absolute right-2 top-2.5 w-4 h-4 cursor-pointer text-gray-400 hover:text-white"
                  onClick={() => setNicheFilter('')}
                />
              )}
            </div>

            <div className="flex gap-2 items-center">
              <span className="text-sm text-gray-400">Tags:</span>
              {availableTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    if (tagFilter.includes(tag)) {
                      setTagFilter(tagFilter.filter(t => t !== tag));
                    } else {
                      setTagFilter([...tagFilter, tag]);
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-xs transition-colors ${
                    tagFilter.includes(tag)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="flex gap-2 items-center">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="bg-gray-700 text-white px-2 py-1 rounded text-sm"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="bg-gray-700 text-white px-2 py-1 rounded text-sm"
              />
            </div>

            <select
              value={campaignStatus}
              onChange={(e) => setCampaignStatus(e.target.value)}
              className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm"
            >
              <option value="all">All Leads</option>
              <option value="sent">Sent to Campaign</option>
              <option value="not-sent">Not Sent</option>
            </select>

            {(nicheFilter || tagFilter.length > 0 || dateRange.start || dateRange.end || campaignStatus !== 'all') && (
              <button
                onClick={() => {
                  setNicheFilter('');
                  setTagFilter([]);
                  setDateRange({ start: '', end: '' });
                  setCampaignStatus('all');
                }}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                <th className="p-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="p-4 text-left text-sm font-medium">Name</th>
                <th className="p-4 text-left text-sm font-medium">Title</th>
                <th className="p-4 text-left text-sm font-medium">Company</th>
                <th className="p-4 text-left text-sm font-medium">Niche</th>
                <th className="p-4 text-left text-sm font-medium">Tags</th>
                <th className="p-4 text-left text-sm font-medium">Campaigns</th>
                <th className="p-4 text-left text-sm font-medium">Added</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    Loading leads...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    No leads found matching your filters
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="border-t border-gray-700 hover:bg-gray-750">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={() => handleSelectLead(lead.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="p-4">
                      <div>
                        <div className="font-medium">{lead.full_name}</div>
                        <div className="text-sm text-gray-400">{lead.email}</div>
                      </div>
                    </td>
                    <td className="p-4 text-sm">{lead.title}</td>
                    <td className="p-4 text-sm">{lead.company}</td>
                    <td className="p-4">
                      <span className="text-sm bg-blue-600 bg-opacity-20 text-blue-400 px-2 py-1 rounded">
                        {lead.niche}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1 flex-wrap">
                        {lead.tags && lead.tags.map((tag, idx) => (
                          <span key={idx} className="text-xs bg-gray-700 px-2 py-1 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      {lead.campaign_history && lead.campaign_history.length > 0 ? (
                        <div className="text-xs">
                          {lead.campaign_history[0].campaign_name}
                          {lead.campaign_history.length > 1 && (
                            <span className="text-gray-400"> +{lead.campaign_history.length - 1}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs">Not sent</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-400">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showCampaignModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-semibold mb-4">Send to Campaign</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Platform</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="instantly"
                      checked={selectedPlatform === 'instantly'}
                      onChange={(e) => setSelectedPlatform(e.target.value)}
                      className="mr-2"
                    />
                    Instantly
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="heyreach"
                      checked={selectedPlatform === 'heyreach'}
                      onChange={(e) => setSelectedPlatform(e.target.value)}
                      className="mr-2"
                    />
                    HeyReach
                  </label>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Select Campaign</label>
                <select
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg"
                >
                  <option value="">Choose a campaign...</option>
                  {campaigns
                    .filter(camp => camp.platform === selectedPlatform)
                    .map(camp => (
                      <option key={camp.id} value={camp.id}>{camp.name}</option>
                    ))
                  }
                </select>
              </div>

              <div className="bg-gray-700 rounded-lg p-4 mb-4">
                <p className="text-sm">
                  You are about to send <span className="font-bold text-blue-400">{selectedLeads.length}</span> leads
                  to <span className="font-bold">{selectedPlatform}</span>
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowCampaignModal(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendToCampaign}
                  disabled={!selectedCampaign}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 py-2 rounded-lg"
                >
                  Send Leads
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadsDatabaseEnhanced;