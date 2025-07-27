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
  const { mode } = useCampaignStore();

  const handleStartAction = () => {
    if (!targetAudience.trim()) return;
    
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      console.log('Scraping started for:', targetAudience);
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleStartAction();
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
            {mode === 'email' ? 'Email Lead Generator' : 'LinkedIn Lead Generator'}
          </h1>
          <p className="text-base" style={{ color: '#ffffff' }}>
            {mode === 'email' 
              ? 'Generate new leads for email campaigns' 
              : 'Generate new leads for LinkedIn campaigns'
            }
          </p>
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
              {mode === 'email' ? 'Apollo Email Campaign' : 'LinkedIn Sales Navigator Campaign'}
            </div>
          </div>

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

          {/* Action Button */}
          <div className="text-center">
            <button
              onClick={handleStartAction}
              disabled={!targetAudience.trim() || isLoading}
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
              ) : (
                <>
                  <Search size={20} />
                  <span>{mode === 'email' ? 'Extract Email Leads' : 'Extract LinkedIn Leads'}</span>
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