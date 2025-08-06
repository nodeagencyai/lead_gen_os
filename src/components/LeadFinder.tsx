import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import CampaignToggle from './CampaignToggle';
import { useCampaignStore } from '../store/campaignStore';
import { supabase } from '../lib/supabase';

interface LeadFinderProps {
  onNavigate: (view: 'dashboard' | 'leadfinder' | 'campaigns' | 'leads' | 'integrations' | 'monitoring') => void;
}

const LeadFinder: React.FC<LeadFinderProps> = ({ onNavigate }) => {
  const [targetUrl, setTargetUrl] = useState('');
  const [leadsLimit, setLeadsLimit] = useState(0);
  const [startPage, setStartPage] = useState(1);
  const [actionType, setActionType] = useState<'scrape' | 'process'>('scrape');
  const [actionStatus, setActionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  
  // New niche/tag states
  const [niche, setNiche] = useState('');
  const [tags, setTags] = useState('');
  
  const { mode } = useCampaignStore();

  // Get the correct webhook URL based on mode and action type
  const getWebhookUrl = () => {
    const webhooks = {
      apollo_scraping: import.meta.env.VITE_N8N_APOLLO_SCRAPER_WEBHOOK,
      linkedin_scraping: import.meta.env.VITE_N8N_LINKEDIN_SCRAPER_WEBHOOK,
      email_processing: import.meta.env.VITE_N8N_EMAIL_PROCESSING_WEBHOOK,
      linkedin_processing: import.meta.env.VITE_N8N_LINKEDIN_PROCESSING_WEBHOOK
    };

    if (actionType === 'scrape') {
      return mode === 'email' ? webhooks.apollo_scraping : webhooks.linkedin_scraping;
    } else {
      return mode === 'email' ? webhooks.email_processing : webhooks.linkedin_processing;
    }
  };

  const handleTriggerWebhook = async () => {
    if (actionType === 'scrape' && !targetUrl.trim()) {
      setStatusMessage(`Please enter a ${mode === 'email' ? 'Apollo' : 'Sales Navigator'} URL`);
      setActionStatus('error');
      return;
    }
    
    if (!leadsLimit || leadsLimit <= 0) {
      setStatusMessage(`Please specify number of leads to ${actionType === 'scrape' ? 'scrape' : 'process'} (must be greater than 0)`);
      setActionStatus('error');
      return;
    }
    
    setActionStatus('loading');
    const actionText = actionType === 'scrape' ? 'scraping' : 'processing';
    setStatusMessage(`Triggering N8N ${actionText} workflow...`);
    
    try {
      const webhookUrl = getWebhookUrl();
      
      // Fetch LinkedIn cookies if needed
      let cookies = undefined;
      if (mode === 'linkedin' && actionType === 'scrape') {
        try {
          const { data: user } = await supabase.auth.getUser();
          if (user.user) {
            const { data, error } = await supabase
              .from('integrations')
              .select('api_key_encrypted')
              .eq('user_id', user.user.id)
              .eq('platform', 'linkedin_cookies')
              .eq('is_active', true)
              .single();
            
            if (data && !error) {
              cookies = JSON.parse(data.api_key_encrypted);
            }
          }
        } catch (error) {
          console.error('Error fetching LinkedIn cookies:', error);
        }
      }
      
      const payload = actionType === 'scrape' 
        ? {
            url: targetUrl,
            limit: leadsLimit,
            startPage: mode === 'linkedin' ? startPage : undefined,
            cookies: mode === 'linkedin' ? cookies : undefined,
            niche: niche || 'uncategorized',
            tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
            timestamp: new Date().toISOString(),
            action: 'scrape',
            source: mode === 'email' ? 'apollo' : 'sales_navigator'
          }
        : {
            limit: leadsLimit,
            timestamp: new Date().toISOString(),
            action: 'process',
            campaign_type: mode
          };
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }
      
      const _result = await response.json();
      
      const successMessage = actionType === 'scrape' 
        ? `N8N ${mode === 'email' ? 'Apollo' : 'LinkedIn'} scraping workflow triggered successfully!`
        : `N8N ${mode === 'email' ? 'email' : 'LinkedIn'} processing workflow triggered successfully!`;
      
      setStatusMessage(successMessage);
      setActionStatus('success');
      
      // Clear form on success for scraping
      if (actionType === 'scrape') {
        setTargetUrl('');
        setNiche('');
        setTags('');
        setStartPage(1);
      }
      
    } catch (error) {
      console.error('Webhook trigger failed:', error);
      setStatusMessage(error instanceof Error ? error.message : 'Failed to trigger webhook');
      setActionStatus('error');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleTriggerWebhook();
    }
  };

  // Auto-clear status messages after 5 seconds
  useEffect(() => {
    if (actionStatus === 'success' || actionStatus === 'error') {
      const timer = setTimeout(() => {
        setActionStatus('idle');
        setStatusMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [actionStatus]);

  const isLoading = actionStatus === 'loading';

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
              onClick={() => onNavigate('monitoring')}
              className="transition-colors hover:opacity-80" 
              style={{ color: '#888888' }}
            >
              Monitoring
            </button>
            <button 
              onClick={() => onNavigate('integrations')}
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
              ? 'Scrape new leads from Apollo or process existing leads for email campaigns' 
              : 'Scrape new leads from Sales Navigator or process existing leads for LinkedIn campaigns'
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
          {/* Status Message */}
          {statusMessage && (
            <div className={`mb-6 p-4 rounded-lg flex items-center space-x-3`} style={{
              backgroundColor: actionStatus === 'error' ? '#1a0f0f' : actionStatus === 'success' ? '#0f1a0f' : '#1a1a1a',
              border: `1px solid ${actionStatus === 'error' ? '#ef4444' : actionStatus === 'success' ? '#10b981' : '#333333'}`,
              color: actionStatus === 'error' ? '#ef4444' : actionStatus === 'success' ? '#10b981' : '#ffffff'
            }}>
              {actionStatus === 'error' && <AlertCircle className="w-5 h-5" />}
              {actionStatus === 'success' && <CheckCircle className="w-5 h-5" />}
              {actionStatus === 'loading' && <Loader className="w-5 h-5 animate-spin" />}
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Campaign Mode Indicator */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: '#0f0f0f', border: '1px solid #333333', color: '#888888' }}>
              {actionType === 'scrape' 
                ? (mode === 'email' ? 'Apollo Lead Scraping' : 'LinkedIn Lead Scraping')
                : (mode === 'email' ? 'Email Campaign Processing' : 'LinkedIn Campaign Processing')
              }
            </div>
          </div>

          {actionType === 'scrape' ? (
            <>
              {/* Scraping URL Input Section */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-4" style={{ color: '#ffffff' }}>
                  {mode === 'email' ? 'Apollo Search URL' : 'Sales Navigator Search URL'}
                </label>
                <textarea
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={mode === 'email' 
                    ? "Paste the Apollo search URL to scrape leads from..."
                    : "Paste the Sales Navigator search URL to scrape leads from..."
                  }
                  className="w-full h-24 p-4 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-300"
                  style={{
                    backgroundColor: '#0f0f0f',
                    border: '1px solid #333333',
                    color: '#ffffff',
                    fontSize: '16px',
                    lineHeight: '1.6'
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

              {/* Niche/Industry Input */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-4" style={{ color: '#ffffff' }}>
                  Industry/Niche (Optional)
                </label>
                <input
                  type="text"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder={mode === 'email' 
                    ? "e.g., SaaS, Fintech, Healthcare, E-commerce..."
                    : "e.g., Technology, Finance, Marketing, Consulting..."
                  }
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
                  Categorize leads by industry for better organization and targeting
                </div>
              </div>

              {/* Tags Input */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-4" style={{ color: '#ffffff' }}>
                  Tags (Optional)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g., enterprise, series-a, remote-first, high-priority (comma-separated)"
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
                  Add custom tags separated by commas to organize and filter leads
                </div>
              </div>

              {/* Leads Limit for Scraping */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-4" style={{ color: '#ffffff' }}>
                  Number of leads to scrape
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={leadsLimit === 0 ? '' : leadsLimit}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty string for better UX when clearing the field
                    if (value === '') {
                      setLeadsLimit(0);
                    } else {
                      const num = parseInt(value, 10);
                      // Only update if it's a valid number
                      if (!isNaN(num) && num >= 0) {
                        setLeadsLimit(num);
                      }
                    }
                  }}
                  placeholder="Enter number of leads to scrape"
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
                {mode === 'email' && (
                  <div className="text-xs mt-2" style={{ color: '#888888' }}>
                    Apollo requires a minimum of 500 leads per scraping session
                  </div>
                )}
              </div>

              {/* Start Page for LinkedIn */}
              {mode === 'linkedin' && (
                <div className="mb-8">
                  <label className="block text-sm font-semibold mb-4" style={{ color: '#ffffff' }}>
                    Start Page
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={startPage === 0 ? '' : startPage}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow empty string for better UX when clearing the field
                      if (value === '') {
                        setStartPage(0);
                      } else {
                        const num = parseInt(value, 10);
                        // Only update if it's a valid number
                        if (!isNaN(num) && num >= 0) {
                          setStartPage(num);
                        }
                      }
                    }}
                    placeholder="Enter page number to start scraping from"
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
                    Specify which page to start scraping from in Sales Navigator search results
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Processing Section */}
              <div className="mb-8">
                <label className="block text-sm font-semibold mb-4" style={{ color: '#ffffff' }}>
                  Number of leads to process
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={leadsLimit === 0 ? '' : leadsLimit}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty string for better UX when clearing the field
                    if (value === '') {
                      setLeadsLimit(0);
                    } else {
                      const num = parseInt(value, 10);
                      // Only update if it's a valid number
                      if (!isNaN(num) && num >= 0) {
                        setLeadsLimit(num);
                      }
                    }
                  }}
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
                  This will process {leadsLimit} leads from your database using the {mode === 'email' ? 'email campaign' : 'LinkedIn outreach'} workflow
                </div>
              </div>
            </>
          )}

          {/* Action Button */}
          <div className="text-center">
            <button
              onClick={handleTriggerWebhook}
              disabled={(actionType === 'scrape' && !targetUrl.trim()) || leadsLimit <= 0 || isLoading}
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
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>
                    {actionType === 'scrape' 
                      ? `Triggering ${mode === 'email' ? 'Apollo' : 'LinkedIn'} Scraping...`
                      : `Triggering ${mode === 'email' ? 'Email' : 'LinkedIn'} Processing...`
                    }
                  </span>
                </>
              ) : (
                <>
                  <Search size={20} />
                  <span>
                    {actionType === 'scrape' 
                      ? `Start ${mode === 'email' ? 'Apollo' : 'LinkedIn'} Scraping`
                      : `Start ${mode === 'email' ? 'Email' : 'LinkedIn'} Processing`
                    }
                  </span>
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