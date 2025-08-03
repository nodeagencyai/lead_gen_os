/**
 * Lead Processing Cost Tracker
 * 
 * Handles the specific workflow:
 * 1. Lead processing with OpenRouter personalization
 * 2. Storing leads in database
 * 3. Pushing to Instantly/HeyReach
 * 4. Tracking actual email sends and meeting conversions
 */

import { openRouterCostTracker } from './OpenRouterCostTracker';
import { dashboardCostService } from './DashboardCostService';
import { supabase } from '../lib/supabase';

interface LeadProcessingCost {
  leadId: string;
  campaignId: string;
  personalizationCost: number;
  tokensUsed: number;
  model: string;
  generationId: string;
  processedAt: Date;
  sentAt?: Date;
  meetingBookedAt?: Date;
}

interface CostAllocation {
  totalPersonalizationCost: number;
  leadsProcessed: number;
  leadsActuallySent: number;
  costPerLeadProcessed: number;
  costPerEmailSent: number;
  costPerMeeting: number;
  wastedPersonalizationCost: number; // Leads processed but never sent
}

export class LeadProcessingCostTracker {
  private static instance: LeadProcessingCostTracker;

  private constructor() {}

  static getInstance(): LeadProcessingCostTracker {
    if (!LeadProcessingCostTracker.instance) {
      LeadProcessingCostTracker.instance = new LeadProcessingCostTracker();
    }
    return LeadProcessingCostTracker.instance;
  }

  /**
   * Track cost when processing a lead with OpenRouter personalization
   */
  async trackLeadPersonalization(
    leadId: string,
    campaignId: string,
    personalizationPrompt: string,
    model: string = 'anthropic/claude-3-haiku'
  ): Promise<{ content: string; cost: number; tokensUsed: number }> {
    try {
      console.log(`📝 Processing lead personalization: ${leadId}`);

      // Make the OpenRouter API call for personalization
      const response = await openRouterCostTracker.makeTrackedRequest(
        [{ role: 'user', content: personalizationPrompt }],
        model,
        {
          campaignId,
          emailId: leadId,
          purpose: 'personalization',
          additionalData: {
            leadId,
            workflowStep: 'lead_processing'
          }
        }
      );

      const content = response.choices[0]?.message?.content || '';
      const tokensUsed = response.usage?.total_tokens || 0;
      
      // Get the actual cost from OpenRouter (this will be stored automatically by the tracker)
      // For immediate feedback, we'll estimate the cost
      const estimatedCost = this.estimatePersonalizationCost(tokensUsed, model);

      // Store lead processing cost relationship
      await this.storeLeadProcessingCost({
        leadId,
        campaignId,
        personalizationCost: estimatedCost,
        tokensUsed,
        model,
        generationId: response.id,
        processedAt: new Date()
      });

      console.log(`✅ Lead ${leadId} personalized - Cost: €${estimatedCost.toFixed(4)}, Tokens: ${tokensUsed}`);

      return {
        content,
        cost: estimatedCost,
        tokensUsed
      };

    } catch (error) {
      console.error('❌ Failed to track lead personalization:', error);
      throw error;
    }
  }

  /**
   * Track when a personalized lead is actually sent via Instantly/HeyReach
   */
  async trackLeadSent(
    leadId: string,
    campaignId: string,
    platform: 'instantly' | 'heyreach'
  ): Promise<void> {
    try {
      console.log(`📧 Tracking lead sent: ${leadId} via ${platform}`);

      // Update the lead processing record to mark as sent
      const { error } = await supabase
        .from('lead_processing_costs')
        .update({ 
          sent_at: new Date(),
          platform_used: platform 
        })
        .eq('lead_id', leadId);

      if (error) {
        console.error('Failed to update lead sent status:', error);
      }

      // Record the email activity for overall cost calculation
      await dashboardCostService.recordActivity({
        type: 'email_sent',
        campaignId,
        metadata: {
          leadId,
          platform,
          hasPersonalization: true
        }
      });

      console.log(`✅ Lead ${leadId} marked as sent`);

    } catch (error) {
      console.error('❌ Failed to track lead sent:', error);
    }
  }

  /**
   * Track when a lead converts to a meeting
   */
  async trackLeadConversion(
    leadId: string,
    campaignId: string,
    meetingValue?: number
  ): Promise<void> {
    try {
      console.log(`🎯 Tracking lead conversion: ${leadId}`);

      // Update the lead processing record
      const { error } = await supabase
        .from('lead_processing_costs')
        .update({ 
          meeting_booked_at: new Date(),
          meeting_value: meetingValue 
        })
        .eq('lead_id', leadId);

      if (error) {
        console.error('Failed to update lead conversion:', error);
      }

      // Record the meeting activity
      await dashboardCostService.recordActivity({
        type: 'meeting_booked',
        campaignId,
        metadata: {
          leadId,
          meetingValue,
          hasPersonalization: true
        }
      });

      console.log(`✅ Lead ${leadId} converted to meeting`);

    } catch (error) {
      console.error('❌ Failed to track lead conversion:', error);
    }
  }

