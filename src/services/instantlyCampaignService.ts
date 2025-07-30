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
   * Debug method to test API connectivity and campaign existence
   */
  static async debugCampaignAccess(campaignId: string): Promise<void> {
    console.log(`🧪 DEBUG: Testing API access for campaign ${campaignId}...`);
    
    try {
      // First, test if we can get the campaigns list
      console.log(`📋 Testing campaigns list endpoint...`);
      const campaignsResult = await apiClient.instantly('/campaigns');
      
      if (campaignsResult.error) {
        console.error(`❌ Campaigns list failed:`, campaignsResult.error);
      } else {
        const allCampaigns = (campaignsResult.data as any)?.items || campaignsResult.data || [];
        console.log(`✅ Found ${allCampaigns.length} total campaigns`);
        
        // Check if our specific campaign exists
        const specificCampaign = allCampaigns.find((c: any) => c.id === campaignId);
        if (specificCampaign) {
          console.log(`✅ Campaign ${campaignId} found in campaigns list:`, {
            id: specificCampaign.id,
            name: specificCampaign.name,
            status: specificCampaign.status,
            keys: Object.keys(specificCampaign)
          });
        } else {
          console.warn(`⚠️ Campaign ${campaignId} NOT found in campaigns list`);
          console.log(`Available campaign IDs:`, allCampaigns.map((c: any) => c.id));
        }
      }
      
      // Then test direct campaign access
      console.log(`🎯 Testing direct campaign access...`);
      const directResult = await apiClient.instantly(`/campaigns/${campaignId}`);
      
      if (directResult.error) {
        console.error(`❌ Direct campaign access failed:`, directResult.error);
      } else {
        console.log(`✅ Direct campaign access successful`);
        console.log(`📋 Campaign keys:`, Object.keys(directResult.data || {}));
      }
      
    } catch (error) {
      console.error(`❌ Debug test failed:`, error);
    }
  }
  
  /**
   * Fetch specific campaign details from Instantly API
   */
  static async getCampaignDetails(campaignId: string): Promise<InstantlyCampaignDetails | null> {
    try {
      console.log(`🔄 Fetching campaign details for ${campaignId}...`);
      
      // Use existing API endpoint
      const result = await apiClient.instantly(`/campaigns/${campaignId}`);
      
      if (result.error) {
        console.error(`❌ Failed to fetch campaign ${campaignId}:`, result.error);
        return null;
      }
      
      console.log(`✅ Campaign ${campaignId} details fetched successfully`);
      console.log(`📋 Campaign details keys:`, Object.keys(result.data || {}));
      
      // Log any sequence-related fields found in campaign details
      const data = result.data as any;
      const sequenceKeys = Object.keys(data || {}).filter(key => 
        key.toLowerCase().includes('sequence') || 
        key.toLowerCase().includes('step') || 
        key.toLowerCase().includes('template') ||
        key.toLowerCase().includes('workflow')
      );
      
      if (sequenceKeys.length > 0) {
        console.log(`🎯 Found sequence-related keys in campaign details:`, sequenceKeys);
        sequenceKeys.forEach(key => {
          const value = data[key];
          console.log(`📝 ${key}:`, Array.isArray(value) ? `Array with ${value.length} items` : typeof value);
        });
      } else {
        console.log(`⚠️ No sequence-related keys found in campaign details`);
      }
      
      return result.data;
      
    } catch (error) {
      console.error(`❌ Error fetching campaign ${campaignId}:`, error);
      return null;
    }
  }

  /**
   * Fetch campaign analytics from Instantly API v2
   */
  static async getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics | null> {
    try {
      console.log(`📊 Fetching analytics for campaign ${campaignId}...`);
      
      // Use existing API endpoint (v1 for now)
      const result = await apiClient.instantly(`/campaigns/${campaignId}/analytics`);
      
      if (result.error) {
        console.warn(`⚠️ Analytics not available for campaign ${campaignId}:`, result.error);
        return null;
      }
      
      console.log(`✅ Analytics for campaign ${campaignId} fetched successfully`);
      return result.data;
      
    } catch (error) {
      console.error(`❌ Error fetching analytics for campaign ${campaignId}:`, error);
      return null;
    }
  }

  /**
   * Fetch enhanced sequence data with campaign context
   */
  static async getEnhancedSequenceData(campaignId: string): Promise<{
    sequences: any[];
    campaignInfo: any;
    analytics: any;
  }> {
    try {
      console.log(`🔍 Fetching enhanced sequence data for campaign ${campaignId}...`);
      
      // First run debug to understand API responses
      await this.debugCampaignAccess(campaignId);
      
      // Fetch campaign details, sequences, and analytics in parallel
      const [campaignDetails, analytics] = await Promise.all([
        this.getCampaignDetails(campaignId),
        this.getCampaignAnalytics(campaignId)
      ]);
      
      let sequences: any[] = [];
      
      // Try multiple API endpoints to get sequence data
      if (campaignDetails?.sequences && campaignDetails.sequences.length > 0) {
        sequences = campaignDetails.sequences;
        console.log(`✅ Found ${sequences.length} sequences in campaign details`);
      } else {
        console.log(`🔍 Trying multiple endpoints to fetch sequences for campaign ${campaignId}...`);
        
        // Based on Instantly API v1/v2, try these endpoints for sequence data
        const endpointsToTry = [
          `/campaigns/${campaignId}`, // Full campaign details (most likely to have sequences)
          `/campaigns/analytics/steps?id=${campaignId}`, // Step-by-step analytics
          `/campaigns/${campaignId}/sequences`, // Direct sequences (if exists)
          `/campaigns/${campaignId}/steps`, // Campaign steps
          `/campaigns/${campaignId}/templates`, // Email templates
          `/campaigns/${campaignId}/workflow`, // Workflow/sequence data
          `/campaigns/${campaignId}/funnel` // Funnel steps
        ];
        
        for (const endpoint of endpointsToTry) {
          console.log(`📡 Trying endpoint: ${endpoint}`);
          const result = await apiClient.instantly(endpoint);
          
          if (!result.error && result.data) {
            console.log(`📋 Response from ${endpoint}:`, JSON.stringify(result.data, null, 2));
            
            const data = result.data as any; // Type assertion for API response
            
            // Handle different possible response structures from Instantly API
            if (Array.isArray(data)) {
              sequences = data;
              console.log(`📝 Found array response with ${data.length} items`);
            } else if (data.sequences && Array.isArray(data.sequences)) {
              sequences = data.sequences;
              console.log(`📝 Found sequences array with ${data.sequences.length} items`);
            } else if (data.steps && Array.isArray(data.steps)) {
              sequences = data.steps;
              console.log(`📝 Found steps array with ${data.steps.length} items`);
            } else if (data.templates && Array.isArray(data.templates)) {
              sequences = data.templates;
              console.log(`📝 Found templates array with ${data.templates.length} items`);
            } else if (data.items && Array.isArray(data.items)) {
              sequences = data.items;
              console.log(`📝 Found paginated items with ${data.items.length} items`);
            } else if (data.workflow && Array.isArray(data.workflow)) {
              sequences = data.workflow;
              console.log(`📝 Found workflow array with ${data.workflow.length} items`);
            } else if (data.funnel && Array.isArray(data.funnel)) {
              sequences = data.funnel;
              console.log(`📝 Found funnel array with ${data.funnel.length} items`);
            } else if (data.sequence_steps && Array.isArray(data.sequence_steps)) {
              sequences = data.sequence_steps;
              console.log(`📝 Found sequence_steps array with ${data.sequence_steps.length} items`);
            } else if (data.sequenceSteps && Array.isArray(data.sequenceSteps)) {
              sequences = data.sequenceSteps;
              console.log(`📝 Found sequenceSteps array with ${data.sequenceSteps.length} items`);
            } else if (data.campaign_sequences && Array.isArray(data.campaign_sequences)) {
              sequences = data.campaign_sequences;
              console.log(`📝 Found campaign_sequences array with ${data.campaign_sequences.length} items`);
            } else {
              // Log all available keys in the response to help debug
              console.log(`📋 Available keys in response:`, Object.keys(data));
              console.log(`🔍 Looking for sequence-related data in response structure...`);
              
              // Check for any keys that might contain sequence data
              const possibleSequenceKeys = Object.keys(data).filter(key => 
                key.toLowerCase().includes('sequence') || 
                key.toLowerCase().includes('step') || 
                key.toLowerCase().includes('template') ||
                key.toLowerCase().includes('workflow') ||
                key.toLowerCase().includes('funnel')
              );
              
              if (possibleSequenceKeys.length > 0) {
                console.log(`🎯 Found potential sequence keys:`, possibleSequenceKeys);
                for (const key of possibleSequenceKeys) {
                  const value = data[key];
                  if (Array.isArray(value) && value.length > 0) {
                    console.log(`✅ Using key "${key}" with ${value.length} items`);
                    sequences = value;
                    break;
                  }
                }
              }
            }
            
            if (sequences.length > 0) {
              console.log(`✅ Found ${sequences.length} sequences via endpoint: ${endpoint}`);
              console.log(`📝 First sequence sample:`, JSON.stringify(sequences[0], null, 2));
              break;
            } else {
              console.log(`⚪ No sequences in response structure from ${endpoint}`);
            }
          } else {
            console.log(`❌ Endpoint ${endpoint} failed:`, result.error);
          }
        }
      }
      
      // If no sequences found, log warning but don't create fake data
      if (sequences.length === 0) {
        console.warn(`⚠️ No sequences found in Instantly API for campaign ${campaignId}`);
        console.log('This likely means:');
        console.log('1. Campaign exists but has no sequences configured in Instantly');
        console.log('2. API endpoint may not be available');
        console.log('3. Campaign is in draft status with no sequences set up yet');
      }
      
      console.log(`✅ Enhanced sequence data prepared for campaign ${campaignId}:`, {
        sequenceCount: sequences.length,
        hasCampaignInfo: !!campaignDetails,
        hasAnalytics: !!analytics
      });
      
      return {
        sequences,
        campaignInfo: campaignDetails,
        analytics
      };
      
    } catch (error) {
      console.error(`❌ Error fetching enhanced sequence data for campaign ${campaignId}:`, error);
      return {
        sequences: [],
        campaignInfo: null,
        analytics: null
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