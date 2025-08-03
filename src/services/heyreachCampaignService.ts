/**
 * HeyReach Campaign Service - LinkedIn Integration
 * Fetches actual data from HeyReach campaigns via API
 * Follows the same patterns as InstantlyCampaignService for consistency
 */

import { apiClient } from '../utils/apiClient';
import { getStatusColor as getStatusColorFromConfig } from '../config/campaignColors';

// HeyReach Campaign Interface (based on HeyReach API docs)
interface HeyReachCampaignRaw {
  id: string;
  name: string;
  status: string; // 'active', 'paused', 'completed', 'draft', 'stopped'
  created_at: string;
  updated_at: string;
  leads_count: number;
  sent_count?: number;
  connected_count?: number;
  replied_count?: number;
  sequences?: any[];
  linkedin_accounts?: Array<{
    id: string;
    name: string;
    profile_url: string;
    status: string;
  }>;
}

// HeyReach Analytics Interface
interface HeyReachAnalytics {
  summary: {
    leads_added: number;
    profiles_viewed: number;
    connections_sent: number;
    connections_accepted: number;
    messages_sent: number;
    replies_received: number;
    acceptance_rate: number;
    reply_rate: number;
  };
  daily_stats?: Array<{
    date: string;
    profiles_viewed: number;
    connections_sent: number;
    connections_accepted: number;
    messages_sent: number;
    replies_received: number;
  }>;
}

// Unified Dashboard Campaign Interface (shared with Instantly)
export interface DashboardCampaign {
  id: string;
  name: string;
  status: 'Draft' | 'Running' | 'Paused' | 'Stopped' | 'Completed';
  statusColor: string;
  lastUpdated: string;
  
  // Core LinkedIn Metrics
  totalContacted: number;
  connectionsAccepted: number;
  connectionRate: number;
  replyRate: number;
  leadsReady: number;
  connectionsSent: number;
  preparation: number;
  
  // Additional Metrics
  totalLeads: number;
  profilesViewed: number;
  messagesSent: number;
  replies: number;
  meetings: number;
  opportunities: number;
  
  // Metadata
  template: string;
  platform: 'HeyReach';
  isEvergreen: boolean;
  
  // Status Helpers
  isActive: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  isDraft: boolean;
  
  // Raw data
  rawCampaign: HeyReachCampaignRaw;
  rawAnalytics?: HeyReachAnalytics;
}

export class HeyReachCampaignService {
  /**
   * Fetch all campaigns from HeyReach with analytics
   */
  static async fetchAllCampaigns(): Promise<DashboardCampaign[]> {
    console.log('🚀 Fetching ALL HeyReach campaigns with real data...');
    
    try {
      // Fetch campaigns via API client
      console.log('📋 Fetching campaigns via smart API client...');
      const campaignsResult = await apiClient.heyreach('/campaigns');
      
      if (campaignsResult.error) {
        console.error('❌ Failed to fetch HeyReach campaigns:', campaignsResult.error);
        throw new Error(`Failed to fetch campaigns: ${campaignsResult.error}`);
      }
      
      const campaigns: HeyReachCampaignRaw[] = campaignsResult.data?.items || [];
      console.log(`📋 Found ${campaigns.length} total campaigns from HeyReach`);
      
      if (campaigns.length === 0) {
        console.log('⚠️ No campaigns found in HeyReach');
        return [];
      }
      
      // Transform campaigns to dashboard format
      const transformedCampaigns: DashboardCampaign[] = [];
      
      for (const campaign of campaigns) {
        console.log(`🔄 Processing campaign: ${campaign.name} (${campaign.id})`);
        
        // Fetch individual campaign analytics
        let analytics: HeyReachAnalytics | null = null;
        try {
          analytics = await this.getCampaignAnalytics(campaign.id);
        } catch (error) {
          console.warn(`⚠️ Failed to fetch analytics for campaign ${campaign.id}:`, error);
        }
        
        const transformedCampaign = this.transformToUnifiedFormat(campaign, analytics);
        transformedCampaigns.push(transformedCampaign);
        
        console.log(`✅ Campaign "${campaign.name}" processed:`, {
          status: transformedCampaign.status,
          totalContacted: transformedCampaign.totalContacted,
          connectionRate: transformedCampaign.connectionRate,
          connectionsSent: transformedCampaign.connectionsSent,
          leadsReady: transformedCampaign.leadsReady
        });
      }
      
      console.log(`✅ Successfully processed ${transformedCampaigns.length} campaigns with real data`);
      return transformedCampaigns;
      
    } catch (error) {
      console.error('❌ CRITICAL ERROR in HeyReach campaign fetching:', error);
      throw error;
    }
  }
  
