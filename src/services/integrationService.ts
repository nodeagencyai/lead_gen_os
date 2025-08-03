import { supabase } from '../lib/supabase';
import { INTEGRATION_CONFIG } from '../config/integrations';
import { apiClient } from '../utils/apiClient';
import { getRequiredEnvVar } from '../utils/envValidator';
import { getStatusColor } from '../config/campaignColors';

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

  // Instantly API Integration - Now using serverless API
  static async getInstantlyData() {
    console.log('🔄 Fetching Instantly data via serverless API...');
    
    try {
      // Fetch campaigns using the new API client
      const campaignResult = await apiClient.instantly('/campaigns');
      
      if (campaignResult.error) {
        console.error('❌ Failed to fetch campaigns:', campaignResult.error);
        throw new Error(`Failed to fetch campaigns: ${campaignResult.error}`);
      }

      // Fetch analytics using the new API client
      const analyticsResult = await apiClient.instantly('/analytics');
      
      const campaigns = campaignResult.data?.items || [];
      const analytics = analyticsResult.data || {
        emails_sent: 0,
        emails_opened: 0,
        emails_replied: 0,
        meetings_booked: 0,
        bounce_rate: 0
      };

      console.log(`✅ Fetched ${campaigns.length} campaigns and analytics from Instantly`);

      return {
        campaigns,
        analytics
      };

    } catch (error) {
      console.error('❌ Instantly API Error:', error);
      throw error;
    }
  }

  // NOTE: Old proxy methods removed - now using centralized API client with serverless functions

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
    console.log(`🔄 Fetching campaign ${campaignId} details via serverless API...`);
    
    try {
      // Use API client to call serverless function
      const result = await apiClient.get(`/api/instantly/campaigns/${campaignId}`);
      
      if (result.error) {
        throw new Error(`Failed to fetch campaign details: ${result.error}`);
      }
      
      return result.data;
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

  static async getCampaignSequences(campaignId: string) {
    console.log(`🔄 Delegating sequence fetch to InstantlyCampaignService for campaign ${campaignId}...`);
    
    // Delegate to the new service for all sequence data
    const { InstantlyCampaignService } = await import('./instantlyCampaignService');
    
    try {
      const sequences = await InstantlyCampaignService.getCampaignSequences(campaignId);
      console.log(`✅ Retrieved ${sequences?.length || 0} sequences for campaign ${campaignId}`);
      return sequences || [];
      
    } catch (error) {
      console.error(`❌ Error delegating sequence fetch for campaign ${campaignId}:`, error);
      return [];
    }
  }

  // HeyReach API Integration - Now using serverless API with enhanced data transformation
  static async getHeyReachData() {
    console.log('🔄 Fetching HeyReach data via serverless API...');
    
    try {
      // Test authentication first
      const authResult = await apiClient.heyreach('/auth', {});
      
      if (authResult.error) {
        console.error('❌ HeyReach authentication failed:', authResult.error);
        console.error('❌ HeyReach auth details:', JSON.stringify(authResult, null, 2));
        throw new Error(`HeyReach authentication failed: ${JSON.stringify(authResult.error)}`);
      }

      console.log('✅ HeyReach authentication successful');

      // Fetch data in parallel for better performance
      // Note: All HeyReach endpoints use POST with parameters per HeyReach API pattern
      const [accountsResult, campaignsResult, conversationsResult] = await Promise.all([
        apiClient.heyreach('/accounts', { offset: "0", keyword: "", limit: "100" }),
        apiClient.heyreach('/campaigns', { offset: "0", limit: "50" }),
        apiClient.heyreach('/conversations', { offset: "0", limit: "100" })
      ]);

      const accounts = (accountsResult.data as any)?.items || [];
      const campaigns = (campaignsResult.data as any)?.items || [];
      const conversations = (conversationsResult.data as any)?.items || [];

      console.log(`✅ HeyReach data: ${accounts.length} accounts, ${campaigns.length} campaigns, ${conversations.length} conversations`);

      // Transform campaigns data to match dashboard expectations
      const transformedCampaigns = campaigns.map((campaign: any) => ({
        id: campaign.id,
        name: campaign.name,
        status: this.mapHeyReachStatus(campaign.status),
        sent: campaign.sent_count || 0,
        replies: campaign.replied_count || 0,
        meetings: 0, // Not available in HeyReach API
        rate: campaign.replied_count && campaign.sent_count 
          ? `${Math.round((campaign.replied_count / campaign.sent_count) * 100)}%` 
          : '0%',
        // Add statusColor for dashboard compatibility
        statusColor: this.getHeyReachStatusColor(campaign.status)
      }));

      // Calculate comprehensive analytics
      const analytics = {
        connection_requests_sent: campaigns.reduce((sum: number, c: any) => sum + (c.sent_count || 0), 0),
        connections_accepted: campaigns.reduce((sum: number, c: any) => sum + (c.connected_count || 0), 0),
        messages_sent: conversations.length,
        message_replies: campaigns.reduce((sum: number, c: any) => sum + (c.replied_count || 0), 0),
        meetings_booked: 0, // Not available in current HeyReach API
        linkedin_accounts: accounts.length,
        active_accounts: accounts.filter((acc: any) => acc.isActive || acc.status === 'active').length,
        total_campaigns: campaigns.length,
        active_campaigns: campaigns.filter((c: any) => c.status === 'active').length,
        total_conversations: conversations.length,
        auth_valid_accounts: accounts.filter((acc: any) => acc.authIsValid !== false).length
      };

      return {
        accounts,
        campaigns: transformedCampaigns,
        conversations,
        messages: [],
        analytics
      };

    } catch (error) {
      console.error('❌ HeyReach API Error:', error);
      
      // If it's an API key configuration error, return empty data instead of failing
      if (error instanceof Error && error.message.includes('API key not configured')) {
        console.warn('⚠️ HeyReach API key not configured, returning empty data');
        return {
          campaigns: [],
          connections: [],
          analytics: {
            connection_requests_sent: 0,
            connections_accepted: 0,
            messages_sent: 0,
            message_replies: 0,
            meetings_booked: 0
          }
        };
      }
      
      throw error;
    }
  }
  
  /**
   * Map HeyReach status to unified format
   */
  private static mapHeyReachStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'active': 'Running',
      'running': 'Running',
      'paused': 'Paused',
      'completed': 'Completed',
      'draft': 'Draft',
      'stopped': 'Stopped'
    };
    
    return statusMap[status?.toLowerCase()] || 'Draft';
  }
  
  /**
   * Get status color for HeyReach campaigns
   */
  private static getHeyReachStatusColor(status: string): string {
    const mappedStatus = this.mapHeyReachStatus(status);
    return getStatusColor(mappedStatus as any);
  }

  // NOTE: Old HeyReach proxy and direct API methods removed - now using centralized API client with serverless functions

  static async getHeyReachAnalytics() {
    // This method is now integrated into getHeyReachData()
    // Keeping for backward compatibility
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