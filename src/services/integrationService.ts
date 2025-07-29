import { supabase } from '../lib/supabase';
import { INTEGRATION_CONFIG } from '../config/integrations';

export class IntegrationService {
  // Get encrypted API keys from Supabase
  static async getApiKey(platform: string): Promise<string | null> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('integrations')
      .select('api_key_encrypted, settings')
      .eq('user_id', user.user.id)
      .eq('platform', platform)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;
    
    // In production, decrypt the API key here
    return data.api_key_encrypted;
  }

  // Instantly API Integration
  static async getInstantlyData() {
    // Always try proxy server first in development, then fallback to direct API
    const isDevelopment = import.meta.env.DEV;
    console.log('🔍 Environment check - isDevelopment:', isDevelopment);
    console.log('🔍 Environment check - NODE_ENV:', import.meta.env.NODE_ENV);
    console.log('🔍 Environment check - MODE:', import.meta.env.MODE);
    
    // Try proxy server first in development
    if (isDevelopment) {
      try {
        console.log('🔄 Attempting proxy server connection...');
        const proxyResponse = await fetch('http://localhost:3001/api/instantly/campaigns');
        
        if (proxyResponse.ok) {
          console.log('✅ Using proxy server for API calls');
          return await this.fetchViaProxy();
        } else {
          console.warn('⚠️ Proxy server not responding, falling back to direct API');
        }
      } catch (proxyError) {
        console.warn('⚠️ Proxy server unavailable, falling back to direct API:', proxyError.message);
      }
    }
    
    // Fallback to direct API calls
    console.log('🔄 Using direct API calls...');
    return await this.fetchDirectAPI();
  }

  private static async fetchViaProxy() {
    try {
      // Get campaigns via proxy
      const campaignResponse = await fetch('http://localhost:3001/api/instantly/campaigns');
      
      if (!campaignResponse.ok) {
        throw new Error(`Proxy campaigns API failed: ${campaignResponse.status}`);
      }
      
      const campaigns = await campaignResponse.json();
      
      // Get analytics via proxy
      const analyticsResponse = await fetch('http://localhost:3001/api/instantly/campaigns/analytics');
      const analytics = analyticsResponse.ok ? await analyticsResponse.json() : [];

      return {
        campaigns: campaigns.items || [],
        analytics: {
          emails_sent: 0,
          emails_opened: 0,
          emails_replied: 0,
          meetings_booked: 0,
          bounce_rate: 0
        }
      };
    } catch (error) {
      console.error('❌ Proxy API Error:', error);
      throw error;
    }
  }

  private static async fetchDirectAPI() {
    const apiKey = import.meta.env.VITE_INSTANTLY_API_KEY;
    if (!apiKey) {
      console.error('❌ Instantly API key not found in environment variables');
      console.error('Available env vars:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')));
      throw new Error('Instantly API key not configured - check environment variables in production deployment');
    }

    console.log('🔑 Using Instantly API key for direct API calls');
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    try {
      // Get campaigns via direct API
      const campaignResponse = await fetch('https://api.instantly.ai/api/v2/campaigns', { headers });
      
      if (!campaignResponse.ok) {
        throw new Error(`Direct campaigns API failed: ${campaignResponse.status}`);
      }
      
      const campaigns = await campaignResponse.json();
      
      // Get analytics via direct API
      const analyticsResponse = await fetch('https://api.instantly.ai/api/v2/campaigns/analytics', { headers });
      const analytics = analyticsResponse.ok ? await analyticsResponse.json() : [];

      return {
        campaigns: campaigns.items || [],
        analytics: {
          emails_sent: 0,
          emails_opened: 0,
          emails_replied: 0,
          meetings_booked: 0,
          bounce_rate: 0
        }
      };
    } catch (error) {
      console.error('❌ Direct API Error:', error);
      throw error;
    }
  }

  static async getInstantlyAnalytics() {
    // This method is now integrated into getInstantlyData() 
    // Keeping for backward compatibility
    try {
      const data = await this.getInstantlyData();
      return data.analytics;
    } catch (error) {
      console.error('Instantly Analytics Error:', error);
      return null;
    }
  }

  static async getCampaignAnalytics(campaignId: string) {
    // Individual campaign analytics not available in Instantly API v2
    console.warn(`Campaign analytics not available for individual campaigns in API v2`);
    return null;
  }

  static async getCampaignDetails(campaignId: string) {
    const isDevelopment = import.meta.env.DEV;
    
    try {
      let response;
      
      if (isDevelopment) {
        // Try proxy first
        try {
          response = await fetch(`http://localhost:3001/api/instantly/campaigns/${campaignId}`);
        } catch (proxyError) {
          console.warn('Proxy not available, using direct API');
          const headers = {
            'Authorization': `Bearer ${import.meta.env.VITE_INSTANTLY_API_KEY}`,
            'Content-Type': 'application/json'
          };
          response = await fetch(`https://api.instantly.ai/api/v2/campaigns/${campaignId}`, { headers });
        }
      } else {
        // Production: direct API
        const headers = {
          'Authorization': `Bearer ${import.meta.env.VITE_INSTANTLY_API_KEY}`,
          'Content-Type': 'application/json'
        };
        response = await fetch(`https://api.instantly.ai/api/v2/campaigns/${campaignId}`, { headers });
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch campaign details: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error fetching campaign ${campaignId} details:`, error);
      throw error;
    }
  }

  static async getCampaignLeads(campaignId: string) {
    // Campaign leads endpoint may not be available in all API versions
    console.warn(`Campaign leads endpoint may not be available`);
    return [];
  }

  // HeyReach API Integration
  static async getHeyReachData() {
    const apiKey = import.meta.env.VITE_HEYREACH_API_KEY;
    if (!apiKey) {
      console.error('❌ HeyReach API key not found in environment variables');
      console.error('Available env vars:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')));
      throw new Error('HeyReach API key not configured - check environment variables in production deployment');
    }

    console.log('🔑 Testing HeyReach API key authentication...');
    
    // First, test the API key using the CheckApiKey endpoint
    const headers = {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    try {
      // Test authentication first
      console.log('🔄 Testing HeyReach API key validity...');
      const authTestResponse = await fetch(
        `${INTEGRATION_CONFIG.HEYREACH_API.BASE_URL}${INTEGRATION_CONFIG.HEYREACH_API.ENDPOINTS.AUTH_CHECK}`,
        { headers }
      );
      
      console.log(`🔍 Auth test response:`, authTestResponse.status, authTestResponse.statusText);
      
      if (!authTestResponse.ok) {
        const errorText = await authTestResponse.text();
        console.error('❌ HeyReach API key authentication failed:', errorText);
        throw new Error(`HeyReach API key authentication failed: ${authTestResponse.status} - ${errorText}`);
      }
      
      console.log('✅ HeyReach API key is valid');
      return await this.fetchHeyReachWithAuth(headers);
      
    } catch (error) {
      console.error('❌ HeyReach API Error:', error.message);
      throw new Error(`HeyReach API authentication failed: ${error.message}`);
    }
  }

  private static async fetchHeyReachWithAuth(headers: Record<string, string>) {
    try {
      console.log('🔄 Fetching HeyReach data with working endpoints...');
      
      // Use the correct HeyReach API format (POST with empty body)
      const requestOptions = {
        method: 'POST',
        headers,
        body: JSON.stringify({})
      };

      // Get LinkedIn accounts
      let accounts = [];
      try {
        console.log('📡 Fetching LinkedIn accounts...');
        const accountsResponse = await fetch(
          `${INTEGRATION_CONFIG.HEYREACH_API.BASE_URL}${INTEGRATION_CONFIG.HEYREACH_API.ENDPOINTS.LI_ACCOUNTS}`,
          requestOptions
        );
        
        if (accountsResponse.ok) {
          const accountsData = await accountsResponse.json();
          accounts = accountsData.items || [];
          console.log(`✅ Found ${accounts.length} LinkedIn accounts`);
        }
      } catch (error) {
        console.warn('⚠️ LinkedIn accounts fetch error:', error.message);
      }

      // Get campaigns
      let campaigns = [];
      try {
        console.log('📡 Fetching campaigns...');
        const campaignsResponse = await fetch(
          `${INTEGRATION_CONFIG.HEYREACH_API.BASE_URL}${INTEGRATION_CONFIG.HEYREACH_API.ENDPOINTS.CAMPAIGNS}`,
          requestOptions
        );
        
        if (campaignsResponse.ok) {
          const campaignsData = await campaignsResponse.json();
          campaigns = campaignsData.items || [];
          console.log(`✅ Found ${campaigns.length} campaigns`);
        }
      } catch (error) {
        console.warn('⚠️ Campaigns fetch error:', error.message);
      }

      // Try to get conversations/messages (optional)
      let conversations = [];
      let messages = [];
      
      try {
        console.log('📡 Fetching conversations...');
        const conversationsResponse = await fetch(
          `${INTEGRATION_CONFIG.HEYREACH_API.BASE_URL}${INTEGRATION_CONFIG.HEYREACH_API.ENDPOINTS.CONVERSATIONS}`,
          requestOptions
        );
        
        if (conversationsResponse.ok) {
          const conversationsData = await conversationsResponse.json();
          conversations = conversationsData.items || [];
          console.log(`✅ Found ${conversations.length} conversations`);
        }
      } catch (error) {
        console.warn('⚠️ Conversations fetch error:', error.message);
      }

      // Calculate analytics from the data we have
      const analytics = {
        linkedin_accounts: accounts.length,
        active_accounts: accounts.filter(acc => acc.isActive).length,
        total_campaigns: campaigns.length,
        active_campaigns: accounts.reduce((sum, acc) => sum + (acc.activeCampaigns || 0), 0),
        total_conversations: conversations.length,
        auth_valid_accounts: accounts.filter(acc => acc.authIsValid).length
      };

      console.log('📊 HeyReach analytics:', analytics);

      return {
        accounts: accounts,
        campaigns: campaigns,
        conversations: conversations,
        messages: messages,
        analytics: analytics
      };
      
    } catch (error) {
      console.error('❌ HeyReach API Error:', error);
      throw error;
    }
  }

  private static async getHeyReachAnalyticsWithHeaders(headers: Record<string, string>) {
    try {
      const response = await fetch(
        `${INTEGRATION_CONFIG.HEYREACH_API.BASE_URL}${INTEGRATION_CONFIG.HEYREACH_API.ENDPOINTS.ANALYTICS}`,
        { headers }
      );
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('HeyReach Analytics Error:', error);
      return null;
    }
  }

  static async getHeyReachAnalytics() {
    try {
      const data = await this.getHeyReachData();
      return data.analytics;
    } catch (error) {
      console.error('HeyReach Analytics Error:', error);
      return null;
    }
  }

  // Apollo API Integration
  static async getApolloData() {
    const apiKey = await this.getApiKey('apollo');
    if (!apiKey) throw new Error('Apollo API key not configured');

    const headers = {
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey
    };

    try {
      // Get sequences (email campaigns)
      const sequencesResponse = await fetch(
        `${INTEGRATION_CONFIG.APOLLO_API.BASE_URL}${INTEGRATION_CONFIG.APOLLO_API.ENDPOINTS.SEQUENCES}`,
        { headers }
      );
      const sequences = await sequencesResponse.json();

      // Get contacts
      const contactsResponse = await fetch(
        `${INTEGRATION_CONFIG.APOLLO_API.BASE_URL}${INTEGRATION_CONFIG.APOLLO_API.ENDPOINTS.CONTACTS}`,
        { headers }
      );
      const contacts = await contactsResponse.json();

      return {
        campaigns: sequences.emailer_campaigns || [],
        leads: contacts.contacts || [],
        analytics: {
          total_sequences: sequences.emailer_campaigns?.length || 0,
          total_contacts: contacts.contacts?.length || 0
        }
      };
    } catch (error) {
      console.error('Apollo API Error:', error);
      throw error;
    }
  }

  // Trigger N8N Workflows
  static async triggerN8NWorkflow(workflowType: string, payload: any) {
    const webhookUrl = INTEGRATION_CONFIG.N8N_WEBHOOKS[workflowType as keyof typeof INTEGRATION_CONFIG.N8N_WEBHOOKS];
    
    if (!webhookUrl) {
      throw new Error(`N8N webhook URL not configured for ${workflowType}`);
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_N8N_AUTH_TOKEN}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`N8N workflow failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`N8N ${workflowType} Error:`, error);
      throw error;
    }
  }
}