  /**
   * Get analytics for a specific campaign
   */
  static async getCampaignAnalytics(campaignId: string): Promise<HeyReachAnalytics | null> {
    console.log(`📊 Fetching analytics for campaign ${campaignId} from HeyReach API...`);
    
    try {
      // Note: HeyReach API endpoint might need to be adjusted based on actual API
      const analyticsResult = await apiClient.heyreach(`/campaigns/${campaignId}/analytics`);
      
      if (analyticsResult.error) {
        console.warn(`⚠️ Analytics not available for campaign ${campaignId}:`, analyticsResult.error);
        return null;
      }
      
      const analytics = analyticsResult.data;
      console.log(`✅ Analytics for campaign ${campaignId} fetched from HeyReach API`);
      
      return analytics;
      
    } catch (error) {
      console.warn(`⚠️ Error fetching analytics for campaign ${campaignId}:`, error);
      return null;
    }
  }
  
  /**
   * Transform HeyReach campaign data to unified dashboard format
   */
  private static transformToUnifiedFormat(
    campaign: HeyReachCampaignRaw,
    analytics?: HeyReachAnalytics | null
  ): DashboardCampaign {
    // Map HeyReach status to unified format
    const status = this.mapStatus(campaign.status);
    const statusColor = this.getStatusColor(status);
    
    // Extract metrics from analytics or use campaign data
    const connectionsAccepted = analytics?.summary?.connections_accepted || campaign.connected_count || 0;
    const connectionsSent = analytics?.summary?.connections_sent || campaign.sent_count || 0;
    const replies = analytics?.summary?.replies_received || campaign.replied_count || 0;
    const totalContacted = connectionsAccepted; // LinkedIn specific metric
    const totalLeads = campaign.leads_count || 0;
    const profilesViewed = analytics?.summary?.profiles_viewed || 0;
    const messagesSent = analytics?.summary?.messages_sent || 0;
    
    // Calculate rates
    const connectionRate = connectionsSent > 0 ? Math.round((connectionsAccepted / connectionsSent) * 100) : 0;
    const replyRate = messagesSent > 0 ? Math.round((replies / messagesSent) * 100) : 0;
    
    // Calculate preparation score based on campaign setup
    const preparation = this.calculatePreparation(campaign, totalLeads, connectionsSent);
    
    return {
      // Basic Info
      id: campaign.id,
      name: campaign.name,
      status,
      statusColor,
      lastUpdated: campaign.updated_at,
      
      // Core LinkedIn Metrics
      totalContacted,
      connectionsAccepted,
      connectionRate,
      replyRate,
      leadsReady: Math.max(0, totalLeads - connectionsSent), // Leads not yet contacted
      connectionsSent,
      preparation,
      
      // Additional Metrics
      totalLeads,
      profilesViewed,
      messagesSent,
      replies,
      meetings: 0, // Not available in current HeyReach API
      opportunities: 0, // Not available in current HeyReach API
      
      // Metadata
      template: this.inferTemplate(campaign.name),
      platform: 'HeyReach',
      isEvergreen: false, // Default for LinkedIn campaigns
      
      // Status Helpers
      isActive: campaign.status === 'active',
      isPaused: campaign.status === 'paused',
      isCompleted: campaign.status === 'completed',
      isDraft: campaign.status === 'draft',
      
      // Raw data
      rawCampaign: campaign,
      rawAnalytics: analytics || undefined
    };
  }
  
  /**
   * Map HeyReach status to unified string format
   */
  private static mapStatus(status: string): DashboardCampaign['status'] {
    const statusMap: Record<string, DashboardCampaign['status']> = {
      'active': 'Running',
      'running': 'Running', // Alternative naming
      'paused': 'Paused',
      'completed': 'Completed',
      'draft': 'Draft',
      'stopped': 'Stopped'
    };
    
    return statusMap[status.toLowerCase()] || 'Draft';
  }
  
  /**
   * Get status color - uses centralized color configuration
   */
  private static getStatusColor(status: DashboardCampaign['status']): string {
    return getStatusColorFromConfig(status);
  }
  
