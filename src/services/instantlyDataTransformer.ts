/**
 * Data Transformer for Instantly.ai API v2
 * Maps API responses to dashboard-friendly format with correct field mappings
 */

import { getStatusColor as getStatusColorFromConfig } from '../config/campaignColors';

// API Response Types
export interface InstantlyCampaignRaw {
  id: string;
  name: string;
  status: number; // 0=Draft, 1=Running, 2=Paused, 3=Stopped, 4=Completed
  is_evergreen: boolean;
  timestamp_created: string;
  timestamp_updated: string;
  organization: string;
  campaign_schedule?: {
    start_date?: string;
    end_date?: string;
    schedules?: any[];
  };
  sequences?: any[];
  leads_count?: number;
  daily_limit?: number;
  stop_on_reply?: boolean;
  link_tracking?: boolean;
  open_tracking?: boolean;
}

export interface InstantlyCampaignAnalytics {
  campaign_id: string;
  campaign_name: string;
  campaign_status: number;
  campaign_is_evergreen: boolean;
  leads_count: number;
  contacted_count: number;
  open_count: number;
  reply_count: number;
  link_click_count: number;
  bounced_count: number;
  unsubscribed_count: number;
  completed_count: number;
  emails_sent_count: number;
  new_leads_contacted_count: number;
  total_opportunities: number;
  total_opportunity_value: number;
}

export interface InstantlyAnalyticsOverview {
  open_count: number;
  open_count_unique: number;
  open_count_unique_by_step: number;
  link_click_count: number;
  link_click_count_unique: number;
  link_click_count_unique_by_step: number;
  reply_count: number;
  reply_count_unique: number;
  reply_count_unique_by_step: number;
  bounced_count: number;
  unsubscribed_count: number;
  completed_count: number;
  emails_sent_count: number;
  new_leads_contacted_count: number;
  total_opportunities: number;
  total_opportunity_value: number;
  total_interested: number;
  total_meeting_booked: number;
  total_meeting_completed: number;
  total_closed: number;
}

export interface InstantlyLeadsData {
  items: any[];
  analytics: {
    total_leads: number;
    leads_ready: number;
    leads_contacted: number;
  };
}

// Dashboard Types
export interface DashboardCampaign {
  // Basic Info
  id: string;
  name: string;
  status: 'Draft' | 'Running' | 'Paused' | 'Stopped' | 'Completed';
  statusColor: string;
  lastUpdated: string;
  
  // Core Metrics (for campaign cards)
  totalContacted: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  leadsReady: number;
  emailsSent: number;
  preparation: number;
  
  // Additional Metrics
  totalLeads: number;
  bounced: number;
  unsubscribed: number;
  opens: number;
  clicks: number;
  replies: number;
  meetings: number;
  opportunities: number;
  
  // Metadata
  template: string;
  platform: string;
  isEvergreen: boolean;
  
  // Status Helpers
  isActive: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  isDraft: boolean;
  
  // Raw data for debugging
  rawCampaign?: InstantlyCampaignRaw;
  rawAnalytics?: InstantlyCampaignAnalytics;
  rawOverview?: InstantlyAnalyticsOverview;
  rawLeads?: InstantlyLeadsData;
}

// Field mapping configuration
const DATA_MAPPING = {
  // Basic Campaign Info
  campaignName: 'name',
  campaignStatus: 'status',
  lastUpdated: 'timestamp_updated',
  
  // Performance Metrics from Analytics API
  totalContacted: 'contacted_count',
  totalLeads: 'leads_count',
  emailsSent: 'emails_sent_count',
  opens: 'open_count',
  clicks: 'link_click_count',
  replies: 'reply_count',
  bounced: 'bounced_count',
  unsubscribed: 'unsubscribed_count',
  
  // Unique metrics from Overview API
  uniqueOpens: 'open_count_unique',
  uniqueClicks: 'link_click_count_unique',
  uniqueReplies: 'reply_count_unique',
  meetingsBooked: 'total_meeting_booked',
  meetingsCompleted: 'total_meeting_completed',
  
  // Calculated Metrics
  openRate: '(open_count / emails_sent_count) * 100',
  clickRate: '(link_click_count / emails_sent_count) * 100',
  replyRate: '(reply_count / emails_sent_count) * 100',
  leadsReady: 'leads_count - contacted_count',
  preparationProgress: '(contacted_count / leads_count) * 100'
};

