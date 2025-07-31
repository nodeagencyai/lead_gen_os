-- =====================================================
-- LeadGenOS Monitoring System - Supabase Setup Script
-- =====================================================
-- Run this script in your Supabase SQL Editor
-- This will create all monitoring tables, indexes, and policies

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- =====================================================
-- 1. WORKFLOW EXECUTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'partial')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    campaign_name TEXT,
    leads_processed INTEGER,
    error_summary TEXT,
    execution_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for workflow_executions
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_status 
    ON public.workflow_executions(workflow_name, status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_started_at 
    ON public.workflow_executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status_time 
    ON public.workflow_executions(status, started_at DESC);

-- =====================================================
-- 2. WORKFLOW ERRORS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workflow_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
    workflow_name TEXT NOT NULL,
    node_name TEXT NOT NULL,
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    error_details JSONB,
    lead_id UUID,
    lead_name TEXT,
    lead_company TEXT,
    lead_data JSONB,
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')) DEFAULT 'medium',
    occurred_at TIMESTAMPTZ NOT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for workflow_errors
CREATE INDEX IF NOT EXISTS idx_workflow_errors_execution_id 
    ON public.workflow_errors(execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_errors_workflow_occurred 
    ON public.workflow_errors(workflow_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_errors_lead_id 
    ON public.workflow_errors(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_errors_severity 
    ON public.workflow_errors(severity, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_errors_unresolved 
    ON public.workflow_errors(resolved, occurred_at DESC) WHERE resolved = FALSE;

-- =====================================================
-- 3. LEAD PROCESSING STATUS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.lead_processing_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL,
    lead_source TEXT NOT NULL CHECK (lead_source IN ('linkedin', 'apollo')),
    execution_id UUID REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
    
    -- Processing stages
    research_status TEXT CHECK (research_status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')) DEFAULT 'pending',
    research_started_at TIMESTAMPTZ,
    research_completed_at TIMESTAMPTZ,
    research_data JSONB,
    
    outreach_status TEXT CHECK (outreach_status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')) DEFAULT 'pending',
    outreach_started_at TIMESTAMPTZ,
    outreach_completed_at TIMESTAMPTZ,
    outreach_data JSONB,
    
    database_update_status TEXT CHECK (database_update_status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')) DEFAULT 'pending',
    database_update_started_at TIMESTAMPTZ,
    database_updated_at TIMESTAMPTZ,
    
    -- Error tracking
    error_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    
    -- Retry tracking
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_retry_at TIMESTAMPTZ,
    
    -- Performance metrics
    processing_time_seconds INTEGER,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one record per lead per execution
    UNIQUE(lead_id, lead_source, execution_id)
);

-- Indexes for lead_processing_status
CREATE INDEX IF NOT EXISTS idx_lead_processing_lead_source 
    ON public.lead_processing_status(lead_id, lead_source);
CREATE INDEX IF NOT EXISTS idx_lead_processing_execution 
    ON public.lead_processing_status(execution_id);
CREATE INDEX IF NOT EXISTS idx_lead_processing_status 
    ON public.lead_processing_status(database_update_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_processing_errors 
    ON public.lead_processing_status(error_count, updated_at DESC) WHERE error_count > 0;
CREATE INDEX IF NOT EXISTS idx_lead_processing_retries 
    ON public.lead_processing_status(retry_count, updated_at DESC) WHERE retry_count > 0;

-- =====================================================
-- 4. WORKFLOW HEALTH TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workflow_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('completed', 'failed', 'started')),
    health_score INTEGER NOT NULL CHECK (health_score >= 0 AND health_score <= 100),
    last_execution_status TEXT,
    critical_errors INTEGER NOT NULL DEFAULT 0,
    total_executions INTEGER NOT NULL DEFAULT 1,
    successful_executions INTEGER NOT NULL DEFAULT 0,
    error_details JSONB,
    metrics JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Prevent duplicate records for same workflow and time
    UNIQUE(workflow_name, started_at)
);

-- Indexes for workflow_health
CREATE INDEX IF NOT EXISTS idx_workflow_health_workflow_time 
    ON public.workflow_health(workflow_name, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_health_score 
    ON public.workflow_health(health_score, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_health_critical 
    ON public.workflow_health(critical_errors, started_at DESC) WHERE critical_errors > 0;

-- =====================================================
-- 5. API USAGE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.api_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_service TEXT NOT NULL,
    endpoint TEXT,
    method TEXT,
    request_data JSONB,
    response_status INTEGER,
    response_data JSONB,
    tokens_used INTEGER,
    cost_estimate DECIMAL(10, 4),
    execution_id UUID REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
    lead_id UUID,
    workflow_name TEXT,
    node_name TEXT,
    called_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for api_usage
CREATE INDEX IF NOT EXISTS idx_api_usage_service_time 
    ON public.api_usage(api_service, called_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_execution 
    ON public.api_usage(execution_id) WHERE execution_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_usage_cost 
    ON public.api_usage(called_at DESC, cost_estimate DESC) WHERE cost_estimate IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_usage_tokens 
    ON public.api_usage(called_at DESC, tokens_used DESC) WHERE tokens_used IS NOT NULL;

-- =====================================================
-- 6. RETRY ATTEMPTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.retry_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL,
    lead_source TEXT NOT NULL CHECK (lead_source IN ('linkedin', 'apollo')),
    workflow_name TEXT NOT NULL,
    retry_type TEXT NOT NULL CHECK (retry_type IN ('full', 'from_failure', 'research_only', 'outreach_only')),
    status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')) DEFAULT 'queued',
    original_execution_id UUID,
    new_execution_id UUID REFERENCES public.workflow_executions(id) ON DELETE SET NULL,
    requested_at TIMESTAMPTZ NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    retry_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for retry_attempts
CREATE INDEX IF NOT EXISTS idx_retry_attempts_lead 
    ON public.retry_attempts(lead_id, lead_source);
CREATE INDEX IF NOT EXISTS idx_retry_attempts_status 
    ON public.retry_attempts(status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_retry_attempts_workflow 
    ON public.retry_attempts(workflow_name, requested_at DESC);

-- =====================================================
-- 7. CREATE UPDATED_AT TRIGGERS
-- =====================================================

-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
DROP TRIGGER IF EXISTS update_workflow_executions_updated_at ON public.workflow_executions;
CREATE TRIGGER update_workflow_executions_updated_at 
    BEFORE UPDATE ON public.workflow_executions 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_lead_processing_status_updated_at ON public.lead_processing_status;
CREATE TRIGGER update_lead_processing_status_updated_at 
    BEFORE UPDATE ON public.lead_processing_status 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 8. CREATE USEFUL VIEWS
-- =====================================================

-- Workflow Summary View
CREATE OR REPLACE VIEW public.workflow_summary AS
SELECT 
    workflow_name,
    COUNT(*) as total_executions,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_executions,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_executions,
    COUNT(*) FILTER (WHERE status = 'started') as running_executions,
    ROUND(
        (COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 
        2
    ) as success_rate,
    MAX(started_at) as last_execution,
    SUM(leads_processed) as total_leads_processed,
    AVG(
        EXTRACT(EPOCH FROM (completed_at - started_at))
    ) FILTER (WHERE completed_at IS NOT NULL) as avg_duration_seconds
FROM public.workflow_executions 
GROUP BY workflow_name;

-- Error Summary View
CREATE OR REPLACE VIEW public.error_summary AS
SELECT 
    workflow_name,
    node_name,
    error_type,
    severity,
    COUNT(*) as error_count,
    MAX(occurred_at) as last_occurrence,
    COUNT(*) FILTER (WHERE resolved = TRUE) as resolved_count,
    COUNT(*) FILTER (WHERE resolved = FALSE) as unresolved_count
FROM public.workflow_errors 
GROUP BY workflow_name, node_name, error_type, severity
ORDER BY error_count DESC, last_occurrence DESC;

-- Lead Processing Summary View
CREATE OR REPLACE VIEW public.lead_processing_summary AS
SELECT 
    lead_source,
    COUNT(*) as total_leads,
    COUNT(*) FILTER (WHERE database_update_status = 'completed') as completed_leads,
    COUNT(*) FILTER (WHERE error_count > 0) as failed_leads,
    COUNT(*) FILTER (WHERE database_update_status = 'in_progress') as processing_leads,
    COUNT(*) FILTER (WHERE database_update_status = 'pending') as pending_leads,
    AVG(processing_time_seconds) FILTER (WHERE processing_time_seconds IS NOT NULL) as avg_processing_time,
    SUM(retry_count) as total_retries,
    MAX(updated_at) as last_update
FROM public.lead_processing_status 
GROUP BY lead_source;

-- Recent Activity View (Last 24 hours)
CREATE OR REPLACE VIEW public.recent_activity AS
SELECT 
    'execution' as activity_type,
    workflow_name as title,
    status as details,
    started_at as timestamp,
    leads_processed as metric_value,
    'leads' as metric_unit
FROM public.workflow_executions 
WHERE started_at > NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
    'error' as activity_type,
    CONCAT(workflow_name, ' - ', node_name) as title,
    error_message as details,
    occurred_at as timestamp,
    NULL as metric_value,
    severity as metric_unit
FROM public.workflow_errors 
WHERE occurred_at > NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
    'retry' as activity_type,
    CONCAT(workflow_name, ' - ', retry_type) as title,
    status as details,
    requested_at as timestamp,
    NULL as metric_value,
    NULL as metric_unit
FROM public.retry_attempts 
WHERE requested_at > NOW() - INTERVAL '24 hours'

ORDER BY timestamp DESC;

-- =====================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_processing_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retry_attempts ENABLE ROW LEVEL SECURITY;

-- Create policies for service role (full access)
CREATE POLICY "Service role full access" ON public.workflow_executions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.workflow_errors
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.lead_processing_status
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.workflow_health
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.api_usage
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.retry_attempts
    FOR ALL USING (auth.role() = 'service_role');

-- Create policies for authenticated users (read-only)
CREATE POLICY "Authenticated read access" ON public.workflow_executions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated read access" ON public.workflow_errors
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated read access" ON public.lead_processing_status
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated read access" ON public.workflow_health
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated read access" ON public.api_usage
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated read access" ON public.retry_attempts
    FOR SELECT USING (auth.role() = 'authenticated');

-- =====================================================
-- 10. GRANT PERMISSIONS
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant table permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant sequence permissions
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant view permissions
GRANT SELECT ON public.workflow_summary TO service_role, authenticated;
GRANT SELECT ON public.error_summary TO service_role, authenticated;
GRANT SELECT ON public.lead_processing_summary TO service_role, authenticated;
GRANT SELECT ON public.recent_activity TO service_role, authenticated;

-- =====================================================
-- 11. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.workflow_executions IS 'Tracks each workflow execution instance with timing and status information';
COMMENT ON TABLE public.workflow_errors IS 'Records all errors that occur during workflow execution with detailed context';
COMMENT ON TABLE public.lead_processing_status IS 'Tracks the processing status of individual leads through workflow stages';
COMMENT ON TABLE public.workflow_health IS 'Stores health metrics and scores for workflow performance monitoring';
COMMENT ON TABLE public.api_usage IS 'Tracks external API usage, costs, and performance metrics';
COMMENT ON TABLE public.retry_attempts IS 'Logs retry attempts for failed lead processing with detailed tracking';

COMMENT ON VIEW public.workflow_summary IS 'Aggregated summary statistics for all workflow executions';
COMMENT ON VIEW public.error_summary IS 'Aggregated error statistics grouped by workflow and error type';
COMMENT ON VIEW public.lead_processing_summary IS 'Summary of lead processing status and performance by source';
COMMENT ON VIEW public.recent_activity IS 'Recent activity across all monitoring tables for dashboard display';

-- =====================================================
-- 12. SAMPLE DATA FOR TESTING (OPTIONAL)
-- =====================================================

-- Uncomment below to insert sample data for testing

/*
-- Insert sample workflow execution
INSERT INTO public.workflow_executions (workflow_name, status, campaign_name, leads_processed) 
VALUES 
    ('LeadGenOS (Apollo)', 'completed', 'Test Campaign - Tech Startups', 25),
    ('LeadGenOS (LinkedIn)', 'completed', 'Test Campaign - SaaS Companies', 18),
    ('LeadGenOS (Apollo)', 'failed', 'Test Campaign - E-commerce', 0);

-- Insert sample errors
INSERT INTO public.workflow_errors (
    execution_id, workflow_name, node_name, error_type, error_message, 
    severity, occurred_at
) VALUES 
    (
        (SELECT id FROM public.workflow_executions WHERE status = 'failed' LIMIT 1),
        'LeadGenOS (Apollo)', 
        'Research Agent', 
        'api_error', 
        'Perplexity API rate limit exceeded', 
        'high', 
        NOW() - INTERVAL '1 hour'
    );

-- Insert sample lead processing status
INSERT INTO public.lead_processing_status (
    lead_id, lead_source, execution_id, research_status, outreach_status, 
    database_update_status, processing_time_seconds
) VALUES 
    (
        gen_random_uuid(),
        'apollo',
        (SELECT id FROM public.workflow_executions WHERE status = 'completed' LIMIT 1),
        'completed',
        'completed',
        'completed',
        145
    );
*/

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- Display setup confirmation
DO $$
BEGIN
    RAISE NOTICE '🎉 LeadGenOS Monitoring Database Setup Complete!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Created Tables:';
    RAISE NOTICE '   • workflow_executions';
    RAISE NOTICE '   • workflow_errors';
    RAISE NOTICE '   • lead_processing_status';
    RAISE NOTICE '   • workflow_health';
    RAISE NOTICE '   • api_usage';
    RAISE NOTICE '   • retry_attempts';
    RAISE NOTICE '';
    RAISE NOTICE '📈 Created Views:';
    RAISE NOTICE '   • workflow_summary';
    RAISE NOTICE '   • error_summary';
    RAISE NOTICE '   • lead_processing_summary';
    RAISE NOTICE '   • recent_activity';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Security:';
    RAISE NOTICE '   • Row Level Security enabled';
    RAISE NOTICE '   • Service role: Full access';
    RAISE NOTICE '   • Authenticated users: Read access';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Ready for API integration!';
END $$;