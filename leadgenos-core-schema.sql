-- =====================================================
-- LeadGenOS Core Application Schema - Missing Components
-- =====================================================
-- Run this script in your Supabase SQL Editor AFTER monitoring setup
-- This creates all missing tables required by your frontend application

-- Enable necessary extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. CORE APPLICATION TABLES
-- =====================================================

-- Campaigns table (CRITICAL - referenced throughout frontend)
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('email', 'linkedin')),
    status TEXT NOT NULL CHECK (status IN ('draft', 'ready', 'active', 'paused', 'completed')),
    source_platform TEXT NOT NULL CHECK (source_platform IN ('apollo', 'sales_navigator', 'linkedin', 'website')),
    target_audience_url TEXT,
    leads_limit INTEGER NOT NULL DEFAULT 100,
    template_id UUID,
    automation_settings JSONB DEFAULT '{}',
    instantly_campaign_id TEXT, -- Integration with Instantly.ai
    heyreach_campaign_id TEXT,  -- Integration with HeyReach
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Leads table (CRITICAL - referenced throughout frontend)  
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    position TEXT,
    linkedin_url TEXT,
    source TEXT NOT NULL CHECK (source IN ('apollo', 'sales_navigator', 'linkedin', 'website', 'manual')),
    status TEXT NOT NULL CHECK (status IN ('new', 'contacted', 'replied', 'qualified', 'converted', 'unqualified')),
    raw_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Campaign-Lead junction table (CRITICAL - for campaign analytics)
CREATE TABLE IF NOT EXISTS public.campaign_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'opened', 'replied', 'bounced', 'unsubscribed')) DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    meeting_booked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure unique lead per campaign
    UNIQUE(campaign_id, lead_id)
);

-- Automation Jobs table (for N8N integration)
CREATE TABLE IF NOT EXISTS public.automation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL CHECK (job_type IN ('lead_scraping', 'email_sending', 'linkedin_outreach', 'follow_up')),
    n8n_execution_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    total_items INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    result_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Integrations table (for API key management)
CREATE TABLE IF NOT EXISTS public.integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('apollo', 'instantly', 'lemlist', 'heyreach', 'sales_navigator')),
    api_key_encrypted TEXT, -- Store encrypted API keys
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- One integration per platform per user
    UNIQUE(user_id, platform)
);

-- =====================================================
-- 2. ADD MISSING COLUMNS TO EXISTING TABLES
-- =====================================================

-- Apollo table enhancements (for niche/tag filtering)
ALTER TABLE public.Apollo ADD COLUMN IF NOT EXISTS niche TEXT;
ALTER TABLE public.Apollo ADD COLUMN IF NOT EXISTS tags TEXT[]; -- PostgreSQL array
ALTER TABLE public.Apollo ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.Apollo ADD COLUMN IF NOT EXISTS last_name TEXT;

-- LinkedIn table enhancements (for consistency)
ALTER TABLE public.LinkedIn ADD COLUMN IF NOT EXISTS niche TEXT;
ALTER TABLE public.LinkedIn ADD COLUMN IF NOT EXISTS tags TEXT[]; -- PostgreSQL array
ALTER TABLE public.LinkedIn ADD COLUMN IF NOT EXISTS full_name TEXT;

-- =====================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Campaigns indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON public.campaigns(type);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON public.campaigns(created_at DESC);

-- Leads indexes
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

-- Campaign leads indexes
CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign_id ON public.campaign_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_lead_id ON public.campaign_leads(lead_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_status ON public.campaign_leads(status);

-- Automation jobs indexes
CREATE INDEX IF NOT EXISTS idx_automation_jobs_campaign_id ON public.automation_jobs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_automation_jobs_status ON public.automation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_automation_jobs_user_id ON public.automation_jobs(user_id);

-- Integrations indexes
CREATE INDEX IF NOT EXISTS idx_integrations_user_platform ON public.integrations(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_integrations_active ON public.integrations(is_active) WHERE is_active = true;

-- Enhanced indexes for Apollo/LinkedIn filtering
CREATE INDEX IF NOT EXISTS idx_apollo_niche ON public.Apollo(niche) WHERE niche IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_apollo_tags ON public.Apollo USING GIN(tags) WHERE tags IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_linkedin_niche ON public.LinkedIn(niche) WHERE niche IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_linkedin_tags ON public.LinkedIn USING GIN(tags) WHERE tags IS NOT NULL;

-- =====================================================
-- 4. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- User-scoped access policies
CREATE POLICY "Users can manage own campaigns" ON public.campaigns
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own leads" ON public.leads
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own campaign leads" ON public.campaign_leads
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM public.campaigns WHERE id = campaign_id
        )
    );

CREATE POLICY "Users can manage own integrations" ON public.integrations
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own automation jobs" ON public.automation_jobs
    FOR ALL USING (auth.uid() = user_id);

-- Policies for Apollo/LinkedIn tables (adjust based on your needs)
CREATE POLICY "Authenticated users can access Apollo leads" ON public.Apollo
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can access LinkedIn leads" ON public.LinkedIn
    FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- 5. UPDATED_AT TRIGGERS
-- =====================================================

-- Apply updated_at triggers to new tables
CREATE TRIGGER update_campaigns_updated_at 
    BEFORE UPDATE ON public.campaigns 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at 
    BEFORE UPDATE ON public.leads 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automation_jobs_updated_at 
    BEFORE UPDATE ON public.automation_jobs 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at 
    BEFORE UPDATE ON public.integrations 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

-- Grant permissions for new tables
GRANT ALL ON public.campaigns TO service_role;
GRANT ALL ON public.leads TO service_role;
GRANT ALL ON public.campaign_leads TO service_role;
GRANT ALL ON public.automation_jobs TO service_role;
GRANT ALL ON public.integrations TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.leads TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.campaign_leads TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.automation_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integrations TO authenticated;

-- =====================================================
-- 7. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.campaigns IS 'Main campaigns table for email and LinkedIn outreach campaigns';
COMMENT ON TABLE public.leads IS 'Central leads table for all lead sources and statuses';
COMMENT ON TABLE public.campaign_leads IS 'Junction table tracking lead-campaign relationships and status';
COMMENT ON TABLE public.automation_jobs IS 'Tracks N8N automation job executions and progress';
COMMENT ON TABLE public.integrations IS 'Stores encrypted API keys and settings for external platform integrations';

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 LeadGenOS Core Schema Setup Complete!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Created Core Tables:';
    RAISE NOTICE '   • campaigns (CRITICAL)';
    RAISE NOTICE '   • leads (CRITICAL)';
    RAISE NOTICE '   • campaign_leads (CRITICAL)';
    RAISE NOTICE '   • automation_jobs';
    RAISE NOTICE '   • integrations';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Enhanced Existing Tables:';
    RAISE NOTICE '   • Apollo (added niche, tags, first_name, last_name)';
    RAISE NOTICE '   • LinkedIn (added niche, tags, full_name)';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Security: RLS policies applied to all tables';
    RAISE NOTICE '📈 Performance: Optimized indexes created';
    RAISE NOTICE '✅ Frontend integration ready!';
END $$;