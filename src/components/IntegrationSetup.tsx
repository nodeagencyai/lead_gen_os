import React, { useState, useEffect } from 'react';
import { Key, Check, AlertCircle, Webhook, Save, Copy, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CampaignToggle from './CampaignToggle';

interface Integration {
  id: string;
  name: string;
  description: string;
  webhookUrl: string;
  isActive: boolean;
  status: 'connected' | 'disconnected' | 'error';
}

interface WebhookEvent {
  id: string;
  name: string;
  description: string;
  url: string;
  enabled: boolean;
  lastTriggered?: string;
  totalCalls?: number;
}

interface IntegrationSetupProps {
  onNavigate?: (view: 'dashboard' | 'leadfinder' | 'campaigns' | 'leads' | 'integrations' | 'monitoring') => void;
}

const IntegrationSetup: React.FC<IntegrationSetupProps> = ({ onNavigate }) => {
  const [linkedinCookies, setLinkedinCookies] = useState('');
  const [cookiesSaving, setCookiesSaving] = useState(false);
  const [cookiesStatus, setCookiesStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [cookiesMessage, setCookiesMessage] = useState('');
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'instantly',
      name: 'Instantly',
      description: 'Email automation platform',
      webhookUrl: '',
      isActive: false,
      status: 'disconnected'
    },
    {
      id: 'heyreach',
      name: 'HeyReach',
      description: 'LinkedIn automation platform',
      webhookUrl: '',
      isActive: false,
      status: 'disconnected'
    },
    {
      id: 'apollo_scraping',
      name: 'Apollo Lead Scraping',
      description: 'N8N workflow for Apollo lead extraction',
      webhookUrl: '',
      isActive: false,
      status: 'disconnected'
    },
    {
      id: 'linkedin_scraping',
      name: 'LinkedIn Lead Scraping',
      description: 'N8N workflow for Sales Navigator lead extraction',
      webhookUrl: '',
      isActive: false,
      status: 'disconnected'
    },
    {
      id: 'email_campaign',
      name: 'Email Campaign Automation',
      description: 'N8N workflow for automated email campaigns',
      webhookUrl: '',
      isActive: false,
      status: 'disconnected'
    },
    {
      id: 'linkedin_outreach',
      name: 'LinkedIn Outreach Automation',
      description: 'N8N workflow for LinkedIn connection and messaging',
      webhookUrl: '',
      isActive: false,
      status: 'disconnected'
    }
  ]);

  const [saving, setSaving] = useState<string | null>(null);
  
  // Webhook Events Management
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([
    {
      id: 'lead_scraped',
      name: 'Lead Scraped',
      description: 'Triggered when a new lead is scraped from Apollo or LinkedIn',
      url: '',
      enabled: false,
      totalCalls: 0
    },
    {
      id: 'campaign_started',
      name: 'Campaign Started',
      description: 'Triggered when a new email or LinkedIn campaign is started',
      url: '',
      enabled: false,
      totalCalls: 0
    },
    {
      id: 'lead_responded',
      name: 'Lead Responded',
      description: 'Triggered when a lead responds to an email or LinkedIn message',
      url: '',
      enabled: false,
      totalCalls: 0
    },
    {
      id: 'campaign_completed',
      name: 'Campaign Completed',
      description: 'Triggered when a campaign finishes or reaches its end date',
      url: '',
      enabled: false,
      totalCalls: 0
    },
    {
      id: 'cost_threshold_reached',
      name: 'Cost Threshold Reached',
      description: 'Triggered when daily/monthly cost limits are exceeded',
      url: '',
      enabled: false,
      totalCalls: 0
    },
    {
      id: 'lead_status_changed',
      name: 'Lead Status Changed',
      description: 'Triggered when a lead status changes (e.g., qualified, unqualified)',
      url: '',
      enabled: false,
      totalCalls: 0
    }
  ]);
  
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);
  const [webhookTestResults, setWebhookTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  // Load LinkedIn cookies on mount
  useEffect(() => {
    const loadLinkedinCookies = async () => {
      try {
        const { data, error } = await supabase
          .from('integrations')
          .select('api_key_encrypted, settings')
          .eq('platform', 'sales_navigator')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1);
          
        // Filter for cookies type
        const cookiesRecord = data?.find(record => record.settings?.type === 'cookies');

        if (cookiesRecord && !error) {
          setLinkedinCookies(cookiesRecord.api_key_encrypted);
        }
      } catch (error) {
        console.error('Error loading LinkedIn cookies:', error);
      }
    };

    loadLinkedinCookies();
  }, []);

  // Webhook management functions
  const updateWebhookEvent = (id: string, updates: Partial<WebhookEvent>) => {
    setWebhookEvents(prev => prev.map(event => 
      event.id === id ? { ...event, ...updates } : event
    ));
  };

  const testWebhookEvent = async (eventId: string) => {
    const event = webhookEvents.find(e => e.id === eventId);
    if (!event || !event.url) return;

    setTestingWebhook(eventId);
    
    try {
      const testPayload = {
        event_type: eventId,
        event_name: event.name,
        timestamp: new Date().toISOString(),
        test: true,
        data: getSamplePayload(eventId)
      };

      const response = await fetch(event.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': eventId,
          'User-Agent': 'LeadGenOS-Webhook/1.0'
        },
        body: JSON.stringify(testPayload)
      });

      const success = response.status >= 200 && response.status < 300;
      setWebhookTestResults(prev => ({
        ...prev,
        [eventId]: {
          success,
          message: success 
            ? `Success! Received ${response.status} ${response.statusText}` 
            : `Failed: ${response.status} ${response.statusText}`
        }
      }));

    } catch (error) {
      setWebhookTestResults(prev => ({
        ...prev,
        [eventId]: {
          success: false,
          message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      }));
    } finally {
      setTestingWebhook(null);
    }
  };

  const getSamplePayload = (eventId: string) => {
    const sampleData: Record<string, any> = {
      lead_scraped: {
        lead_id: 'lead_123',
        name: 'John Doe',
        email: 'john@example.com',
        company: 'Example Corp',
        source: 'apollo'
      },
      campaign_started: {
        campaign_id: 'camp_456',
        campaign_name: 'Q1 Outreach',
        type: 'email',
        leads_count: 150
      },
      lead_responded: {
        lead_id: 'lead_123',
        campaign_id: 'camp_456',
        response_type: 'positive',
        message: 'Thanks for reaching out!'
      },
      campaign_completed: {
        campaign_id: 'camp_456',
        final_stats: { sent: 150, opened: 45, replied: 12 }
      },
      cost_threshold_reached: {
        current_cost: 250.50,
        threshold: 200.00,
        period: 'monthly'
      },
      lead_status_changed: {
        lead_id: 'lead_123',
        old_status: 'pending',
        new_status: 'qualified'
      }
    };
    
    return sampleData[eventId] || {};
  };

  const copyWebhookUrl = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  const handleWebhookUrlChange = (id: string, webhookUrl: string) => {
    setIntegrations(prev => prev.map(integration => 
      integration.id === id 
        ? { ...integration, webhookUrl }
        : integration
    ));
  };

  const testConnection = async (id: string, webhookUrl: string) => {
    // Test webhook connection
    try {
      // Test webhook with a ping request
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'test',
          message: 'Connection test from dashboard'
        })
      });
      
      // Consider 200-299 status codes as successful
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      console.error('Webhook test failed:', error);
      return false;
    }
  };

  const testApiConnection = async (id: string, webhookUrl: string) => {
    // Test API connections for Instantly and HeyReach
    if (id === 'instantly' || id === 'heyreach') {
      try {
        // For API integrations, we expect the webhook URL to be an API key
        let testUrl = '';
        let headers: Record<string, string> = {};

        if (id === 'instantly') {
          testUrl = 'https://api.instantly.ai/api/v1/account';
          headers = { 'Authorization': `Bearer ${webhookUrl}` };
        } else if (id === 'heyreach') {
          testUrl = 'https://api.heyreach.io/api/v1/account';
          headers = { 'Authorization': `Bearer ${webhookUrl}` };
        }

        const response = await fetch(testUrl, { headers });
        return response.ok;
      } catch (_error) {
        return false;
      }
    }
    
    // For N8N webhooks, test the webhook endpoint
    return testConnection(id, webhookUrl);
  };

  const saveIntegration = async (id: string) => {
    const integration = integrations.find(i => i.id === id);
    if (!integration || !integration.webhookUrl) return;

    setSaving(id);

    try {
      // Test connection first
      const isValid = await testApiConnection(id, integration.webhookUrl);
      
      if (!isValid) {
        throw new Error('Invalid webhook URL or connection failed');
      }

      // Save to Supabase
      const { error } = await supabase
        .from('integrations')
        .upsert({
          platform: id,
          api_key_encrypted: integration.webhookUrl, // Store webhook URL or API key
          is_active: true,
          settings: {}
        });

      if (error) throw error;

      // Update local state
      setIntegrations(prev => prev.map(i => 
        i.id === id 
          ? { ...i, isActive: true, status: 'connected' as const }
          : i
      ));

    } catch (error) {
      console.error('Integration save error:', error);
      setIntegrations(prev => prev.map(i => 
        i.id === id 
          ? { ...i, status: 'error' as const }
          : i
      ));
    } finally {
      setSaving(null);
    }
  };

  const saveLinkedinCookies = async () => {
    setCookiesSaving(true);
    setCookiesStatus('idle');

    try {
      // Validate JSON format
      try {
        JSON.parse(linkedinCookies);
      } catch (e) {
        throw new Error('Invalid JSON format. Please check your cookies.');
      }

      // Save to Supabase
      const { error } = await supabase
        .from('integrations')
        .upsert({
          platform: 'sales_navigator',
          api_key_encrypted: linkedinCookies, // Store cookies as JSON string
          is_active: true,
          settings: {
            last_updated: new Date().toISOString(),
            type: 'cookies' // Mark this as cookies, not API key
          }
        });

      if (error) throw error;

      setCookiesStatus('success');
      setCookiesMessage('LinkedIn cookies saved successfully');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setCookiesStatus('idle');
        setCookiesMessage('');
      }, 3000);

    } catch (error) {
      console.error('LinkedIn cookies save error:', error);
      setCookiesStatus('error');
      setCookiesMessage(error instanceof Error ? error.message : 'Failed to save cookies');
    } finally {
      setCookiesSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      {onNavigate && (
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
                style={{ color: '#ffffff' }}
              >
                Settings
              </button>
            </div>
            <div className="flex items-center">
              <CampaignToggle />
            </div>
          </div>
        </nav>
      )}

      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4" style={{ color: '#ffffff' }}>Settings</h1>
          <p style={{ color: '#cccccc' }}>Connect your N8N workflows and automation platforms</p>
        </div>

        {/* Webhook Management Section */}
        <div className="mb-12">
          <div className="flex items-center space-x-3 mb-6">
            <Webhook className="w-6 h-6" style={{ color: '#888888' }} />
            <h2 className="text-2xl font-bold" style={{ color: '#ffffff' }}>Webhook Management</h2>
          </div>
          <p className="mb-6" style={{ color: '#cccccc' }}>
            Configure webhook URLs for different events in your lead generation workflow. 
            These webhooks will be triggered automatically when specific events occur.
          </p>

          <div className="grid gap-4">
            {webhookEvents.map((event) => (
              <div 
                key={event.id}
                className="rounded-lg p-4 transition-all duration-200"
                style={{ backgroundColor: '#1a1a1a', border: '1px solid #333333' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold" style={{ color: '#ffffff' }}>{event.name}</h3>
                      <div className="flex items-center space-x-2">
                        {event.enabled && (
                          <span className="px-2 py-1 text-xs rounded-full" style={{ 
                            backgroundColor: '#333333', 
                            color: '#ffffff',
                            border: '1px solid #555555'
                          }}>
                            Enabled
                          </span>
                        )}
                        {event.totalCalls !== undefined && event.totalCalls > 0 && (
                          <span className="text-xs" style={{ color: '#888888' }}>
                            {event.totalCalls} calls
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm mb-3" style={{ color: '#cccccc' }}>
                      {event.description}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={event.enabled}
                        onChange={(e) => updateWebhookEvent(event.id, { enabled: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm" style={{ color: '#cccccc' }}>Enable</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="url"
                      placeholder="https://your-endpoint.com/webhook"
                      value={event.url}
                      onChange={(e) => updateWebhookEvent(event.id, { url: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg focus:outline-none transition-all duration-300"
                      style={{
                        backgroundColor: '#0f0f0f',
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
                  
                  <button
                    onClick={() => testWebhookEvent(event.id)}
                    disabled={!event.url || testingWebhook === event.id}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 hover:opacity-80"
                    style={{
                      backgroundColor: '#333333',
                      border: '1px solid #555555',
                      color: '#ffffff'
                    }}
                  >
                    {testingWebhook === event.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span>Testing...</span>
                      </>
                    ) : (
                      <span>Test</span>
                    )}
                  </button>
                  
                  {event.url && (
                    <button
                      onClick={() => copyWebhookUrl(event.url)}
                      className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:opacity-80"
                      style={{
                        backgroundColor: '#333333',
                        border: '1px solid #555555',
                        color: '#ffffff'
                      }}
                      title="Copy webhook URL"
                    >
                      <Copy size={16} />
                    </button>
                  )}
                </div>

                {/* Test Results */}
                {webhookTestResults[event.id] && (
                  <div className={`mt-3 p-3 rounded-lg flex items-center space-x-2`} style={{
                    backgroundColor: webhookTestResults[event.id].success ? '#1a1a1a' : '#1a1a1a',
                    border: `1px solid ${webhookTestResults[event.id].success ? '#333333' : '#ef4444'}`
                  }}>
                    {webhookTestResults[event.id].success ? (
                      <Check className="w-4 h-4" style={{ color: '#ffffff' }} />
                    ) : (
                      <AlertCircle className="w-4 h-4" style={{ color: '#ef4444' }} />
                    )}
                    <span className="text-sm" style={{ 
                      color: webhookTestResults[event.id].success ? '#ffffff' : '#ef4444' 
                    }}>
                      {webhookTestResults[event.id].message}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Webhook Documentation */}
          <div className="mt-8 p-4 rounded-lg" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333333' }}>
            <h4 className="font-semibold mb-3 flex items-center space-x-2" style={{ color: '#ffffff' }}>
              <ExternalLink className="w-4 h-4" style={{ color: '#888888' }} />
              <span>Webhook Payload Format</span>
            </h4>
            <div className="text-sm space-y-2" style={{ color: '#cccccc' }}>
              <p>All webhooks will receive a POST request with the following JSON structure:</p>
              <pre className="p-3 rounded text-xs overflow-x-auto" style={{ backgroundColor: '#0f0f0f', border: '1px solid #333333', color: '#ffffff' }}>
{`{
  "event_type": "lead_scraped",
  "event_name": "Lead Scraped", 
  "timestamp": "2025-08-04T10:30:00Z",
  "test": false,
  "data": {
    // Event-specific payload data
  }
}`}
              </pre>
              <p className="mt-2">
                <strong style={{ color: '#ffffff' }}>Headers included:</strong> <code style={{ backgroundColor: '#333333', color: '#ffffff', padding: '2px 4px', borderRadius: '3px' }}>Content-Type: application/json</code>, <code style={{ backgroundColor: '#333333', color: '#ffffff', padding: '2px 4px', borderRadius: '3px' }}>X-Webhook-Event: {`{event_type}`}</code>, <code style={{ backgroundColor: '#333333', color: '#ffffff', padding: '2px 4px', borderRadius: '3px' }}>User-Agent: LeadGenOS-Webhook/1.0</code>
              </p>
            </div>
          </div>
        </div>

        {/* API Integrations Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <Key className="w-6 h-6" style={{ color: '#888888' }} />
            <h2 className="text-2xl font-bold" style={{ color: '#ffffff' }}>API Integrations</h2>
          </div>
          <p style={{ color: '#cccccc' }}>Connect your automation platforms and N8N workflows</p>
        </div>

        <div className="space-y-6">
          {integrations.map((integration) => (
            <div 
              key={integration.id}
              className="rounded-lg p-6 transition-all duration-200"
              style={{ backgroundColor: '#1a1a1a', border: '1px solid #333333' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#555555';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#333333';
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Key className="w-6 h-6" style={{ color: '#888888' }} />
                  <div>
                    <h3 className="text-lg font-semibold text-white">{integration.name}</h3>
                    <p className="text-sm" style={{ color: '#888888' }}>{integration.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {integration.status === 'connected' && (
                    <div className="flex items-center space-x-1" style={{ color: '#10b981' }}>
                      <Check className="w-4 h-4" />
                      <span className="text-sm">Connected</span>
                    </div>
                  )}
                  {integration.status === 'error' && (
                    <div className="flex items-center space-x-1" style={{ color: '#ef4444' }}>
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">Error</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  placeholder={integration.id.includes('_') ? `Enter N8N webhook URL` : `Enter ${integration.name} API key`}
                  value={integration.webhookUrl}
                  onChange={(e) => handleWebhookUrlChange(integration.id, e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg focus:outline-none transition-all duration-300"
                  style={{
                    backgroundColor: '#0f0f0f',
                    border: '1px solid #333333',
                    color: '#ffffff'
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
                <button
                  onClick={() => saveIntegration(integration.id)}
                  disabled={!integration.webhookUrl || saving === integration.id}
                  className="px-6 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 hover:opacity-80"
                  style={{
                    backgroundColor: '#333333',
                    border: '1px solid #555555',
                    color: '#ffffff'
                  }}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = '#444444';
                      e.currentTarget.style.borderColor = '#666666';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = '#333333';
                      e.currentTarget.style.borderColor = '#555555';
                    }
                  }}
                >
                  {saving === integration.id ? 'Testing...' : 'Save & Test'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 rounded-lg" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333333' }}>
          <h3 className="text-lg font-semibold mb-2 text-white">Setup Instructions:</h3>
          <ul className="space-y-2 text-sm" style={{ color: '#888888' }}>
            <li><strong style={{ color: '#ffffff' }}>Instantly:</strong> Go to Settings → API → Generate new API key</li>
            <li><strong style={{ color: '#ffffff' }}>HeyReach:</strong> Go to Account → API Access → Create API key</li>
            <li><strong style={{ color: '#ffffff' }}>N8N Workflows:</strong> Copy the webhook URL from each workflow's webhook trigger node</li>
            <li><strong style={{ color: '#ffffff' }}>Webhook Format:</strong> https://your-n8n-instance.com/webhook/workflow-name</li>
          </ul>
        </div>

        {/* LinkedIn Cookies Section */}
        <div className="mt-12">
          <div className="flex items-center space-x-3 mb-6">
            <Key className="w-6 h-6" style={{ color: '#888888' }} />
            <h2 className="text-2xl font-bold" style={{ color: '#ffffff' }}>LinkedIn Cookies</h2>
          </div>
          <p className="mb-6" style={{ color: '#cccccc' }}>
            Configure LinkedIn cookies for Sales Navigator scraping. These cookies are required for authenticated access to LinkedIn data.
          </p>

          <div 
            className="rounded-lg p-6 transition-all duration-200"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid #333333' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#555555';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#333333';
            }}
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white mb-2">LinkedIn Session Cookies</h3>
              <p className="text-sm mb-4" style={{ color: '#888888' }}>
                Paste your LinkedIn cookies JSON here. These typically expire after a few weeks and need to be updated regularly.
              </p>
            </div>

            <div className="space-y-4">
              <textarea
                value={linkedinCookies}
                onChange={(e) => setLinkedinCookies(e.target.value)}
                placeholder={`Paste your LinkedIn cookies JSON here, e.g.:
{
  "li_at": "your_li_at_cookie_value",
  "JSESSIONID": "your_jsessionid_value",
  ...
}`}
                className="w-full h-32 p-4 rounded-lg resize-none font-mono text-sm focus:outline-none transition-all duration-300"
                style={{
                  backgroundColor: '#0f0f0f',
                  border: '1px solid #333333',
                  color: '#ffffff'
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

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={saveLinkedinCookies}
                    disabled={!linkedinCookies.trim() || cookiesSaving}
                    className="px-6 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 hover:opacity-80"
                    style={{
                      backgroundColor: '#333333',
                      border: '1px solid #555555',
                      color: '#ffffff'
                    }}
                    onMouseEnter={(e) => {
                      if (!e.currentTarget.disabled) {
                        e.currentTarget.style.backgroundColor = '#444444';
                        e.currentTarget.style.borderColor = '#666666';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!e.currentTarget.disabled) {
                        e.currentTarget.style.backgroundColor = '#333333';
                        e.currentTarget.style.borderColor = '#555555';
                      }
                    }}
                  >
                    {cookiesSaving ? 'Saving...' : 'Save Cookies'}
                  </button>

                  <button
                    onClick={() => {
                      setLinkedinCookies('');
                      setCookiesStatus('idle');
                      setCookiesMessage('');
                    }}
                    className="px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:opacity-80"
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid #333333',
                      color: '#888888'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#555555';
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#333333';
                      e.currentTarget.style.color = '#888888';
                    }}
                  >
                    Clear
                  </button>
                </div>

                {/* Status Message */}
                {cookiesStatus !== 'idle' && (
                  <div className={`flex items-center space-x-2`}>
                    {cookiesStatus === 'success' ? (
                      <Check className="w-4 h-4" style={{ color: '#10b981' }} />
                    ) : (
                      <AlertCircle className="w-4 h-4" style={{ color: '#ef4444' }} />
                    )}
                    <span className="text-sm" style={{ 
                      color: cookiesStatus === 'success' ? '#10b981' : '#ef4444'
                    }}>
                      {cookiesMessage}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: '#0f0f0f', border: '1px solid #333333' }}>
              <h4 className="text-sm font-semibold mb-2" style={{ color: '#ffffff' }}>How to get LinkedIn cookies:</h4>
              <ol className="space-y-2 text-sm" style={{ color: '#888888' }}>
                <li>1. Open LinkedIn in your browser and log in</li>
                <li>2. Open Developer Tools (F12 or right-click → Inspect)</li>
                <li>3. Go to the Application/Storage tab</li>
                <li>4. Find Cookies → linkedin.com</li>
                <li>5. Copy the required cookie values (li_at, JSESSIONID, etc.)</li>
                <li>6. Format them as JSON and paste above</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationSetup;