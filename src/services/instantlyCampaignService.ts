/**
 * Instantly Campaign Service - Real Data Integration
 * Fetches actual data from specific Instantly campaigns via API v2
 */

import { apiClient } from '../utils/apiClient';
import { getStatusColor as getStatusColorFromConfig } from '../config/campaignColors';

// Specific Campaign IDs extracted from share URLs
export const INSTANTLY_CAMPAIGNS = {
  DIGITAL_MARKETING: '4bde0574-609a-409d-86cc-52b233699a2b',
  SALES_DEVELOPMENT: '2e3519c8-ac6f-4961-b803-e28c7423d080',
  BETA: 'afe7fbea-9d4e-491f-88e4-8f75985b9c07'
} as const;

// Campaign name mapping
export const CAMPAIGN_NAMES = {
  [INSTANTLY_CAMPAIGNS.DIGITAL_MARKETING]: 'Digital Marketing Agencies',
  [INSTANTLY_CAMPAIGNS.SALES_DEVELOPMENT]: 'Sales Development Representative', 
  [INSTANTLY_CAMPAIGNS.BETA]: 'Beta'
} as const;

interface InstantlyCampaignDetails {
  id: string;
  name: string;
  status: number; // 0=Draft, 1=Running, 2=Paused, 3=Stopped, 4=Completed
  created_at: string;
  updated_at: string;
  campaign_schedule?: any;
  sequences?: any[];
  leads_count?: number;
  stats?: {
    total_leads: number;
    emails_sent: number;
    emails_opened: number;
    emails_replied: number;
    meetings_booked: number;
    bounce_rate: number;
  };
}

interface CampaignAnalytics {
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

interface EnrichedCampaignData {
  id: string;
  name: string;
  status: 'Draft' | 'Running' | 'Paused' | 'Stopped' | 'Completed';
  statusColor: string;
  preparation: number;
  leadsReady: number;
  emailsSent: number;
  replies: number;
  meetings: number;
  template: string;
  platform: string;
  sequences?: any[];
  analytics?: CampaignAnalytics;
  rawData?: InstantlyCampaignDetails;
  // New analytics fields for campaign cards
  totalContacted: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
}

export class InstantlyCampaignService {
  
  /**
   * Debug method to test API v2 connectivity and campaign existence
   */
  static async debugCampaignAccess(campaignId: string): Promise<void> {
    console.log(`🧪 DEBUG: Testing Instantly API v2 access for campaign ${campaignId}...`);
    
    try {
      // Test the primary API v2 endpoint that should contain sequences
      console.log(`🎯 Testing primary API v2 endpoint: /campaigns/${campaignId}`);
      const primaryResult = await apiClient.instantly(`/campaigns/${campaignId}`);
      
      if (primaryResult.error) {
        console.error(`❌ Primary campaign endpoint failed:`, primaryResult.error);
      } else {
        const campaign = primaryResult.data as any;
        console.log(`✅ Primary campaign endpoint successful`);
        console.log(`📋 Campaign structure:`, {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          hasSequences: !!campaign.sequences,
          sequenceCount: campaign.sequences?.length || 0,
          allKeys: Object.keys(campaign)
        });
        
        // Log sequences if they exist
        if (campaign.sequences && Array.isArray(campaign.sequences)) {
          console.log(`🎯 FOUND SEQUENCES! ${campaign.sequences.length} sequences in campaign:`);
          campaign.sequences.forEach((seq: any, index: number) => {
            console.log(`📧 Sequence ${index + 1}:`, {
              keys: Object.keys(seq),
              hasSubject: !!seq.subject,
              hasContent: !!seq.content || !!seq.body,
              hasSteps: !!seq.steps,
              isArray: Array.isArray(seq)
            });
          });
        } else {
          console.warn(`⚠️ No sequences array found in primary endpoint response`);
        }
      }
      
      // Also test the campaigns list to see if it shows sequences
      console.log(`📋 Testing campaigns list for comparison...`);
      const campaignsResult = await apiClient.instantly('/campaigns');
      
      if (!campaignsResult.error) {
        const allCampaigns = (campaignsResult.data as any)?.items || campaignsResult.data || [];
        const specificCampaign = allCampaigns.find((c: any) => c.id === campaignId);
        if (specificCampaign) {
          console.log(`📝 Campaign in list view:`, {
            hasSequences: !!specificCampaign.sequences,
            sequenceCount: specificCampaign.sequences?.length || 0,
            keys: Object.keys(specificCampaign)
          });
        }
      }
      
    } catch (error) {
      console.error(`❌ Debug test failed:`, error);
    }
  }
  