export class DataTransformer {
  /**
   * Transform raw API data into dashboard campaign format
   */
  static transformCampaignData(
    campaign: InstantlyCampaignRaw,
    analytics?: InstantlyCampaignAnalytics,
    overview?: InstantlyAnalyticsOverview,
    leads?: InstantlyLeadsData
  ): DashboardCampaign {
    // Use data from multiple sources with proper priority
    const emailsSent = overview?.emails_sent_count || analytics?.emails_sent_count || 0;
    const totalLeads = leads?.analytics?.total_leads || analytics?.leads_count || campaign.leads_count || 0;
    const contacted = analytics?.contacted_count || overview?.new_leads_contacted_count || 0;
    
    // Use unique counts from overview when available
    const opens = overview?.open_count_unique || analytics?.open_count || 0;
    const clicks = overview?.link_click_count_unique || analytics?.link_click_count || 0;
    const replies = overview?.reply_count_unique || analytics?.reply_count || 0;
    
    // Calculate rates based on actual data
    const openRate = emailsSent > 0 ? Math.round((opens / emailsSent) * 100) : 0;
    const clickRate = emailsSent > 0 ? Math.round((clicks / emailsSent) * 100) : 0;
    const replyRate = emailsSent > 0 ? Math.round((replies / emailsSent) * 100) : 0;
    
    // Calculate leads ready (total - contacted - bounced - unsubscribed)
    const bounced = analytics?.bounced_count || 0;
    const unsubscribed = analytics?.unsubscribed_count || 0;
    const leadsReady = Math.max(0, totalLeads - contacted - bounced - unsubscribed);
    
    // Map status
    const status = this.mapStatus(campaign.status);
    const statusColor = this.getStatusColor(status);
    
    // Calculate preparation
    const preparation = this.calculatePreparation(campaign, totalLeads, emailsSent);
    
    // Get meetings and opportunities
    const meetings = overview?.total_meeting_booked || 0;
    const opportunities = analytics?.total_opportunities || overview?.total_opportunities || 0;

    return {
      // Basic Info
      id: campaign.id,
      name: campaign.name,
      status,
      statusColor,
      lastUpdated: campaign.timestamp_updated,
      
      // Core Metrics
      totalContacted: contacted,
      openRate,
      clickRate,
      replyRate,
      leadsReady: leads?.analytics?.leads_ready || leadsReady,
      emailsSent,
      preparation,
      
      // Additional Metrics
      totalLeads,
      bounced,
      unsubscribed,
      opens,
      clicks,
      replies,
      meetings,
      opportunities,
      
      // Metadata
      template: this.inferTemplate(campaign.name),
      platform: 'Instantly',
      isEvergreen: campaign.is_evergreen || false,
      
      // Status Helpers
      isActive: campaign.status === 1,
      isPaused: campaign.status === 2,
      isCompleted: campaign.status === 4,
      isDraft: campaign.status === 0 || emailsSent === 0,
      
      // Raw data
      rawCampaign: campaign,
      rawAnalytics: analytics,
      rawOverview: overview,
      rawLeads: leads
    };
  }

  /**
   * Get empty metrics for fallback
   */
  static getEmptyMetrics(): Partial<DashboardCampaign> {
    return {
      totalContacted: 0,
      openRate: 0,
      clickRate: 0,
      replyRate: 0,
      leadsReady: 0,
      emailsSent: 0,
      totalLeads: 0,
      preparation: 0,
      bounced: 0,
      unsubscribed: 0,
      opens: 0,
      clicks: 0,
      replies: 0,
      meetings: 0,
      opportunities: 0
    };
  }

  /**
   * Map numeric status to string
   */
  private static mapStatus(status: number): DashboardCampaign['status'] {
    const statusMap: Record<number, DashboardCampaign['status']> = {
      0: 'Draft',
      1: 'Running',
      2: 'Paused',
      3: 'Stopped',
      4: 'Completed'
    };
    return statusMap[status] || 'Draft';
  }

  /**
   * Get status color - now uses centralized color configuration
   */
  private static getStatusColor(status: DashboardCampaign['status']): string {
    return getStatusColorFromConfig(status);
  }

  /**
   * Calculate campaign preparation percentage
   */
  private static calculatePreparation(
    campaign: InstantlyCampaignRaw,
    totalLeads: number,
    emailsSent: number
  ): number {
    let score = 0;
    
    // Campaign created
    score += 20;
    
    // Has schedule
    if (campaign.campaign_schedule?.schedules?.length) score += 20;
    
    // Has sequences
    if (campaign.sequences?.length) score += 20;
    
    // Has leads
    if (totalLeads > 0) score += 20;
    
    // Campaign started (has sent emails)
    if (emailsSent > 0) score += 20;
    
    return Math.min(score, 100);
  }

  /**
   * Infer template type from campaign name
   */
  private static inferTemplate(campaignName: string): string {
    const name = campaignName.toLowerCase();
    
    if (name.includes('digital') || name.includes('marketing')) return 'Digital Marketing Outreach';
    if (name.includes('sales') || name.includes('development')) return 'Sales Development Outreach';
    if (name.includes('beta')) return 'Beta Testing Outreach';
    if (name.includes('agency') || name.includes('agencies')) return 'Agency Outreach';
    if (name.includes('saas')) return 'SaaS Outreach';
    if (name.includes('startup')) return 'Startup Outreach';
    
    return 'General Outreach';
  }

  /**
   * Create a fallback campaign when data is unavailable
   */
  static createFallbackCampaign(
    id: string,
    name: string = 'Unknown Campaign'
  ): DashboardCampaign {
    return {
      id,
      name,
      status: 'Draft',
      statusColor: '#3b82f6',
      lastUpdated: new Date().toISOString(),
      totalContacted: 0,
      openRate: 0,
      clickRate: 0,
      replyRate: 0,
      leadsReady: 0,
      emailsSent: 0,
      preparation: 0,
      totalLeads: 0,
      bounced: 0,
      unsubscribed: 0,
      opens: 0,
      clicks: 0,
      replies: 0,
      meetings: 0,
      opportunities: 0,
      template: 'General Outreach',
      platform: 'Instantly',
      isEvergreen: false,
      isActive: false,
      isPaused: false,
      isCompleted: false,
      isDraft: true
    };
  }
}