  /**
   * Calculate campaign preparation percentage
   */
  private static calculatePreparation(
    campaign: HeyReachCampaignRaw,
    totalLeads: number,
    connectionsSent: number
  ): number {
    let score = 0;
    
    // Basic campaign setup (30%)
    if (campaign.name && campaign.name.length > 3) score += 15;
    if (campaign.sequences && campaign.sequences.length > 0) score += 15;
    
    // LinkedIn accounts connected (20%)
    if (campaign.linkedin_accounts && campaign.linkedin_accounts.length > 0) {
      score += Math.min(20, campaign.linkedin_accounts.length * 10);
    }
    
    // Leads imported (30%)
    if (totalLeads > 0) {
      if (totalLeads >= 100) score += 30;
      else if (totalLeads >= 50) score += 20;
      else if (totalLeads >= 10) score += 15;
      else score += 10;
    }
    
    // Campaign activity (20%)
    if (connectionsSent > 0) {
      if (connectionsSent >= totalLeads * 0.5) score += 20; // 50%+ contacted
      else if (connectionsSent >= totalLeads * 0.25) score += 15; // 25%+ contacted
      else if (connectionsSent > 0) score += 10; // Some activity
    }
    
    return Math.min(100, score);
  }
  
  /**
   * Infer template type from campaign name
   */
  private static inferTemplate(campaignName: string): string {
    const name = campaignName.toLowerCase();
    
    if (name.includes('cold') || name.includes('outreach')) return 'Cold Outreach';
    if (name.includes('warm') || name.includes('follow')) return 'Warm Follow-up';
    if (name.includes('agency') || name.includes('agencies')) return 'Agency Outreach';
    if (name.includes('sales') || name.includes('sdr')) return 'Sales Development';
    if (name.includes('beta') || name.includes('test')) return 'Beta Testing';
    if (name.includes('partnership') || name.includes('partner')) return 'Partnership';
    if (name.includes('recruitment') || name.includes('hiring')) return 'Recruitment';
    
    return 'General LinkedIn Outreach';
  }
  
  /**
   * Get campaign sequences/steps
   */
  static async getCampaignSequences(campaignId: string): Promise<any[]> {
    console.log(`🔄 Fetching sequences for HeyReach campaign ${campaignId}...`);
    
    try {
      // Fetch campaign details which include sequences
      const campaignResult = await apiClient.heyreach(`/campaigns/${campaignId}`);
      
      if (campaignResult.error) {
        console.error(`❌ Failed to fetch campaign details: ${campaignResult.error}`);
        return [];
      }
      
      const sequences = campaignResult.data?.sequences || [];
      console.log(`✅ Retrieved ${sequences.length} sequences for campaign ${campaignId}`);
      
      return sequences;
      
    } catch (error) {
      console.error(`❌ Error fetching sequences for campaign ${campaignId}:`, error);
      return [];
    }
  }
  
  /**
   * Test HeyReach API connectivity
   */
  static async testConnection(): Promise<boolean> {
    try {
      const authResult = await apiClient.heyreach('/auth');
      
      if (authResult.error) {
        console.error('❌ HeyReach connection test failed:', authResult.error);
        return false;
      }
      
      console.log('✅ HeyReach connection test successful');
      return true;
      
    } catch (error) {
      console.error('❌ HeyReach connection test error:', error);
      return false;
    }
  }
  
  /**
   * Get aggregated analytics for all campaigns
   */
  static async getAggregatedAnalytics(): Promise<{
    totalCampaigns: number;
    activeCampaigns: number;
    totalLeads: number;
    totalConnectionsSent: number;
    totalConnectionsAccepted: number;
    totalReplies: number;
    overallConnectionRate: number;
    overallReplyRate: number;
  }> {
    try {
      const campaigns = await this.fetchAllCampaigns();
      
      const totals = campaigns.reduce((acc, campaign) => {
        acc.totalCampaigns += 1;
        if (campaign.isActive) acc.activeCampaigns += 1;
        acc.totalLeads += campaign.totalLeads;
        acc.totalConnectionsSent += campaign.connectionsSent;
        acc.totalConnectionsAccepted += campaign.connectionsAccepted;
        acc.totalReplies += campaign.replies;
        return acc;
      }, {
        totalCampaigns: 0,
        activeCampaigns: 0,
        totalLeads: 0,
        totalConnectionsSent: 0,
        totalConnectionsAccepted: 0,
        totalReplies: 0
      });
      
      const overallConnectionRate = totals.totalConnectionsSent > 0 
        ? Math.round((totals.totalConnectionsAccepted / totals.totalConnectionsSent) * 100)
        : 0;
        
      const overallReplyRate = totals.totalConnectionsAccepted > 0
        ? Math.round((totals.totalReplies / totals.totalConnectionsAccepted) * 100)
        : 0;
      
      return {
        ...totals,
        overallConnectionRate,
        overallReplyRate
      };
      
    } catch (error) {
      console.error('❌ Error calculating aggregated analytics:', error);
      return {
        totalCampaigns: 0,
        activeCampaigns: 0,
        totalLeads: 0,
        totalConnectionsSent: 0,
        totalConnectionsAccepted: 0,
        totalReplies: 0,
        overallConnectionRate: 0,
        overallReplyRate: 0
      };
    }
  }
}