  /**
   * Fetch campaign details with sequences from Instantly API v2
   * Primary endpoint: GET /campaigns/{campaign_id} - contains complete campaign + sequences
   */
  static async getCampaignDetails(campaignId: string): Promise<InstantlyCampaignDetails | null> {
    try {
      console.log(`🔄 Fetching campaign details from API v2 for ${campaignId}...`);
      
      // Use the primary API v2 endpoint that contains sequences
      const result = await apiClient.instantly(`/campaigns/${campaignId}`);
      
      if (result.error) {
        console.error(`❌ Failed to fetch campaign ${campaignId} from API v2:`, result.error);
        return null;
      }
      
      const campaign = result.data as any;
      
      console.log(`✅ Campaign ${campaignId} fetched from API v2`);
      console.log(`📋 Campaign structure:`, {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        hasSequences: !!campaign.sequences,
        sequenceCount: campaign.sequences?.length || 0
      });
      
      // Specifically log sequences if found
      if (campaign.sequences && Array.isArray(campaign.sequences) && campaign.sequences.length > 0) {
        console.log(`🎯 SUCCESS: Found ${campaign.sequences.length} sequences in API v2 response!`);
        console.log(`📧 First sequence preview:`, {
          keys: Object.keys(campaign.sequences[0]),
          hasSubject: !!campaign.sequences[0].subject,
          hasContent: !!campaign.sequences[0].content || !!campaign.sequences[0].body
        });
      } else {
        console.warn(`⚠️ No sequences found in API v2 response for campaign ${campaignId}`);
      }
      
      return campaign;
      
    } catch (error) {
      console.error(`❌ Error fetching campaign ${campaignId} from API v2:`, error);
      return null;
    }
  }

  /**
   * Fetch campaign analytics from Instantly API v2
   */
  static async getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics | null> {
    try {
      console.log(`📊 Fetching analytics for campaign ${campaignId} from API v2...`);
      
      // Use smart API client with development fallback  
      console.log(`📊 Fetching analytics via smart API client: ${campaignId}`);
      const result = await apiClient.instantly(`/analytics?id=${campaignId}`);
      
      if (result.error) {
        console.warn(`⚠️ Analytics not available for campaign ${campaignId}:`, result.error);
        return null;
      }
      
      const analyticsData = result.data as any;
      console.log(`✅ Analytics for campaign ${campaignId} fetched from API v2`);
      console.log(`📊 Raw analytics structure:`, {
        keys: Object.keys(analyticsData || {}),
        hasItems: !!(analyticsData?.items),
        isArray: Array.isArray(analyticsData)
      });
      
      // Parse analytics data based on API v2 structure
      return this.parseAnalyticsResponse(analyticsData, campaignId);
      
    } catch (error) {
      console.error(`❌ Error fetching analytics for campaign ${campaignId}:`, error);
      return null;
    }
  }

  /**
   * Fetch leads data for a specific campaign using the POST /leads endpoint
   */
  static async getCampaignLeads(campaignId: string): Promise<{
    leads: any[];
    analytics: {
      total_leads: number;
      leads_ready: number;
      leads_contacted: number;
    };
  } | null> {
    try {
      console.log(`👥 Fetching leads for campaign ${campaignId} from API v2...`);
      
      // Use our serverless proxy endpoint for leads
      const result = await apiClient.post(`/api/instantly/leads`, {
        campaign_id: campaignId,
        limit: 100 // Get first 100 leads
      });
      
      if (result.error) {
        console.warn(`⚠️ Leads not available for campaign ${campaignId}:`, result.error);
        return null;
      }
      
      const leadsData = result.data as any;
      console.log(`✅ Leads for campaign ${campaignId} fetched from API v2`);
      console.log(`👥 Leads structure:`, {
        hasItems: !!(leadsData?.items),
        hasAnalytics: !!(leadsData?.analytics),
        leadCount: leadsData?.items?.length || 0
      });
      
      return {
        leads: leadsData?.items || [],
        analytics: leadsData?.analytics || {
          total_leads: leadsData?.items?.length || 0,
          leads_ready: 0,
          leads_contacted: 0
        }
      };
      
    } catch (error) {
      console.error(`❌ Error fetching leads for campaign ${campaignId}:`, error);
      return null;
    }
  }

