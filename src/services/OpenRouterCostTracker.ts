/**
 * OpenRouterCostTracker Service
 * 
 * This service wraps all OpenRouter API calls with automatic cost tracking.
 * It stores usage data in the database and provides analytics methods.
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';

interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  provider?: {
    order?: string[];
    require_parameters?: boolean;
  };
  metadata?: Record<string, any>;
}

interface OpenRouterResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  choices: Array<{
    message: OpenRouterMessage;
    finish_reason: string;
    index: number;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  x_groq?: {
    id: string;
  };
}

interface GenerationInfo {
  id: string;
  total_cost: number;
  native_tokens_prompt: number;
  native_tokens_completion: number;
  native_tokens_total: number;
  usage: string;
}

interface CostMetadata {
  campaignId?: string;
  emailId?: string;
  purpose?: 'email_generation' | 'subject_line' | 'personalization' | 'follow_up' | 'other';
  additionalData?: Record<string, any>;
}

export class OpenRouterCostTracker {
  private apiKey: string;
  private baseURL: string;
  private axiosInstance: AxiosInstance;
  private retryDelay = 1000; // Initial retry delay in ms
  private maxRetries = 3;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.baseURL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }

    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'https://lead-gen-os.vercel.app',
        'X-Title': 'Lead Gen OS'
      }
    });
  }

  /**
   * Make a tracked request to OpenRouter API
   */
  async makeTrackedRequest(
    messages: OpenRouterMessage[],
    model: string = 'anthropic/claude-3-haiku',
    metadata?: CostMetadata
  ): Promise<OpenRouterResponse> {
    const requestId = uuidv4();
    
    try {
      // Prepare request with tracking
      const request: OpenRouterRequest = {
        model,
        messages,
        stream: false,
        metadata: {
          ...metadata?.additionalData,
          requestId,
          timestamp: new Date().toISOString()
        }
      };

      // Make the API request with retry logic
      const response = await this.makeRequestWithRetry(request);
      
      // Store cost data asynchronously (don't block the response)
      this.storeCostData(response.data, metadata, model).catch(error => {
        console.error('Failed to store cost data:', error);
      });

      return response.data;
    } catch (error) {
      console.error('OpenRouter API request failed:', error);
      throw error;
    }
  }

  /**
   * Make request with exponential backoff retry
   */
  private async makeRequestWithRetry(
    request: OpenRouterRequest,
    attempt = 1
  ): Promise<any> {
    try {
      const response = await this.axiosInstance.post('/chat/completions', request);
      return response;
    } catch (error: any) {
      if (attempt >= this.maxRetries) {
        throw error;
      }

      // Check if error is retryable
      const status = error.response?.status;
      if (status === 429 || status >= 500) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.log(`Retrying OpenRouter request after ${delay}ms (attempt ${attempt}/${this.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequestWithRetry(request, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Get generation cost from OpenRouter
   */
  async getGenerationCost(generationId: string): Promise<GenerationInfo | null> {
    try {
      const response = await this.axiosInstance.get(`/generation?id=${generationId}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to get generation cost:', error);
      return null;
    }
  }

  /**
   * Store cost data in database
   */
  private async storeCostData(
    response: OpenRouterResponse,
    metadata?: CostMetadata,
    model?: string
  ): Promise<void> {
    try {
      const generationId = response.id;
      
      // Get detailed cost information
      const generationInfo = await this.getGenerationCost(generationId);
      
      // Prepare usage data
      const usageData = {
        generation_id: generationId,
        campaign_id: metadata?.campaignId || null,
        email_id: metadata?.emailId || null,
        model: model || response.model,
        prompt_tokens: response.usage?.prompt_tokens || generationInfo?.native_tokens_prompt || 0,
        completion_tokens: response.usage?.completion_tokens || generationInfo?.native_tokens_completion || 0,
        total_tokens: response.usage?.total_tokens || generationInfo?.native_tokens_total || 0,
        cost_usd: generationInfo?.total_cost || this.estimateCost(response.usage, model),
        purpose: metadata?.purpose || 'other',
        metadata: metadata?.additionalData || {},
        created_at: new Date()
      };

      // Store in database
      const { error } = await supabase
        .from('openrouter_usage')
        .insert(usageData);

      if (error) {
        console.error('Failed to insert usage data:', error);
        return;
      }

      // Update monthly summary
      await this.updateMonthlySummary(usageData.cost_usd);
      
    } catch (error) {
      console.error('Failed to store cost data:', error);
    }
  }

  /**
   * Estimate cost based on token usage and model
   */
  private estimateCost(
    usage?: { prompt_tokens: number; completion_tokens: number },
    model?: string
  ): number {
    if (!usage) return 0;

    // Model pricing per 1M tokens (approximate)
    const modelPricing: Record<string, { input: number; output: number }> = {
      'anthropic/claude-3-haiku': { input: 0.25, output: 1.25 },
      'anthropic/claude-3-sonnet': { input: 3.00, output: 15.00 },
      'anthropic/claude-3-opus': { input: 15.00, output: 75.00 },
      'openai/gpt-4-turbo': { input: 10.00, output: 30.00 },
      'openai/gpt-3.5-turbo': { input: 0.50, output: 1.50 },
      'google/gemini-pro': { input: 0.50, output: 1.50 },
      'meta-llama/llama-3-70b': { input: 0.70, output: 0.90 }
    };

    const pricing = modelPricing[model || 'anthropic/claude-3-haiku'] || modelPricing['anthropic/claude-3-haiku'];
    
    const inputCost = (usage.prompt_tokens / 1_000_000) * pricing.input;
    const outputCost = (usage.completion_tokens / 1_000_000) * pricing.output;
    
    return inputCost + outputCost;
  }

  /**
   * Update monthly summary with new cost
   */
  private async updateMonthlySummary(costUSD: number): Promise<void> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // JavaScript months are 0-indexed

    try {
      // Get current monthly costs
      const { data: currentMonth, error: fetchError } = await supabase
        .from('monthly_costs')
        .select('*')
        .eq('year', year)
        .eq('month', month)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // Not found is okay
        console.error('Failed to fetch monthly costs:', fetchError);
        return;
      }

      // Calculate new values
      const newOpenRouterCost = (currentMonth?.openrouter_cost || 0) + costUSD;
      const fixedCosts = 75 + 48; // Instantly + Google Workspace
      const totalCost = fixedCosts + newOpenRouterCost;

      if (currentMonth) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('monthly_costs')
          .update({
            openrouter_cost: newOpenRouterCost,
            total_cost: totalCost,
            updated_at: new Date()
          })
          .eq('id', currentMonth.id);

        if (updateError) {
          console.error('Failed to update monthly costs:', updateError);
        }
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('monthly_costs')
          .insert({
            year,
            month,
            openrouter_cost: costUSD,
            total_cost: totalCost
          });

        if (insertError) {
          console.error('Failed to insert monthly costs:', insertError);
        }
      }
    } catch (error) {
      console.error('Failed to update monthly summary:', error);
    }
  }

  /**
   * Get current month costs
   */
  async getCurrentMonthCosts(): Promise<any> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const { data, error } = await supabase
      .from('monthly_costs')
      .select('*')
      .eq('year', year)
      .eq('month', month)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // Return default values if no data exists
    return data || {
      year,
      month,
      instantly_cost: 75,
      google_workspace_cost: 48,
      openrouter_cost: 0,
      total_cost: 123,
      emails_sent: 0,
      meetings_booked: 0,
      cost_per_email: 0,
      cost_per_meeting: 0
    };
  }

  /**
   * Get usage breakdown for a date range
   */
  async getUsageBreakdown(startDate: Date, endDate: Date): Promise<any> {
    const { data, error } = await supabase
      .from('openrouter_usage')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Calculate breakdown by purpose
    const breakdown = data.reduce((acc: any, usage: any) => {
      const purpose = usage.purpose || 'other';
      if (!acc[purpose]) {
        acc[purpose] = {
          count: 0,
          totalCost: 0,
          totalTokens: 0
        };
      }
      
      acc[purpose].count++;
      acc[purpose].totalCost += usage.cost_usd || 0;
      acc[purpose].totalTokens += usage.total_tokens || 0;
      
      return acc;
    }, {});

    return {
      totalUsage: data.length,
      totalCost: data.reduce((sum, u) => sum + (u.cost_usd || 0), 0),
      totalTokens: data.reduce((sum, u) => sum + (u.total_tokens || 0), 0),
      breakdown,
      details: data
    };
  }

  /**
   * Get remaining OpenRouter credits
   */
  async getRemainingCredits(): Promise<number> {
    try {
      // OpenRouter doesn't provide a direct credits endpoint in their public API
      // This would need to be implemented based on your specific account setup
      // For now, return a placeholder or fetch from your account dashboard
      
      // You might need to:
      // 1. Scrape the dashboard
      // 2. Use a webhook from OpenRouter
      // 3. Track credits manually based on usage
      
      return 100.00; // Placeholder - implement based on your needs
    } catch (error) {
      console.error('Failed to get remaining credits:', error);
      return 0;
    }
  }

  /**
   * Calculate metrics for dashboard
   */
  async calculateMetrics(): Promise<any> {
    const currentMonth = await this.getCurrentMonthCosts();
    
    const costPerEmail = currentMonth.emails_sent > 0 
      ? currentMonth.total_cost / currentMonth.emails_sent 
      : 0;
      
    const costPerMeeting = currentMonth.meetings_booked > 0
      ? currentMonth.total_cost / currentMonth.meetings_booked
      : 0;

    return {
      totalCost: currentMonth.total_cost,
      fixedCosts: currentMonth.instantly_cost + currentMonth.google_workspace_cost,
      variableCosts: currentMonth.openrouter_cost,
      costPerEmail: Math.round(costPerEmail * 100) / 100,
      costPerMeeting: Math.round(costPerMeeting * 100) / 100,
      emailsSent: currentMonth.emails_sent,
      meetingsBooked: currentMonth.meetings_booked
    };
  }
}

// Export singleton instance
export const openRouterCostTracker = new OpenRouterCostTracker();