import { supabase } from '../lib/supabase';
import type { Campaign, Lead, AutomationJob, CampaignLead } from '../lib/supabase';

// N8N Webhook URLs - Replace with your actual n8n webhook URLs
const N8N_WEBHOOKS = {
  APOLLO_SCRAPING: 'https://your-n8n-instance.com/webhook/apollo-scraping',
  LINKEDIN_SCRAPING: 'https://your-n8n-instance.com/webhook/linkedin-scraping',
  EMAIL_CAMPAIGN: 'https://your-n8n-instance.com/webhook/email-campaign',
  LINKEDIN_OUTREACH: 'https://your-n8n-instance.com/webhook/linkedin-outreach'
};

export class ApiService {
  // Campaign Management
  static async createCampaign(campaignData: Partial<Campaign>): Promise<Campaign> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        ...campaignData,
        user_id: user.user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getCampaigns(): Promise<Campaign[]> {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign> {
    const { data, error } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Lead Management
  static async getLeads(filters?: {
    campaign_id?: string;
    status?: string;
    search?: string;
  }): Promise<Lead[]> {
    let query = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async createLead(leadData: Partial<Lead>): Promise<Lead> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('leads')
      .insert({
        ...leadData,
        user_id: user.user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateLeadStatus(leadId: string, status: Lead['status']): Promise<Lead> {
    const { data, error } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', leadId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // N8N Automation Integration
  static async triggerLeadScraping(campaignId: string, config: {
    type: 'apollo' | 'linkedin';
    url: string;
    limit: number;
  }): Promise<AutomationJob> {
    // Create automation job record
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data: job, error: jobError } = await supabase
      .from('automation_jobs')
      .insert({
        user_id: user.user.id,
        campaign_id: campaignId,
        job_type: 'lead_scraping',
        status: 'pending',
        total_items: config.limit
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // Trigger N8N webhook
    const webhookUrl = config.type === 'apollo' ? N8N_WEBHOOKS.APOLLO_SCRAPING : N8N_WEBHOOKS.LINKEDIN_SCRAPING;
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: job.id,
          campaignId,
          userId: user.user.id,
          config
        })
      });

      if (!response.ok) {
        throw new Error(`N8N webhook failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Update job with N8N execution ID
      await supabase
        .from('automation_jobs')
        .update({
          n8n_execution_id: result.executionId,
          status: 'running'
        })
        .eq('id', job.id);

      return { ...job, n8n_execution_id: result.executionId, status: 'running' };
    } catch (error) {
      // Update job status to failed
      await supabase
        .from('automation_jobs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', job.id);

      throw error;
    }
  }

  static async triggerEmailCampaign(campaignId: string, leadIds: string[]): Promise<AutomationJob> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data: job, error: jobError } = await supabase
      .from('automation_jobs')
      .insert({
        user_id: user.user.id,
        campaign_id: campaignId,
        job_type: 'email_sending',
        status: 'pending',
        total_items: leadIds.length
      })
      .select()
      .single();

    if (jobError) throw jobError;

    try {
      const response = await fetch(N8N_WEBHOOKS.EMAIL_CAMPAIGN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: job.id,
          campaignId,
          userId: user.user.id,
          leadIds
        })
      });

      if (!response.ok) {
        throw new Error(`N8N webhook failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      await supabase
        .from('automation_jobs')
        .update({
          n8n_execution_id: result.executionId,
          status: 'running'
        })
        .eq('id', job.id);

      return { ...job, n8n_execution_id: result.executionId, status: 'running' };
    } catch (error) {
      await supabase
        .from('automation_jobs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', job.id);

      throw error;
    }
  }

  // Job Status Monitoring
  static async getAutomationJobs(campaignId?: string): Promise<AutomationJob[]> {
    let query = supabase
      .from('automation_jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async updateJobProgress(jobId: string, progress: number, status?: AutomationJob['status']): Promise<void> {
    const updates: Partial<AutomationJob> = { progress };
    if (status) updates.status = status;

    const { error } = await supabase
      .from('automation_jobs')
      .update(updates)
      .eq('id', jobId);

    if (error) throw error;
  }

  // Campaign Analytics
  static async getCampaignMetrics(campaignId: string) {
    const { data: campaignLeads, error } = await supabase
      .from('campaign_leads')
      .select(`
        *,
        leads (*)
      `)
      .eq('campaign_id', campaignId);

    if (error) throw error;

    const metrics = {
      totalLeads: campaignLeads?.length || 0,
      sent: campaignLeads?.filter(cl => cl.status === 'sent').length || 0,
      opened: campaignLeads?.filter(cl => cl.status === 'opened').length || 0,
      replied: campaignLeads?.filter(cl => cl.status === 'replied').length || 0,
      meetings: campaignLeads?.filter(cl => cl.meeting_booked_at).length || 0
    };

    return metrics;
  }

  // Real-time subscriptions
  static subscribeToJobUpdates(jobId: string, callback: (job: AutomationJob) => void) {
    return supabase
      .channel(`job-${jobId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'automation_jobs',
        filter: `id=eq.${jobId}`
      }, (payload) => {
        callback(payload.new as AutomationJob);
      })
      .subscribe();
  }

  static subscribeToLeadUpdates(callback: (lead: Lead) => void) {
    return supabase
      .channel('leads-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'leads'
      }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          callback(payload.new as Lead);
        }
      })
      .subscribe();
  }
}