  /**
   * Parse analytics response from Instantly API v2
   */
  private static parseAnalyticsResponse(data: any, campaignId: string): CampaignAnalytics {
    // Handle different possible response structures
    let analyticsItem = data;
    
    // Debug showed API returns an array directly
    if (Array.isArray(data) && data.length > 0) {
      analyticsItem = data[0]; // Take first item from array
      console.log(`📊 Parsed analytics from array for campaign ${campaignId}`);
    } else if (data.items && Array.isArray(data.items)) {
      analyticsItem = data.items.find((item: any) => item.campaign_id === campaignId) || data.items[0];
    } else if (Array.isArray(data) && data.length === 0) {
      console.warn(`⚠️ Empty analytics array for campaign ${campaignId}`);
      // Return default analytics for campaigns with no data
      return {
        campaign_id: campaignId,
        campaign_name: '',
        campaign_status: 0,
        campaign_is_evergreen: false,
        leads_count: 0,
        contacted_count: 0,
        open_count: 0,
        reply_count: 0,
        link_click_count: 0,
        bounced_count: 0,
        unsubscribed_count: 0,
        completed_count: 0,
        emails_sent_count: 0,
        new_leads_contacted_count: 0,
        total_opportunities: 0,
        total_opportunity_value: 0
      };
    }
    
    // Map exact API v2 field names according to documentation
    return {
      campaign_id: analyticsItem.campaign_id || campaignId,
      campaign_name: analyticsItem.campaign_name || '',
      campaign_status: analyticsItem.campaign_status || 0,
      campaign_is_evergreen: analyticsItem.campaign_is_evergreen || false,
      leads_count: analyticsItem.leads_count || 0,
      contacted_count: analyticsItem.contacted_count || 0,
      open_count: analyticsItem.open_count || 0,
      reply_count: analyticsItem.reply_count || 0,
      link_click_count: analyticsItem.link_click_count || 0,
      bounced_count: analyticsItem.bounced_count || 0,
      unsubscribed_count: analyticsItem.unsubscribed_count || 0,
      completed_count: analyticsItem.completed_count || 0,
      emails_sent_count: analyticsItem.emails_sent_count || 0,
      new_leads_contacted_count: analyticsItem.new_leads_contacted_count || 0,
      total_opportunities: analyticsItem.total_opportunities || 0,
      total_opportunity_value: analyticsItem.total_opportunity_value || 0
    };
  }

  /**
   * Fetch analytics overview from Instantly API v2
   * Provides additional metrics like unique opens, clicks, etc.
   */
  static async getCampaignAnalyticsOverview(campaignId: string): Promise<any | null> {
    try {
      console.log(`📊 Fetching analytics overview for campaign ${campaignId} from API v2...`);
      
      // Use API v2 analytics overview endpoint via proxy
      const result = await apiClient.get(`/api/instantly/analytics-overview?id=${campaignId}`);
      
      if (result.error) {
        console.warn(`⚠️ Analytics overview not available for campaign ${campaignId}:`, result.error);
        return null;
      }
      
      console.log(`✅ Analytics overview for campaign ${campaignId} fetched from API v2`);
      return result.data;
      
    } catch (error) {
      console.error(`❌ Error fetching analytics overview for campaign ${campaignId}:`, error);
      return null;
    }
  }

  /**
   * Fetch step-by-step analytics from Instantly API v2
   * Returns performance data per step and variant
   */
  static async getCampaignStepAnalytics(campaignId: string): Promise<any[] | null> {
    try {
      console.log(`📊 Fetching step analytics for campaign ${campaignId} from API v2...`);
      
      // Use correct API v2 step analytics endpoint format
      const result = await apiClient.instantly(`/campaigns/analytics/steps?campaign_id=${campaignId}`);
      
      if (result.error) {
        console.warn(`⚠️ Step analytics not available for campaign ${campaignId}:`, result.error);
        return null;
      }
      
      console.log(`✅ Step analytics for campaign ${campaignId} fetched from API v2`);
      return result.data as any[];
      
    } catch (error) {
      console.error(`❌ Error fetching step analytics for campaign ${campaignId}:`, error);
      return null;
    }
  }

