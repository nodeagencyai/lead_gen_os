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
    const apiKey = await this.getApiKey('instantly');
    if (!apiKey) throw new Error('Instantly API key not configured');

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    try {
      // Get campaigns
      const campaignResponse = await fetch(
        `${INTEGRATION_CONFIG.INSTANTLY_API.BASE_URL}${INTEGRATION_CONFIG.INSTANTLY_API.ENDPOINTS.CAMPAIGNS}`,
        { headers }
      );
      const campaigns = await campaignResponse.json();

      // Get leads for each campaign
      const leadsPromises = campaigns.data?.map(async (campaign: any) => {
        const leadsResponse = await fetch(
          `${INTEGRATION_CONFIG.INSTANTLY_API.BASE_URL}${INTEGRATION_CONFIG.INSTANTLY_API.ENDPOINTS.LEADS}?campaign_id=${campaign.id}`,
          { headers }
        );
        return leadsResponse.json();
      }) || [];

      const leadsData = await Promise.all(leadsPromises);

      return {
        campaigns: campaigns.data || [],
        leads: leadsData.flat().map(l => l.data || []).flat(),
        analytics: await this.getInstantlyAnalytics(apiKey)
      };
    } catch (error) {
      console.error('Instantly API Error:', error);
      throw error;
    }
  }

  static async getInstantlyAnalytics(apiKey: string) {
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    try {
      const response = await fetch(
        `${INTEGRATION_CONFIG.INSTANTLY_API.BASE_URL}${INTEGRATION_CONFIG.INSTANTLY_API.ENDPOINTS.ANALYTICS}`,
        { headers }
      );
      return await response.json();
    } catch (error) {
      console.error('Instantly Analytics Error:', error);
      return null;
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
          'Authorization': `Bearer ${process.env.VITE_N8N_AUTH_TOKEN}`
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