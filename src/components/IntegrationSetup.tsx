import React, { useState } from 'react';
import { Key, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Integration {
  platform: string;
  name: string;
  description: string;
  apiKey: string;
  isActive: boolean;
  status: 'connected' | 'disconnected' | 'error';
}

const IntegrationSetup: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      platform: 'instantly',
      name: 'Instantly',
      description: 'Email automation platform',
      apiKey: '',
      isActive: false,
      status: 'disconnected'
    },
    {
      platform: 'heyreach',
      name: 'HeyReach',
      description: 'LinkedIn automation platform',
      apiKey: '',
      isActive: false,
      status: 'disconnected'
    },
    {
      platform: 'apollo',
      name: 'Apollo',
      description: 'Lead generation and email platform',
      apiKey: '',
      isActive: false,
      status: 'disconnected'
    }
  ]);

  const [saving, setSaving] = useState<string | null>(null);

  const handleApiKeyChange = (platform: string, apiKey: string) => {
    setIntegrations(prev => prev.map(integration => 
      integration.platform === platform 
        ? { ...integration, apiKey }
        : integration
    ));
  };

  const testConnection = async (platform: string, apiKey: string) => {
    // Test API connection based on platform
    try {
      let testUrl = '';
      let headers: Record<string, string> = {};

      switch (platform) {
        case 'instantly':
          testUrl = 'https://api.instantly.ai/api/v1/account';
          headers = { 'Authorization': `Bearer ${apiKey}` };
          break;
        case 'heyreach':
          testUrl = 'https://api.heyreach.io/api/v1/account';
          headers = { 'Authorization': `Bearer ${apiKey}` };
          break;
        case 'apollo':
          testUrl = 'https://api.apollo.io/v1/auth/health';
          headers = { 'X-Api-Key': apiKey };
          break;
      }

      const response = await fetch(testUrl, { headers });
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  const saveIntegration = async (platform: string) => {
    const integration = integrations.find(i => i.platform === platform);
    if (!integration || !integration.apiKey) return;

    setSaving(platform);

    try {
      // Test connection first
      const isValid = await testConnection(platform, integration.apiKey);
      
      if (!isValid) {
        throw new Error('Invalid API key or connection failed');
      }

      // Save to Supabase
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('integrations')
        .upsert({
          user_id: user.user.id,
          platform,
          api_key_encrypted: integration.apiKey, // In production, encrypt this
          is_active: true,
          settings: {}
        });

      if (error) throw error;

      // Update local state
      setIntegrations(prev => prev.map(i => 
        i.platform === platform 
          ? { ...i, isActive: true, status: 'connected' as const }
          : i
      ));

    } catch (error) {
      console.error('Integration save error:', error);
      setIntegrations(prev => prev.map(i => 
        i.platform === platform 
          ? { ...i, status: 'error' as const }
          : i
      ));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4 text-white">Integration Setup</h1>
        <p className="text-gray-400">Connect your automation platforms to start seeing real data</p>
      </div>

      <div className="space-y-6">
        {integrations.map((integration) => (
          <div 
            key={integration.platform}
            className="rounded-lg p-6"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid #333333' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Key className="w-6 h-6 text-gray-400" />
                <div>
                  <h3 className="text-lg font-semibold text-white">{integration.name}</h3>
                  <p className="text-sm text-gray-400">{integration.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {integration.status === 'connected' && (
                  <div className="flex items-center space-x-1 text-green-500">
                    <Check className="w-4 h-4" />
                    <span className="text-sm">Connected</span>
                  </div>
                )}
                {integration.status === 'error' && (
                  <div className="flex items-center space-x-1 text-red-500">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">Error</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <input
                type="password"
                placeholder={`Enter ${integration.name} API key`}
                value={integration.apiKey}
                onChange={(e) => handleApiKeyChange(integration.platform, e.target.value)}
                className="flex-1 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: '#0f0f0f',
                  border: '1px solid #333333',
                  color: '#ffffff'
                }}
              />
              <button
                onClick={() => saveIntegration(integration.platform)}
                disabled={!integration.apiKey || saving === integration.platform}
                className="px-6 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
                style={{
                  backgroundColor: '#333333',
                  border: '1px solid #555555',
                  color: '#ffffff'
                }}
              >
                {saving === integration.platform ? 'Testing...' : 'Save & Test'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 rounded-lg" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333333' }}>
        <h3 className="text-lg font-semibold mb-2 text-white">How to get API keys:</h3>
        <ul className="space-y-2 text-sm text-gray-400">
          <li><strong>Instantly:</strong> Go to Settings → API → Generate new API key</li>
          <li><strong>HeyReach:</strong> Go to Account → API Access → Create API key</li>
          <li><strong>Apollo:</strong> Go to Settings → Integrations → API → Generate key</li>
        </ul>
      </div>
    </div>
  );
};

export default IntegrationSetup;