  /**
   * Fetch campaign subsequences (follow-up sequences)
   * GET /subsequences?parent_campaign={campaign_id}
   */
  static async getCampaignSubsequences(campaignId: string): Promise<any[]> {
    try {
      console.log(`🔄 Fetching subsequences for campaign ${campaignId} from API v2...`);
      
      const result = await apiClient.instantly(`/subsequences?parent_campaign=${campaignId}`);
      
      if (result.error) {
        console.warn(`⚠️ Subsequences not available for campaign ${campaignId}:`, result.error);
        return [];
      }
      
      const subsequences = (result.data as any)?.items || result.data || [];
      console.log(`✅ Found ${subsequences.length} subsequences for campaign ${campaignId}`);
      
      return subsequences;
      
    } catch (error) {
      console.error(`❌ Error fetching subsequences for campaign ${campaignId}:`, error);
      return [];
    }
  }

  /**
   * Parse sequences from campaign or subsequence data (improved logic)
   * Based on user's research of actual API v2 structure
   */
  static parseSequencesFromCampaign(campaignData: any): any[] {
    const sequences: any[] = [];
    
    // Check if campaign has sequences
    if (!campaignData.sequences || !Array.isArray(campaignData.sequences)) {
      return sequences; // Return empty array
    }
    
    // Parse each sequence
    campaignData.sequences.forEach((sequence: any, sequenceIndex: number) => {
      if (!sequence.steps || !Array.isArray(sequence.steps)) {
        return; // Skip invalid sequence
      }
      
      // Parse each step in the sequence
      sequence.steps.forEach((step: any, stepIndex: number) => {
        if (!step.variants || !Array.isArray(step.variants)) {
          return; // Skip invalid step
        }
        
        // Parse each variant in the step
        step.variants.forEach((variant: any, variantIndex: number) => {
          // Only include non-disabled variants with content
          if (!variant.disabled && (variant.subject || variant.body)) {
            sequences.push({
              id: `seq-${sequenceIndex}-step-${stepIndex}-var-${variantIndex}`,
              sequenceIndex,
              stepIndex,
              variantIndex,
              step_number: stepIndex + 1, // Human-readable step number
              sequence_index: sequenceIndex,
              variant_index: variantIndex,
              delay_days: step.delay || 0,
              delay_hours: 0, // API v2 uses days only
              type: step.type || 'email',
              subject: variant.subject || '',
              content: variant.body || '',
              body: variant.body || '', // Keep both for compatibility
              isEmpty: !variant.subject && !variant.body,
              sent: 0, // Will be populated from analytics
              opened: 0,
              replied: 0
            });
          }
        });
      });
    });
    
    return sequences;
  }

  /**
   * Check if campaign/subsequence has sequences without fetching full data
   */
  static hasSequences(campaignData: any): boolean {
    if (!campaignData.sequences || !Array.isArray(campaignData.sequences)) {
      return false;
    }
    
    return campaignData.sequences.some((sequence: any) => 
      sequence.steps && 
      sequence.steps.length > 0 &&
      sequence.steps.some((step: any) => 
        step.variants && 
        step.variants.length > 0 &&
        step.variants.some((variant: any) => 
          !variant.disabled && (variant.subject || variant.body)
        )
      )
    );
  }

