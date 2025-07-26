/*
  # LeadGen Dashboard Database Schema

  1. New Tables
    - `campaigns` - Store campaign information and settings
    - `leads` - Store all lead data from Apollo/LinkedIn
    - `campaign_leads` - Junction table linking campaigns to leads
    - `automation_jobs` - Track n8n automation job status
    - `lead_activities` - Track all lead interactions and status changes
    - `templates` - Store email/LinkedIn message templates
    - `integrations` - Store API keys and integration settings

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Secure API key storage with encryption

  3. Indexes
    - Performance indexes for common queries
    - Full-text search capabilities
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('email', 'linkedin')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'active', 'paused', 'completed')),
  source_platform text NOT NULL CHECK (source_platform IN ('apollo', 'sales_navigator', 'linkedin', 'website')),
  target_audience_url text,
  leads_limit integer DEFAULT 100,
  template_id uuid,
  automation_settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  company text,
  position text,
  linkedin_url text,
  source text NOT NULL CHECK (source IN ('apollo', 'sales_navigator', 'linkedin', 'website', 'manual')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'replied', 'qualified', 'converted', 'unqualified')),
  raw_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Campaign-Leads junction table
CREATE TABLE IF NOT EXISTS campaign_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'opened', 'replied', 'bounced', 'unsubscribed')),
  sent_at timestamptz,
  opened_at timestamptz,
  replied_at timestamptz,
  meeting_booked_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, lead_id)
);

-- Automation jobs tracking
CREATE TABLE IF NOT EXISTS automation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  job_type text NOT NULL CHECK (job_type IN ('lead_scraping', 'email_sending', 'linkedin_outreach', 'follow_up')),
  n8n_execution_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  progress integer DEFAULT 0,
  total_items integer DEFAULT 0,
  error_message text,
  result_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Lead activities tracking
CREATE TABLE IF NOT EXISTS lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN ('email_sent', 'email_opened', 'email_replied', 'linkedin_connection', 'linkedin_message', 'meeting_booked', 'status_change')),
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('email', 'linkedin')),
  subject text,
  content text NOT NULL,
  variables jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Integrations table (encrypted API keys)
CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('apollo', 'instantly', 'lemlist', 'heyreach', 'sales_navigator')),
  api_key_encrypted text,
  settings jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Enable Row Level Security
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own campaigns"
  ON campaigns FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own leads"
  ON leads FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can access their campaign leads"
  ON campaign_leads FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns 
      WHERE campaigns.id = campaign_leads.campaign_id 
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access their automation jobs"
  ON automation_jobs FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can access their lead activities"
  ON lead_activities FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leads 
      WHERE leads.id = lead_activities.lead_id 
      AND leads.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own templates"
  ON templates FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own integrations"
  ON integrations FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_campaign_leads_campaign_id ON campaign_leads(campaign_id);
CREATE INDEX idx_campaign_leads_lead_id ON campaign_leads(lead_id);
CREATE INDEX idx_automation_jobs_status ON automation_jobs(status);
CREATE INDEX idx_lead_activities_lead_id ON lead_activities(lead_id);

-- Full-text search index for leads
CREATE INDEX idx_leads_search ON leads USING gin(
  (name || ' ' || COALESCE(email, '') || ' ' || COALESCE(company, '') || ' ' || COALESCE(position, '')) gin_trgm_ops
);

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_automation_jobs_updated_at BEFORE UPDATE ON automation_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();