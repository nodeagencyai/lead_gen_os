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
    // Use proxy server in development, direct API with CORS handling in production
    const isDevelopment = import.meta.env.DEV;
    const baseUrl = isDevelopment 
      ? 'http://localhost:3001/api/instantly' // Development proxy server
      : 'https://api.instantly.ai/api/v2'; // Production direct API
    
    // Setup headers for direct API calls in production
    const headers = isDevelopment ? {} : {
      'Authorization': `Bearer ${import.meta.env.VITE_INSTANTLY_API_KEY}`,
      'Content-Type': 'application/json'
    };

    try {
      console.log(`🔄 Fetching Instantly data via ${isDevelopment ? 'proxy server' : 'direct API'}...`);
      
      // Get campaigns
      const campaignResponse = await fetch(
        isDevelopment ? `${baseUrl}/campaigns` : `${baseUrl}/campaigns`,
        isDevelopment ? {} : { headers }
      );
      
      console.log('🔍 Debug - Campaign response status:', campaignResponse.status);
      console.log('🔍 Debug - Campaign response ok:', campaignResponse.ok);
      
      if (!campaignResponse.ok) {
        const errorText = await campaignResponse.text();
        console.error('🔍 Debug - Campaign error response:', errorText);
        throw new Error(`Campaigns API failed: ${campaignResponse.status} ${campaignResponse.statusText} - ${errorText}`);
      }
      
      const campaigns = await campaignResponse.json();
      console.log('📊 Campaigns fetched:', campaigns);

      // Get analytics
      const analytics = await this.getInstantlyAnalytics();
      console.log('📈 Analytics fetched:', analytics);

      // Handle the new API v2 response format
      const campaignList = campaigns.items || [];
      
      // Try to get individual campaign analytics if global analytics is empty
      let totalEmailsSent = analytics?.emails_sent || 0;
      let totalOpened = analytics?.emails_opened || 0;  
      let totalReplied = analytics?.emails_replied || 0;
      let totalBounced = analytics?.emails_bounced || 0;

      // If no global analytics, try to aggregate from individual campaigns
      if (!analytics || analytics.length === 0) {
        console.log('📊 Global analytics empty, checking individual campaigns...');
        for (const campaign of campaignList) {
          try {
            const campaignStats = await this.getCampaignAnalytics(campaign.id);
            if (campaignStats) {
              totalEmailsSent += campaignStats.emails_sent || 0;
              totalOpened += campaignStats.emails_opened || 0;
              totalReplied += campaignStats.emails_replied || 0;
              totalBounced += campaignStats.emails_bounced || 0;
            }
          } catch (error) {
            console.warn(`Failed to get analytics for campaign ${campaign.id}:`, error);
          }
        }
      }

      return {
        campaigns: campaignList,
        analytics: {
          emails_sent: analytics?.emails_sent || totalEmailsSent,
          emails_opened: analytics?.emails_opened || totalOpened,
          emails_replied: analytics?.emails_replied || totalReplied,
          meetings_booked: analytics?.meetings_booked || 0,
          bounce_rate: totalEmailsSent > 0 ? ((totalBounced / totalEmailsSent) * 100).toFixed(1) : 0
        }
      };
    } catch (error) {
      console.error('❌ Instantly API Error:', error);
      console.error('🔍 Debug - Error type:', typeof error);
      console.error('🔍 Debug - Error name:', error.name);
      console.error('🔍 Debug - Error message:', error.message);
      console.error('🔍 Debug - Error stack:', error.stack);
      throw error;
    }
  }

  static async getInstantlyAnalytics() {
    const isDevelopment = import.meta.env.DEV;
    const url = isDevelopment 
      ? 'http://localhost:3001/api/instantly/campaigns/analytics'
      : 'https://api.instantly.ai/api/v2/campaigns/analytics';
    
    const headers = isDevelopment ? {} : {
      'Authorization': `Bearer ${import.meta.env.VITE_INSTANTLY_API_KEY}`,
      'Content-Type': 'application/json'
    };

    try {
      console.log('📈 Fetching Instantly analytics...');
      const response = await fetch(url, isDevelopment ? {} : { headers });
      
      if (!response.ok) {
        console.warn(`Analytics API returned ${response.status}, will calculate from campaigns`);
        return null;
      }
      
      const data = await response.json();
      console.log('✅ Analytics response:', data);
      return data;
    } catch (error) {
      console.error('Instantly Analytics Error:', error);
      return null;
    }
  }

  static async getCampaignAnalytics(campaignId: string) {
    try {
      console.log(`📊 Fetching analytics for campaign ${campaignId}...`);
      const response = await fetch(`http://localhost:3001/api/instantly/campaigns/${campaignId}/analytics`);
      
      if (!response.ok) {
        console.warn(`Campaign analytics API returned ${response.status} for campaign ${campaignId}`);
        return null;
      }
      
      const data = await response.json();
      console.log(`✅ Campaign ${campaignId} analytics:`, data);
      return data;
    } catch (error) {
      console.error(`Campaign Analytics Error for ${campaignId}:`, error);
      return null;
    }
  }

  static async getCampaignDetails(campaignId: string) {
    try {
      console.log(`🔍 Fetching details for campaign ${campaignId}...`);
      const response = await fetch(`http://localhost:3001/api/instantly/campaigns/${campaignId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch campaign details: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`✅ Campaign ${campaignId} details fetched`);
      return data;
    } catch (error) {
      console.error(`Error fetching campaign ${campaignId} details:`, error);
      throw error;
    }
  }

  static async getCampaignLeads(campaignId: string) {
    try {
      console.log(`🔍 Fetching leads for campaign ${campaignId}...`);
      const response = await fetch(`http://localhost:3001/api/instantly/campaigns/${campaignId}/leads`);
      
      if (!response.ok) {
        console.warn(`Campaign leads not available: ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      console.log(`✅ Campaign ${campaignId} leads fetched`);
      return data;
    } catch (error) {
      console.error(`Error fetching campaign ${campaignId} leads:`, error);
      return [];
    }
  }

  // HeyReach API Integration
  static async getHeyReachData() {
    const apiKey = await this.getApiKey('heyreach');
    if (!apiKey) throw new Error('HeyReach API key not configured');

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    try {
      // Get campaigns
      const campaignResponse = await fetch(
        `${INTEGRATION_CONFIG.HEYREACH_API.BASE_URL}${INTEGRATION_CONFIG.HEYREACH_API.ENDPOINTS.CAMPAIGNS}`,
        { headers }
      );
      const campaigns = await campaignResponse.json();

      // Get connections
      const connectionsResponse = await fetch(
        `${INTEGRATION_CONFIG.HEYREACH_API.BASE_URL}${INTEGRATION_CONFIG.HEYREACH_API.ENDPOINTS.CONNECTIONS}`,
        { headers }
      );
      const connections = await connectionsResponse.json();

      // Get messages
      const messagesResponse = await fetch(
        `${INTEGRATION_CONFIG.HEYREACH_API.BASE_URL}${INTEGRATION_CONFIG.HEYREACH_API.ENDPOINTS.MESSAGES}`,
        { headers }
      );
      const messages = await messagesResponse.json();

      return {
        campaigns: campaigns.data || [],
        connections: connections.data || [],
        messages: messages.data || [],
        analytics: await this.getHeyReachAnalytics(apiKey)
      };
    } catch (error) {
      console.error('HeyReach API Error:', error);
      throw error;
    }
  }

  static async getHeyReachAnalytics(apiKey: string) {
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    try {
      const response = await fetch(
        `${INTEGRATION_CONFIG.HEYREACH_API.BASE_URL}${INTEGRATION_CONFIG.HEYREACH_API.ENDPOINTS.ANALYTICS}`,
        { headers }
      );
      return await response.json();
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