  /**
   * Fetch complete sequence data including primary sequences and subsequences
   * Uses the correct API v2 structure with sequences[].steps[].variants[]
   * Returns organized structure: {sequences: {main, followUps, total, isEmpty}}
   */
  static async getEnhancedSequenceData(campaignId: string): Promise<{
    sequences: {
      main: any[];
      followUps: any[];
      total: number;
      isEmpty: boolean;
    };
    campaignInfo: any;
    analytics: any;
    stepAnalytics?: any[];
  }> {
    try {
      console.log(`🔍 Fetching complete sequence data from API v2 for campaign ${campaignId}...`);
      
      // Run debug to understand API responses
      await this.debugCampaignAccess(campaignId);
      
      // Fetch campaign details, subsequences, analytics in parallel
      const [campaignDetails, subsequences, analytics, stepAnalytics] = await Promise.all([
        this.getCampaignDetails(campaignId), // Contains primary sequences
        this.getCampaignSubsequences(campaignId), // Contains follow-up sequences
        this.getCampaignAnalytics(campaignId),
        this.getCampaignStepAnalytics(campaignId)
      ]);
      
      // 1. Parse primary sequences from main campaign using improved logic
      const mainSequences = this.parseSequencesFromCampaign(campaignDetails || {});
      console.log(`✅ Parsed ${mainSequences.length} primary sequence steps from main campaign`);
      
      if (campaignDetails && this.hasSequences(campaignDetails)) {
        console.log(`📧 Main campaign has valid sequences with content`);
        if (campaignDetails.sequences?.[0]?.steps?.[0]) {
          console.log(`📝 First step structure:`, {
            hasVariants: !!campaignDetails.sequences[0].steps[0].variants,
            variantCount: campaignDetails.sequences[0].steps[0].variants?.length || 0,
            type: campaignDetails.sequences[0].steps[0].type,
            delay: campaignDetails.sequences[0].steps[0].delay
          });
        }
      } else {
        console.warn(`⚠️ No valid primary sequences found in main campaign ${campaignId}`);
      }
      
      // 2. Parse sequences from subsequences (follow-up sequences)
      let followUpSequences: any[] = [];
      if (subsequences && subsequences.length > 0) {
        console.log(`✅ Processing ${subsequences.length} subsequences`);
        subsequences.forEach((subseq: any, index: number) => {
          const subSeqs = this.parseSequencesFromCampaign(subseq);
          if (subSeqs.length > 0) {
            console.log(`📧 Subsequence ${index + 1} yielded ${subSeqs.length} sequence steps`);
            followUpSequences.push(...subSeqs);
          }
        });
      } else {
        console.log(`ℹ️ No subsequences found for campaign ${campaignId}`);
      }
      
      // Note: allParsedSequences variable removed - we now return organized structure
      
      // Create organized sequence structure
      const sequencesResult = {
        main: mainSequences,
        followUps: followUpSequences,
        total: mainSequences.length + followUpSequences.length,
        isEmpty: mainSequences.length === 0 && followUpSequences.length === 0
      };
      
      console.log(`✅ Complete sequence data for campaign ${campaignId}:`, {
        mainSequences: sequencesResult.main.length,
        followUpSequences: sequencesResult.followUps.length,
        totalParsedSteps: sequencesResult.total,
        subsequenceCount: subsequences.length,
        isEmpty: sequencesResult.isEmpty,
        hasCampaignInfo: !!campaignDetails,
        hasAnalytics: !!analytics,
        hasStepAnalytics: !!stepAnalytics
      });
      
      return {
        sequences: sequencesResult,
        campaignInfo: campaignDetails,
        analytics,
        stepAnalytics: stepAnalytics || undefined
      };
      
    } catch (error) {
      console.error(`❌ Error fetching complete sequence data for campaign ${campaignId}:`, error);
      return {
        sequences: {
          main: [],
          followUps: [],
          total: 0,
          isEmpty: true
        },
        campaignInfo: null,
        analytics: null,
        stepAnalytics: undefined
      };
    }
  }
  

  /**
   * Legacy method for backward compatibility - returns combined sequences array
   */
  static async getCampaignSequences(campaignId: string): Promise<any[] | null> {
    const enhancedData = await this.getEnhancedSequenceData(campaignId);
    if (enhancedData.sequences.isEmpty) {
      return [];
    }
    // Return combined array for backward compatibility
    return [...enhancedData.sequences.main, ...enhancedData.sequences.followUps];
  }

