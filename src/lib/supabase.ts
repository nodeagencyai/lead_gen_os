import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate required Supabase environment variables
if (!supabaseUrl) {
  throw new Error('🚨 SECURITY ERROR: VITE_SUPABASE_URL environment variable is missing. Please check your .env file.');
}

if (!supabaseAnonKey) {
  throw new Error('🚨 SECURITY ERROR: VITE_SUPABASE_ANON_KEY environment variable is missing. Please check your .env file.');
}

// Additional validation for URL format
if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
  throw new Error('🚨 SECURITY ERROR: Invalid Supabase URL format. Expected: https://your-project.supabase.co');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  type: 'email' | 'linkedin';
  status: 'draft' | 'ready' | 'active' | 'paused' | 'completed';
  source_platform: 'apollo' | 'sales_navigator' | 'linkedin' | 'website';
  target_audience_url?: string;
  leads_limit: number;
  template_id?: string;
  automation_settings: Record<string, any>;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface Lead {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  linkedin_url?: string;
  source: 'apollo' | 'sales_navigator' | 'linkedin' | 'website' | 'manual';
  status: 'new' | 'contacted' | 'replied' | 'qualified' | 'converted' | 'unqualified';
  raw_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CampaignLead {
  id: string;
  campaign_id: string;
  lead_id: string;
  status: 'pending' | 'sent' | 'opened' | 'replied' | 'bounced' | 'unsubscribed';
  sent_at?: string;
  opened_at?: string;
  replied_at?: string;
  meeting_booked_at?: string;
  created_at: string;
}

export interface AutomationJob {
  id: string;
  user_id: string;
  campaign_id: string;
  job_type: 'lead_scraping' | 'email_sending' | 'linkedin_outreach' | 'follow_up';
  n8n_execution_id?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  total_items: number;
  error_message?: string;
  result_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  campaign_id: string;
  activity_type: 'email_sent' | 'email_opened' | 'email_replied' | 'linkedin_connection' | 'linkedin_message' | 'meeting_booked' | 'status_change';
  details: Record<string, any>;
  created_at: string;
}

export interface Template {
  id: string;
  user_id: string;
  name: string;
  type: 'email' | 'linkedin';
  subject?: string;
  content: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Integration {
  id: string;
  user_id: string;
  platform: 'apollo' | 'instantly' | 'lemlist' | 'heyreach' | 'sales_navigator';
  api_key_encrypted?: string;
  settings: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}