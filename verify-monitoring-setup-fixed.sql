-- =====================================================
-- LeadGenOS Monitoring Setup Verification Script (FIXED)
-- =====================================================
-- Run this after the main setup to verify everything is working

-- =====================================================
-- 1. VERIFY TABLE CREATION
-- =====================================================

SELECT 
    'TABLE CHECK' as check_type,
    CASE 
        WHEN COUNT(*) = 6 THEN '✅ All 6 tables created successfully'
        ELSE '❌ Expected 6 tables, found ' || COUNT(*)::TEXT
    END as result
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'workflow_executions',
    'workflow_errors', 
    'lead_processing_status',
    'workflow_health',
    'api_usage',
    'retry_attempts'
);

-- List all monitoring tables
SELECT 
    'TABLES' as type,
    table_name,
    '✅ EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'workflow_executions',
    'workflow_errors', 
    'lead_processing_status',
    'workflow_health',
    'api_usage',
    'retry_attempts'
)
ORDER BY table_name;

-- =====================================================
-- 2. VERIFY INDEXES
-- =====================================================

SELECT 
    'INDEX CHECK' as check_type,
    CASE 
        WHEN COUNT(*) >= 15 THEN '✅ Sufficient indexes created (' || COUNT(*)::TEXT || ')'
        ELSE '⚠️ Expected 15+ indexes, found ' || COUNT(*)::TEXT
    END as result
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%';

-- =====================================================
-- 3. VERIFY VIEWS
-- =====================================================

SELECT 
    'VIEW CHECK' as check_type,
    CASE 
        WHEN COUNT(*) = 4 THEN '✅ All 4 views created successfully'
        ELSE '❌ Expected 4 views, found ' || COUNT(*)::TEXT
    END as result
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN (
    'workflow_summary',
    'error_summary',
    'lead_processing_summary',
    'recent_activity'
);

-- List all monitoring views
SELECT 
    'VIEWS' as type,
    table_name as view_name,
    '✅ EXISTS' as status
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN (
    'workflow_summary',
    'error_summary',
    'lead_processing_summary',
    'recent_activity'
)
ORDER BY table_name;

-- =====================================================
-- 4. VERIFY RLS POLICIES
-- =====================================================

SELECT 
    'RLS CHECK' as check_type,
    CASE 
        WHEN COUNT(*) >= 6 THEN '✅ RLS enabled on ' || COUNT(*)::TEXT || ' tables'
        ELSE '⚠️ RLS may not be enabled on all tables'
    END as result
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND c.relname IN ('workflow_executions', 'workflow_errors', 'lead_processing_status', 'workflow_health', 'api_usage', 'retry_attempts')
AND c.relrowsecurity = true;

SELECT 
    'POLICY CHECK' as check_type,
    CASE 
        WHEN COUNT(*) >= 12 THEN '✅ ' || COUNT(*)::TEXT || ' RLS policies created'
        ELSE '⚠️ Expected 12+ policies, found ' || COUNT(*)::TEXT
    END as result
FROM pg_policies
WHERE schemaname = 'public';

-- =====================================================
-- 5. VERIFY TRIGGERS
-- =====================================================

SELECT 
    'TRIGGER CHECK' as check_type,
    CASE 
        WHEN COUNT(*) >= 2 THEN '✅ ' || COUNT(*)::TEXT || ' updated_at triggers created'
        ELSE '⚠️ Expected 2+ triggers, found ' || COUNT(*)::TEXT
    END as result
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%updated_at%';

-- =====================================================
-- 6. TEST BASIC FUNCTIONALITY
-- =====================================================

-- Test workflow execution insert
INSERT INTO public.workflow_executions (workflow_name, status, campaign_name, leads_processed) 
VALUES ('✅ Test Workflow', 'completed', 'Verification Test', 1);

-- Test error insert
INSERT INTO public.workflow_errors (
    execution_id, workflow_name, node_name, error_type, 
    error_message, severity, occurred_at
) VALUES (
    (SELECT id FROM public.workflow_executions WHERE workflow_name = '✅ Test Workflow' LIMIT 1),
    '✅ Test Workflow', 'Test Node', 'test_error',
    'This is a test error', 'low', NOW()
);

-- Test lead processing status insert
INSERT INTO public.lead_processing_status (
    lead_id, lead_source, execution_id, research_status, 
    outreach_status, database_update_status
) VALUES (
    gen_random_uuid(), 'apollo', 
    (SELECT id FROM public.workflow_executions WHERE workflow_name = '✅ Test Workflow' LIMIT 1),
    'completed', 'completed', 'completed'
);

-- Verify inserts worked
SELECT 
    'INSERT TEST' as check_type,
    'Data inserted successfully - ' || COUNT(*)::TEXT || ' test records' as result
FROM public.workflow_executions 
WHERE workflow_name = '✅ Test Workflow';

-- =====================================================
-- 7. TEST VIEWS
-- =====================================================

SELECT 
    'VIEW TEST' as check_type,
    'workflow_summary: ' || COUNT(*)::TEXT || ' rows' as result
FROM public.workflow_summary;

SELECT 
    'VIEW TEST' as check_type,
    'error_summary: ' || COUNT(*)::TEXT || ' rows' as result
FROM public.error_summary;

SELECT 
    'VIEW TEST' as check_type,
    'lead_processing_summary: ' || COUNT(*)::TEXT || ' rows' as result
FROM public.lead_processing_summary;

SELECT 
    'VIEW TEST' as check_type,
    'recent_activity: ' || COUNT(*)::TEXT || ' rows' as result
FROM public.recent_activity;

-- =====================================================
-- 8. DISPLAY TABLE SIZES
-- =====================================================

SELECT 
    'TABLE SIZE' as type,
    schemaname||'.'||tablename as table_name,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('workflow_executions', 'workflow_errors', 'lead_processing_status', 'workflow_health', 'api_usage', 'retry_attempts')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =====================================================
-- 9. CLEAN UP TEST DATA
-- =====================================================

DELETE FROM public.workflow_executions WHERE workflow_name = '✅ Test Workflow';

SELECT 
    'CLEANUP' as check_type,
    '🧹 Test data cleaned up successfully' as result;

-- =====================================================
-- 10. FINAL SUMMARY
-- =====================================================

SELECT 
    '🎉 VERIFICATION COMPLETE!' as status,
    'Your monitoring database is ready for use!' as message;

SELECT 
    '📋 NEXT STEPS' as type,
    step_number,
    description
FROM (
    VALUES 
    (1, 'Test your API endpoints with: node test-monitoring-api.js'),
    (2, 'Configure your N8N workflows with webhook URLs'),
    (3, 'Update your environment variables'),
    (4, 'Deploy your monitoring dashboard')
) as steps(step_number, description)
ORDER BY step_number;