  /**
   * Fetch ALL campaigns with complete data (not just 3 specific ones)
   */
  static async fetchAllCampaigns(): Promise<EnrichedCampaignData[]> {
    console.log('🚀 Fetching ALL Instantly campaigns with real data...');
    
    try {
      // Use smart API client with development fallback
      console.log('📋 Fetching campaigns via smart API client...');
      const campaignsResult = await apiClient.instantly('/campaigns');
      
      if (campaignsResult.error) {
        console.error('❌ Failed to fetch campaigns list:', campaignsResult.error);
        throw new Error(campaignsResult.error);
      }
      
      const allCampaigns = (campaignsResult.data as any)?.items || campaignsResult.data || [];
      console.log(`📋 Found ${allCampaigns.length} total campaigns from Instantly`);
      
      if (allCampaigns.length === 0) {
        console.warn('⚠️ No campaigns found in Instantly account');
        return [];
      }
      
      // Enrich ALL campaigns with analytics data
      const enrichedCampaigns = await Promise.all(
        allCampaigns.map(async (campaign: any) => {
          try {
            console.log(`🔄 Processing campaign: ${campaign.name} (${campaign.id})`);
            
            // Fetch analytics and overview data in parallel
            const [analytics, analyticsOverview] = await Promise.all([
              this.getCampaignAnalytics(campaign.id),
              this.getCampaignAnalyticsOverview(campaign.id)
            ]);
            
            // Map to enriched format with real data
            const enriched = this.mapToEnrichedFormat(campaign, analytics, null, analyticsOverview);
            
            console.log(`✅ Campaign "${enriched.name}" processed:`, {
              status: enriched.status,
              totalContacted: enriched.totalContacted,
              openRate: enriched.openRate,
              emailsSent: enriched.emailsSent,
              leadsReady: enriched.leadsReady
            });
            
            return enriched;
            
          } catch (error) {
            console.warn(`⚠️ Error enriching campaign ${campaign.id}:`, error);
            // Still return the campaign with basic data
            return this.mapToEnrichedFormat(campaign, null, null, null);
          }
        })
      );
      
      console.log(`✅ Successfully processed ${enrichedCampaigns.length} campaigns with real data`);
      return enrichedCampaigns;
      
    } catch (error) {
      console.error('❌ Failed to fetch campaigns:', error);
      throw error; // Don't return fallback, let the UI handle the error
    }
  }

  /**
   * Create fallback campaigns when API is unavailable
   */
  private static getFallbackCampaigns(): EnrichedCampaignData[] {
    console.log('🔄 Using fallback campaign data...');
    
    return Object.entries(INSTANTLY_CAMPAIGNS).map(([, id]) => 
      this.createFallbackCampaign(id)
    );
  }

  /**
   * Create a single fallback campaign
   */
  private static createFallbackCampaign(campaignId: string): EnrichedCampaignData {
    const campaignName = CAMPAIGN_NAMES[campaignId as keyof typeof CAMPAIGN_NAMES] || 'Unknown Campaign';
    
    return {
      id: campaignId,
      name: campaignName,
      status: 'Draft',
      statusColor: '#3b82f6',
      preparation: 50,
      leadsReady: 0,
      emailsSent: 0,
      replies: 0,
      meetings: 0,
      template: this.inferTemplate(campaignName),
      platform: 'Instantly (Fallback)',
      // New analytics fields with default values
      totalContacted: 0,
      openRate: 0,
      clickRate: 0,
      replyRate: 0
    };
  }

