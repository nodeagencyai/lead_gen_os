/**
 * Instantly Campaign Service - Real Data Integration
 * Fetches actual data from specific Instantly campaigns via API v2
 */

import { apiClient } from '../utils/apiClient';

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
  total_leads: number;
  leads_contacted: number;
  emails_sent: number;
  emails_opened: number;
  emails_replied: number;
  meetings_booked: number;
  bounce_rate: number;
  open_rate: number;
  reply_rate: number;
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
      
      // Use API v2 analytics endpoint
      const result = await apiClient.instantly(`/campaigns/analytics?id=${campaignId}`);
      
      if (result.error) {
        console.warn(`⚠️ Analytics not available for campaign ${campaignId}:`, result.error);
        return null;
      }
      
      console.log(`✅ Analytics for campaign ${campaignId} fetched from API v2`);
      return result.data as CampaignAnalytics;
      
    } catch (error) {
      console.error(`❌ Error fetching analytics for campaign ${campaignId}:`, error);
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
      
      // Use API v2 step analytics endpoint
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
   */
  static async getEnhancedSequenceData(campaignId: string): Promise<{
    sequences: any[];
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
      
      // 3. Combine all parsed sequences
      const allParsedSequences = [...mainSequences, ...followUpSequences];
      
      console.log(`✅ Complete sequence data for campaign ${campaignId}:`, {
        mainSequences: mainSequences.length,
        followUpSequences: followUpSequences.length,
        totalParsedSteps: allParsedSequences.length,
        subsequenceCount: subsequences.length,
        isEmpty: allParsedSequences.length === 0,
        hasCampaignInfo: !!campaignDetails,
        hasAnalytics: !!analytics,
        hasStepAnalytics: !!stepAnalytics
      });
      
      return {
        sequences: allParsedSequences, // Return all parsed sequence steps ready for UI
        campaignInfo: campaignDetails,
        analytics,
        stepAnalytics: stepAnalytics || undefined
      };
      
    } catch (error) {
      console.error(`❌ Error fetching complete sequence data for campaign ${campaignId}:`, error);
      return {
        sequences: [],
        campaignInfo: null,
        analytics: null,
        stepAnalytics: undefined
      };
    }
  }
  

  /**
   * Legacy method for backward compatibility
   */
  static async getCampaignSequences(campaignId: string): Promise<any[] | null> {
    const enhancedData = await this.getEnhancedSequenceData(campaignId);
    return enhancedData.sequences;
  }

  /**
   * Fetch all 3 specific campaigns with complete data
   */
  static async fetchAllCampaigns(): Promise<EnrichedCampaignData[]> {
    console.log('🚀 Fetching all 3 specific Instantly campaigns...');
    
    try {
      // First, get all campaigns using the working endpoint
      console.log('📋 Fetching campaigns list from Instantly...');
      const campaignsResult = await apiClient.instantly('/campaigns');
      
      if (campaignsResult.error) {
        console.error('❌ Failed to fetch campaigns list:', campaignsResult.error);
        return this.getFallbackCampaigns();
      }
      
      const allCampaigns = (campaignsResult.data as any)?.items || campaignsResult.data || [];
      console.log(`📋 Found ${allCampaigns.length} total campaigns from Instantly`);
      
      // Filter for our specific campaign IDs
      const campaignIds = Object.values(INSTANTLY_CAMPAIGNS);
      const specificCampaigns = allCampaigns.filter((campaign: any) => 
        campaignIds.includes(campaign.id)
      );
      
      console.log(`🎯 Found ${specificCampaigns.length}/3 specific campaigns:`, 
        specificCampaigns.map((c: any) => ({ id: c.id, name: c.name }))
      );
      
      // Enrich each campaign with additional data
      const enrichedCampaigns = await Promise.all(
        specificCampaigns.map(async (campaign: any) => {
          try {
            // Try to get analytics for this campaign
            const analytics = await this.getCampaignAnalytics(campaign.id);
            
            // Map to enriched format
            const enriched = this.mapToEnrichedFormat(campaign, analytics);
            console.log(`✅ Campaign "${enriched.name}" processed successfully`);
            return enriched;
            
          } catch (error) {
            console.warn(`⚠️ Error enriching campaign ${campaign.id}:`, error);
            // Still return the campaign without analytics
            return this.mapToEnrichedFormat(campaign, null);
          }
        })
      );
      
      // If we didn't find all 3 campaigns, add fallback campaigns for missing ones
      if (enrichedCampaigns.length < 3) {
        console.log(`⚠️ Only found ${enrichedCampaigns.length}/3 campaigns, adding fallback campaigns`);
        const foundIds = enrichedCampaigns.map((c: any) => c.id);
        const missingIds = campaignIds.filter(id => !foundIds.includes(id));
        
        const fallbackCampaigns = missingIds.map(id => this.createFallbackCampaign(id));
        enrichedCampaigns.push(...fallbackCampaigns);
      }
      
      console.log(`✅ Successfully prepared ${enrichedCampaigns.length} campaigns for dashboard`);
      return enrichedCampaigns;
      
    } catch (error) {
      console.error('❌ Failed to fetch campaigns:', error);
      return this.getFallbackCampaigns();
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
      platform: 'Instantly (Fallback)'
    };
  }

  /**
   * Map raw Instantly data to dashboard format
   */
  private static mapToEnrichedFormat(
    details: InstantlyCampaignDetails, 
    analytics?: CampaignAnalytics | null
  ): EnrichedCampaignData {
    
    // Get campaign name from mapping or use API name as fallback
    const campaignName = CAMPAIGN_NAMES[details.id as keyof typeof CAMPAIGN_NAMES] || details.name;
    
    // Map status from numeric to string
    const status = this.mapInstantlyStatus(details.status);
    const statusColor = this.getStatusColor(status);
    
    // Calculate preparation based on campaign completeness
    const preparation = this.calculatePreparation(details);
    
    // Use analytics if available, otherwise use stats from details
    const stats = analytics || details.stats || {
      total_leads: 0,
      emails_sent: 0,
      emails_opened: 0,
      emails_replied: 0,
      meetings_booked: 0,
      bounce_rate: 0
    };
    
    return {
      id: details.id,
      name: campaignName,
      status,
      statusColor,
      preparation,
      leadsReady: stats.total_leads || details.leads_count || 0,
      emailsSent: stats.emails_sent || 0,
      replies: stats.emails_replied || 0,
      meetings: stats.meetings_booked || 0,
      template: this.inferTemplate(campaignName),
      platform: 'Instantly',
      sequences: details.sequences || [],
      analytics: analytics || undefined,
      rawData: details
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
      case 3: return 'Stopped';
      case 4: return 'Completed';
      default: return 'Draft';
    }
  }

  /**
   * Get status color for UI display
   */
  private static getStatusColor(status: string): string {
    switch(status) {
      case 'Draft': return '#3b82f6';      // Blue
      case 'Running': return '#10b981';    // Green  
      case 'Paused': return '#f59e0b';     // Yellow
      case 'Stopped': return '#ef4444';   // Red
      case 'Completed': return '#6b7280'; // Gray
      default: return '#3b82f6';
    }
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
      const [details, analytics] = await Promise.all([
        this.getCampaignDetails(campaignId),
        this.getCampaignAnalytics(campaignId)
      ]);
      
      if (!details) {
        return null;
      }
      
      return this.mapToEnrichedFormat(details, analytics);
      
    } catch (error) {
      console.error(`❌ Failed to fetch single campaign ${campaignId}:`, error);
      return null;
    }
  }
}

export default InstantlyCampaignService;