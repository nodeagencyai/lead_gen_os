import React, { useState } from 'react';
import { Key, Check, AlertCircle } from 'lucide-react';
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

interface IntegrationSetupProps {
  onNavigate?: (view: 'dashboard' | 'leadfinder' | 'campaigns' | 'leads' | 'integrations' | 'settings') => void;
}

const IntegrationSetup: React.FC<IntegrationSetupProps> = ({ onNavigate }) => {
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
      } catch (error) {
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
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('integrations')
        .upsert({
          user_id: user.user.id,
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
                onClick={() => onNavigate('integrations')}
                className="transition-colors hover:opacity-80" 
                style={{ color: '#ffffff' }}
              >
                Integrations
              </button>
              <button 
                onClick={() => onNavigate('settings')}
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
      )}

      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4 text-white">Integration Setup</h1>
          <p style={{ color: '#ffffff' }}>Connect your N8N workflows and automation platforms</p>
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
      </div>
    </div>
  );
};

export default IntegrationSetup;