  /**
   * Map raw Instantly data to dashboard format
   */
  private static mapToEnrichedFormat(
    details: InstantlyCampaignDetails, 
    analytics?: CampaignAnalytics | null,
    leadsData?: {
      leads: any[];
      analytics: {
        total_leads: number;
        leads_ready: number;
        leads_contacted: number;
      };
    } | null,
    analyticsOverview?: any | null
  ): EnrichedCampaignData {
    
    // Get campaign name from mapping or use API name as fallback
    const campaignName = CAMPAIGN_NAMES[details.id as keyof typeof CAMPAIGN_NAMES] || details.name;
    
    // Map status from numeric to string
    const status = this.mapInstantlyStatus(details.status);
    const statusColor = this.getStatusColor(status);
    
    // Calculate preparation based on campaign completeness
    const preparation = this.calculatePreparation(details);
    
    // Use correct API v2 field names from analytics (prioritize real API data)
    const totalLeads = analytics?.leads_count || details.leads_count || 0;
    const leadsContacted = analytics?.contacted_count || 0;
    const emailsSent = analytics?.emails_sent_count || 0;
    const emailsOpened = analytics?.open_count || 0;
    const emailsReplied = analytics?.reply_count || 0;
    const linkClicks = analytics?.link_click_count || 0;
    const meetingsBooked = analytics?.total_opportunities || 0;
    const bouncedCount = analytics?.bounced_count || 0;
    const unsubscribedCount = analytics?.unsubscribed_count || 0;
    
    // Calculate leads ready: total leads minus contacted, bounced, and unsubscribed
    const leadsReady = Math.max(0, totalLeads - leadsContacted - bouncedCount - unsubscribedCount);
    
    console.log(`📊 Campaign ${details.id} metrics:`, {
      totalLeads,
      leadsReady,
      leadsContacted,
      emailsSent,
      emailsOpened,
      emailsReplied,
      hasLeadsData: !!leadsData,
      hasAnalytics: !!analytics
    });
    
    // Calculate rates using actual API data (avoiding division by zero)
    const openRate = emailsSent > 0 ? Math.round((emailsOpened / emailsSent) * 100) : 0;
    const clickRate = emailsSent > 0 ? Math.round((linkClicks / emailsSent) * 100) : 0; // Use actual click data
    const replyRate = emailsSent > 0 ? Math.round((emailsReplied / emailsSent) * 100) : 0;

    return {
      id: details.id,
      name: campaignName,
      status,
      statusColor,
      preparation,
      leadsReady: leadsReady, // Now using actual leads ready count
      emailsSent: emailsSent,
      replies: emailsReplied,
      meetings: meetingsBooked,
      template: this.inferTemplate(campaignName),
      platform: 'Instantly',
      sequences: details.sequences || [],
      analytics: analytics || undefined,
      rawData: details,
      // New analytics fields
      totalContacted: leadsContacted,
      openRate: openRate,
      clickRate: clickRate,
      replyRate: replyRate
    };
  }

  /**
   * Map Instantly numeric status to string format
   */
  private static mapInstantlyStatus(status: number): 'Draft' | 'Running' | 'Paused' | 'Stopped' | 'Completed' {
    switch(status) {
      case 0: return 'Draft';
      case 1: return 'Running';
      case 2: return 'Paused';
      case 3: return 'Completed';  // FIXED: 3 = Completed, not Stopped
      case 4: return 'Stopped';    // FIXED: 4 = Stopped, not Completed
      default: return 'Draft';
    }
  }

  /**
   * Get status color for UI display
   * Now uses centralized color configuration for consistency
   */
  private static getStatusColor(status: string): string {
    // Map status to valid type and get color from centralized config
    const validStatus = status as 'Draft' | 'Running' | 'Paused' | 'Stopped' | 'Completed';
    return getStatusColorFromConfig(validStatus);
  }

  /**
   * Calculate campaign preparation percentage
   */
  private static calculatePreparation(campaign: InstantlyCampaignDetails): number {
    let completionScore = 0;
    
    // Base score for campaign creation
    completionScore += 20;
    
    // Schedule configuration
    if (campaign.campaign_schedule && Object.keys(campaign.campaign_schedule).length > 0) {
      completionScore += 25;
    }
    
    // Has sequences
    if (campaign.sequences && campaign.sequences.length > 0) {
      completionScore += 30;
    }
    
    // Has leads
    if (campaign.leads_count && campaign.leads_count > 0) {
      completionScore += 15;
    }
    
    // Campaign status
    if (campaign.status === 1) { // Running
      completionScore += 10;
    } else if (campaign.status === 4) { // Completed
      completionScore = 100;
    }
    
    return Math.min(completionScore, 100);
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
   * Get single campaign by ID (for sequence viewer)
   */
  static async getSingleCampaign(campaignId: string): Promise<EnrichedCampaignData | null> {
    try {
      const [details, analytics, leadsData, analyticsOverview] = await Promise.all([
        this.getCampaignDetails(campaignId),
        this.getCampaignAnalytics(campaignId),
        this.getCampaignLeads(campaignId),
        this.getCampaignAnalyticsOverview(campaignId)
      ]);
      
      if (!details) {
        return null;
      }
      
      return this.mapToEnrichedFormat(details, analytics, leadsData, analyticsOverview);
      
    } catch (error) {
      console.error(`❌ Failed to fetch single campaign ${campaignId}:`, error);
      return null;
    }
  }
}

export default InstantlyCampaignService;