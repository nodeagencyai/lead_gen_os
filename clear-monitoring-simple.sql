-- =====================================================
-- Clear Monitoring Data - Simple & Safe Version
-- =====================================================
-- This script only clears monitoring tables that exist in your database

BEGIN;

-- Clear core monitoring tables (these should exist based on your setup)
TRUNCATE TABLE public.workflow_executions CASCADE;
TRUNCATE TABLE public.workflow_errors CASCADE;
TRUNCATE TABLE public.lead_processing_status CASCADE;
TRUNCATE TABLE public.workflow_health CASCADE;
TRUNCATE TABLE public.api_usage CASCADE;
TRUNCATE TABLE public.retry_attempts CASCADE;

-- Clear cost tracking tables if they exist
DO $$ 
BEGIN
    -- Cost tracking
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'openrouter_usage') THEN
        EXECUTE 'TRUNCATE TABLE public.openrouter_usage CASCADE';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'monthly_costs') THEN
        EXECUTE 'TRUNCATE TABLE public.monthly_costs CASCADE';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cost_alerts') THEN
        EXECUTE 'TRUNCATE TABLE public.cost_alerts CASCADE';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lead_processing_costs') THEN
        EXECUTE 'TRUNCATE TABLE public.lead_processing_costs CASCADE';
    END IF;
    
    -- Additional API tracking
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'api_usage_tracking') THEN
        EXECUTE 'TRUNCATE TABLE public.api_usage_tracking CASCADE';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'monthly_api_costs') THEN
        EXECUTE 'TRUNCATE TABLE public.monthly_api_costs CASCADE';
    END IF;
    
    -- Additional monitoring
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lead_processing_metrics') THEN
        EXECUTE 'TRUNCATE TABLE public.lead_processing_metrics CASCADE';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workflow_performance') THEN
        EXECUTE 'TRUNCATE TABLE public.workflow_performance CASCADE';
    END IF;
    
    -- Campaign tracking
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'campaign_sends') THEN
        EXECUTE 'TRUNCATE TABLE public.campaign_sends CASCADE';
    END IF;
END $$;

COMMIT;

-- Show results
SELECT 'SUCCESS: All monitoring data has been cleared!' as message;

-- Show what tables exist and their status
SELECT 
    t.table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t.table_name)
        THEN 'CLEARED'
        ELSE 'NOT FOUND'
    END as status
FROM (VALUES 
    -- Core monitoring
    ('workflow_executions'),
    ('workflow_errors'),
    ('lead_processing_status'),
    ('workflow_health'),
    ('api_usage'),
    ('retry_attempts'),
    -- Cost tracking
    ('openrouter_usage'),
    ('monthly_costs'),
    ('cost_alerts'),
    ('lead_processing_costs'),
    -- Additional
    ('api_usage_tracking'),
    ('monthly_api_costs'),
    ('lead_processing_metrics'),
    ('workflow_performance'),
    ('campaign_sends')
) AS t(table_name)
ORDER BY 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t.table_name)
        THEN 1
        ELSE 2
    END,
    table_name;