  /**
   * Get cost allocation analysis for a campaign
   */
  async getCostAllocation(campaignId: string, days = 30): Promise<CostAllocation> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get lead processing costs for the period
      const { data: leadCosts, error } = await supabase
        .from('lead_processing_costs')
        .select('*')
        .eq('campaign_id', campaignId)
        .gte('processed_at', startDate.toISOString())
        .lte('processed_at', endDate.toISOString());

      if (error) {
        throw error;
      }

      if (!leadCosts || leadCosts.length === 0) {
        return {
          totalPersonalizationCost: 0,
          leadsProcessed: 0,
          leadsActuallySent: 0,
          costPerLeadProcessed: 0,
          costPerEmailSent: 0,
          costPerMeeting: 0,
          wastedPersonalizationCost: 0
        };
      }

      // Calculate metrics
      const totalPersonalizationCost = leadCosts.reduce((sum, lead) => sum + (lead.personalization_cost || 0), 0);
      const leadsProcessed = leadCosts.length;
      const leadsActuallySent = leadCosts.filter(lead => lead.sent_at).length;
      const meetingsBooked = leadCosts.filter(lead => lead.meeting_booked_at).length;
      const wastedLeads = leadCosts.filter(lead => !lead.sent_at).length;
      const wastedPersonalizationCost = leadCosts
        .filter(lead => !lead.sent_at)
        .reduce((sum, lead) => sum + (lead.personalization_cost || 0), 0);

      return {
        totalPersonalizationCost,
        leadsProcessed,
        leadsActuallySent,
        costPerLeadProcessed: leadsProcessed > 0 ? totalPersonalizationCost / leadsProcessed : 0,
        costPerEmailSent: leadsActuallySent > 0 ? totalPersonalizationCost / leadsActuallySent : 0,
        costPerMeeting: meetingsBooked > 0 ? totalPersonalizationCost / meetingsBooked : 0,
        wastedPersonalizationCost
      };

    } catch (error) {
      console.error('❌ Failed to get cost allocation:', error);
      throw error;
    }
  }

  /**
   * Get detailed cost breakdown for dashboard
   */
  async getDetailedCostBreakdown(days = 30): Promise<any> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get all personalization costs
      const { data: allCosts, error } = await supabase
        .from('lead_processing_costs')
        .select('*')
        .gte('processed_at', startDate.toISOString())
        .lte('processed_at', endDate.toISOString());

      if (error) throw error;

      // Group by campaign
      const campaignBreakdown = (allCosts || []).reduce((acc: any, cost: any) => {
        if (!acc[cost.campaign_id]) {
          acc[cost.campaign_id] = {
            campaignId: cost.campaign_id,
            totalPersonalizationCost: 0,
            leadsProcessed: 0,
            leadsActuallySent: 0,
            meetingsBooked: 0,
            wastedCost: 0
          };
        }

        const campaign = acc[cost.campaign_id];
        campaign.totalPersonalizationCost += cost.personalization_cost || 0;
        campaign.leadsProcessed += 1;
        
        if (cost.sent_at) {
          campaign.leadsActuallySent += 1;
        } else {
          campaign.wastedCost += cost.personalization_cost || 0;
        }
        
        if (cost.meeting_booked_at) {
          campaign.meetingsBooked += 1;
        }

        return acc;
      }, {});

      return {
        totalLeadsProcessed: allCosts?.length || 0,
        totalPersonalizationCost: (allCosts || []).reduce((sum, cost) => sum + (cost.personalization_cost || 0), 0),
        totalWastedCost: (allCosts || []).filter(cost => !cost.sent_at).reduce((sum, cost) => sum + (cost.personalization_cost || 0), 0),
        campaignBreakdown: Object.values(campaignBreakdown)
      };

    } catch (error) {
      console.error('❌ Failed to get detailed cost breakdown:', error);
      throw error;
    }
  }

  /**
   * Store lead processing cost data
   */
  private async storeLeadProcessingCost(costData: LeadProcessingCost): Promise<void> {
    const { error } = await supabase
      .from('lead_processing_costs')
      .insert({
        lead_id: costData.leadId,
        campaign_id: costData.campaignId,
        personalization_cost: costData.personalizationCost,
        tokens_used: costData.tokensUsed,
        model: costData.model,
        generation_id: costData.generationId,
        processed_at: costData.processedAt
      });

    if (error) {
      console.error('Failed to store lead processing cost:', error);
      throw error;
    }
  }

  /**
   * Estimate personalization cost based on tokens and model
   */
  private estimatePersonalizationCost(tokens: number, model: string): number {
    // Model pricing per 1M tokens (in USD)
    const modelPricing: Record<string, number> = {
      'anthropic/claude-3-haiku': 0.25,
      'anthropic/claude-3-sonnet': 3.00,
      'openai/gpt-3.5-turbo': 0.50,
      'openai/gpt-4-turbo': 10.00
    };

    const pricePerMillion = modelPricing[model] || modelPricing['anthropic/claude-3-haiku'];
    const costUSD = (tokens / 1_000_000) * pricePerMillion;
    const costEUR = costUSD * 0.92; // Convert to EUR

    return costEUR;
  }
}

// Export singleton instance
export const leadProcessingCostTracker = LeadProcessingCostTracker.getInstance();