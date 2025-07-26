import React, { useState } from 'react';
import { Search, ArrowLeft } from 'lucide-react';
import CampaignToggle from './CampaignToggle';
import { useCampaignStore } from '../store/campaignStore';

interface LeadFinderProps {
  onNavigate: (view: 'dashboard' | 'leadfinder' | 'campaigns' | 'leads') => void;
}

const LeadFinder: React.FC<LeadFinderProps> = ({ onNavigate }) => {
  const [targetAudience, setTargetAudience] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [leadsLimit, setLeadsLimit] = useState(100);
  const [actionType, setActionType] = useState<'scrape' | 'process'>('scrape');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [processLimit, setProcessLimit] = useState(50);
  const [availableLeads, setAvailableLeads] = useState([
    { id: '1', name: 'John Smith', company: 'TechCorp Solutions', status: 'new' },
    { id: '2', name: 'Sarah Johnson', company: 'Innovate Digital', status: 'new' },
    { id: '3', name: 'Michael Chen', company: 'Growth Agency Pro', status: 'new' },
    { id: '4', name: 'Emily Rodriguez', company: 'MarketPlus Inc', status: 'new' },
    { id: '5', name: 'David Wilson', company: 'Scale Startup', status: 'new' }
  ]);
  const { mode } = useCampaignStore();

  const handleStartAction = () => {
    if (actionType === 'scrape' && !targetAudience.trim()) return;
    if (actionType === 'process' && selectedLeads.length === 0) return;
    
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      if (actionType === 'scrape') {
        console.log('Scraping started for:', targetAudience);
      } else {
        console.log('Processing leads:', selectedLeads);
      }
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleStartAction();
    }
  };

  const handleLeadSelection = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeads([...selectedLeads, leadId]);
    } else {
      setSelectedLeads(selectedLeads.filter(id => id !== leadId));
    }
  };

  const handleSelectAllLeads = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(availableLeads.map(lead => lead.id));
    } else {
      setSelectedLeads([]);
    }
  };

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
             style={{ color: '#ffffff' }}
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
             style={{ color: '#888888' }}
            >
              Campaigns
            </button>
            <button 
              className="transition-colors hover:opacity-80" 
             style={{ color: '#888888' }}
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
      <div className="max-w-3xl mx-auto px-8 py-12">
        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-white">
            {mode === 'email' ? 'Email Campaign Manager' : 'LinkedIn Campaign Manager'}
          </h1>
          <p className="text-base" style={{ color: '#ffffff' }}>
            {mode === 'email' 
              ? 'Generate new leads or process existing ones for email campaigns' 
              : 'Generate new leads or process existing ones for LinkedIn campaigns'
            }
          </p>
        </div>

        {/* Action Type Toggle */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-1 rounded-lg p-1" style={{ backgroundColor: '#0f0f0f', border: '1px solid #333333' }}>
            <button
              onClick={() => setActionType('scrape')}
              className={`flex items-center space-x-2 px-6 py-3 text-sm font-semibold rounded-md transition-all duration-300 ${
                actionType === 'scrape' 
                  ? 'text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
              style={{
                backgroundColor: actionType === 'scrape' ? '#333333' : 'transparent',
                border: actionType === 'scrape' ? '1px solid #555555' : '1px solid transparent'
              }}
            >
              <span>Scrape New Leads</span>
            </button>
            <button
              onClick={() => setActionType('process')}
              className={`flex items-center space-x-2 px-6 py-3 text-sm font-semibold rounded-md transition-all duration-300 ${
                actionType === 'process' 
                  ? 'text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
              style={{
                backgroundColor: actionType === 'process' ? '#333333' : 'transparent',
                border: actionType === 'process' ? '1px solid #555555' : '1px solid transparent'
              }}
            >
              <span>Process Existing Leads</span>
            </button>
          </div>
        </div>

        {/* Main Form Container */}
        <div 
          className="rounded-xl p-6 shadow-2xl"
          style={{ 
            backgroundColor: '#1a1a1a', 
            border: '1px solid #333333',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Campaign Mode Indicator */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: '#0f0f0f', border: '1px solid #333333', color: '#888888' }}>
              {actionType === 'scrape' ? (mode === 'email' ? 'Apollo Email Campaign' : 'LinkedIn Sales Navigator Campaign') : (mode === 'email' ? 'Email Campaign Processing' : 'LinkedIn Campaign Processing')}
            </div>
          </div>

          {actionType === 'scrape' ? (
            <>
              {/* Scraping Input Section */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-4" style={{ color: '#ffffff' }}>
                  {mode === 'email' ? 'Apollo Search URL' : 'Sales Navigator Search URL'}
                </label>
                <textarea
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={mode === 'email' 
                    ? "Paste the Apollo search URL to extract email leads from..."
                    : "Paste the Sales Navigator search URL to extract LinkedIn profiles from..."
                  }
                  className="w-full h-24 p-4 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-300"
                  style={{
                    backgroundColor: '#0f0f0f',
                    border: '1px solid #333333',
                    color: '#ffffff',
                    fontSize: '16px',
                    lineHeight: '1.6',
                    focusRingColor: '#555555'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#555555';
                    e.target.style.backgroundColor = '#1a1a1a';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#333333';
                    e.target.style.backgroundColor = '#0f0f0f';
                  }}
                />
              </div>

              {/* Leads Limit Filter */}
              <div className="mb-8">
                <label className="block text-sm font-semibold mb-4" style={{ color: '#ffffff' }}>
                  {mode === 'email' ? 'Number of email leads to extract' : 'Number of LinkedIn profiles to extract'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={leadsLimit}
                  onChange={(e) => setLeadsLimit(Number(e.target.value))}
                  placeholder="Enter number of leads"
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-300"
                  style={{
                    backgroundColor: '#0f0f0f',
                    border: '1px solid #333333',
                    color: '#ffffff',
                    fontSize: '16px'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#555555';
                    e.target.style.backgroundColor = '#1a1a1a';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#333333';
                    e.target.style.backgroundColor = '#0f0f0f';
                  }}
                />
              </div>
            </>
          ) : (
            <>
              {/* Lead Processing Section */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-semibold" style={{ color: '#ffffff' }}>
                    Select leads to process ({selectedLeads.length} selected)
                  </label>
                  <button
                    onClick={() => handleSelectAllLeads(selectedLeads.length !== availableLeads.length)}
                    className="text-sm px-3 py-1 rounded transition-colors hover:opacity-80"
                    style={{ backgroundColor: '#333333', border: '1px solid #555555', color: '#ffffff' }}
                  >
                    {selectedLeads.length === availableLeads.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {availableLeads.map((lead) => (
                    <div 
                      key={lead.id}
                      className="flex items-center space-x-3 p-3 rounded-lg transition-colors hover:bg-opacity-80"
                      style={{ backgroundColor: '#0f0f0f', border: '1px solid #333333' }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={(e) => handleLeadSelection(lead.id, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">{lead.name}</div>
                        <div className="text-xs" style={{ color: '#888888' }}>{lead.company}</div>
                      </div>
                      <div 
                        className="text-xs px-2 py-1 rounded-full"
                        style={{ 
                          backgroundColor: '#3b82f6' + '20',
                          color: '#3b82f6' 
                        }}
                      >
                        {lead.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Process Limit */}
              <div className="mb-8">
                <label className="block text-sm font-semibold mb-4" style={{ color: '#ffffff' }}>
                  Number of leads to process (max {selectedLeads.length} selected)
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedLeads.length || 1}
                  value={processLimit}
                  onChange={(e) => setProcessLimit(Math.min(Number(e.target.value), selectedLeads.length))}
                  placeholder="Enter number of leads to process"
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-300"
                  style={{
                    backgroundColor: '#0f0f0f',
                    border: '1px solid #333333',
                    color: '#ffffff',
                    fontSize: '16px'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#555555';
                    e.target.style.backgroundColor = '#1a1a1a';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#333333';
                    e.target.style.backgroundColor = '#0f0f0f';
                  }}
                />
                <div className="text-xs mt-2" style={{ color: '#888888' }}>
                  This will process the first {Math.min(processLimit, selectedLeads.length)} leads from your selection
                </div>
              </div>
            </>
          )}

          {/* Action Button */}
          <div className="text-center">
            <button
              onClick={handleStartAction}
              disabled={(actionType === 'scrape' && !targetAudience.trim()) || (actionType === 'process' && selectedLeads.length === 0) || isLoading}
              className="px-10 py-3 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-3 mx-auto shadow-lg hover:shadow-xl"
              style={{
                backgroundColor: '#333333',
                color: '#ffffff',
                border: '1px solid #555555'
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = '#444444';
                  e.currentTarget.style.borderColor = '#666666';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = '#333333';
                  e.currentTarget.style.borderColor = '#555555';
                  e.currentTarget.style.transform = 'translateY(0px)';
                }
              }}
            >
              {isLoading ? (
                <>
                  <div 
                    className="animate-spin rounded-full border-2 border-t-transparent w-5 h-5"
                    style={{
                      borderColor: '#ffffff',
                      borderTopColor: 'transparent'
                    }}
                  />
                  <span>{mode === 'email' ? 'Extracting Emails...' : 'Extracting Profiles...'}</span>
                </>
              ) : actionType === 'scrape' ? (
                <>
                  <Search size={20} />
                  <span>{mode === 'email' ? 'Extract Email Leads' : 'Extract LinkedIn Leads'}</span>
                </>
              ) : (
                <>
                  <Search size={20} />
                  <span>Process {Math.min(processLimit, selectedLeads.length)} Leads</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadFinder;