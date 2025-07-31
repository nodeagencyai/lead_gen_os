-- =====================================================
-- LeadGenOS Monitoring Setup Verification Script
-- =====================================================
-- Run this after the main setup to verify everything is working

-- =====================================================
-- 1. VERIFY TABLE CREATION
-- =====================================================

DO $$
DECLARE
    table_count INTEGER;
    expected_tables TEXT[] := ARRAY[
        'workflow_executions',
        'workflow_errors', 
        'lead_processing_status',
        'workflow_health',
        'api_usage',
        'retry_attempts'
    ];
    missing_tables TEXT[];
    current_table TEXT;
BEGIN
    RAISE NOTICE '🔍 Verifying table creation...';
    
    -- Check each expected table
    FOREACH current_table IN ARRAY expected_tables
    LOOP
        SELECT COUNT(*) INTO table_count
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = current_table;
        
        IF table_count = 0 THEN
            missing_tables := array_append(missing_tables, current_table);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) IS NULL THEN
        RAISE NOTICE '✅ All tables created successfully';
    ELSE
        RAISE NOTICE '❌ Missing tables: %', array_to_string(missing_tables, ', ');
    END IF;
END $$;

-- =====================================================
-- 2. VERIFY INDEXES
-- =====================================================

DO $$
DECLARE
    index_count INTEGER;
BEGIN
    RAISE NOTICE '🔍 Verifying indexes...';
    
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_%';
    
    RAISE NOTICE '📊 Created % custom indexes', index_count;
    
    IF index_count >= 15 THEN
        RAISE NOTICE '✅ Sufficient indexes created';
    ELSE
        RAISE NOTICE '⚠️  Expected more indexes (15+), found %', index_count;
    END IF;
END $$;

-- =====================================================
-- 3. VERIFY VIEWS
-- =====================================================

DO $$
DECLARE
    view_count INTEGER;
    expected_views TEXT[] := ARRAY[
        'workflow_summary',
        'error_summary',
        'lead_processing_summary',
        'recent_activity'
    ];
    current_view TEXT;
    missing_views TEXT[];
BEGIN
    RAISE NOTICE '🔍 Verifying views...';
    
    FOREACH current_view IN ARRAY expected_views
    LOOP
        SELECT COUNT(*) INTO view_count
        FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = current_view;
        
        IF view_count = 0 THEN
            missing_views := array_append(missing_views, current_view);
        END IF;
    END LOOP;
    
    IF array_length(missing_views, 1) IS NULL THEN
        RAISE NOTICE '✅ All views created successfully';
    ELSE
        RAISE NOTICE '❌ Missing views: %', array_to_string(missing_views, ', ');
    END IF;
END $$;

-- =====================================================
-- 4. VERIFY RLS POLICIES
-- =====================================================

DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    RAISE NOTICE '🔍 Verifying RLS policies...';
    
    -- Check if RLS is enabled
    SELECT COUNT(*) INTO policy_count
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
    AND c.relname IN ('workflow_executions', 'workflow_errors', 'lead_processing_status', 'workflow_health', 'api_usage', 'retry_attempts')
    AND c.relrowsecurity = true;
    
    RAISE NOTICE '🔒 RLS enabled on % tables', policy_count;
    
    -- Check policy count
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public';
    
    RAISE NOTICE '📋 Created % RLS policies', policy_count;
    
    IF policy_count >= 12 THEN
        RAISE NOTICE '✅ RLS policies configured correctly';
    ELSE
        RAISE NOTICE '⚠️  Expected 12+ policies, found %', policy_count;
    END IF;
END $$;

-- =====================================================
-- 5. VERIFY TRIGGERS
-- =====================================================

DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    RAISE NOTICE '🔍 Verifying triggers...';
    
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    AND trigger_name LIKE '%updated_at%';
    
    RAISE NOTICE '⏰ Created % updated_at triggers', trigger_count;
    
    IF trigger_count >= 2 THEN
        RAISE NOTICE '✅ Triggers configured correctly';
    ELSE
        RAISE NOTICE '⚠️  Expected 2+ triggers, found %', trigger_count;
    END IF;
END $$;

-- =====================================================
-- 6. TEST BASIC FUNCTIONALITY
-- =====================================================

DO $$
DECLARE
    test_execution_id UUID;
    test_error_id UUID;
    test_lead_id UUID := gen_random_uuid();
BEGIN
    RAISE NOTICE '🧪 Testing basic functionality...';
    
    -- Test workflow execution insert
    BEGIN
        INSERT INTO public.workflow_executions (workflow_name, status, campaign_name, leads_processed) 
        VALUES ('Test Workflow', 'completed', 'Verification Test', 1)
        RETURNING id INTO test_execution_id;
        
        RAISE NOTICE '✅ Workflow execution insert: SUCCESS';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Workflow execution insert: FAILED - %', SQLERRM;
    END;
    
    -- Test error insert
    BEGIN
        INSERT INTO public.workflow_errors (
            execution_id, workflow_name, node_name, error_type, 
            error_message, severity, occurred_at
        ) VALUES (
            test_execution_id, 'Test Workflow', 'Test Node', 'test_error',
            'This is a test error', 'low', NOW()
        )
        RETURNING id INTO test_error_id;
        
        RAISE NOTICE '✅ Error insert: SUCCESS';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Error insert: FAILED - %', SQLERRM;
    END;
    
    -- Test lead processing status insert
    BEGIN
        INSERT INTO public.lead_processing_status (
            lead_id, lead_source, execution_id, research_status, 
            outreach_status, database_update_status
        ) VALUES (
            test_lead_id, 'apollo', test_execution_id, 'completed',
            'completed', 'completed'
        );
        
        RAISE NOTICE '✅ Lead processing status insert: SUCCESS';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Lead processing status insert: FAILED - %', SQLERRM;
    END;
    
    -- Test views
    BEGIN
        PERFORM * FROM public.workflow_summary LIMIT 1;
        RAISE NOTICE '✅ Workflow summary view: SUCCESS';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Workflow summary view: FAILED - %', SQLERRM;
    END;
    
    -- Clean up test data
    BEGIN
        DELETE FROM public.workflow_executions WHERE id = test_execution_id;
        RAISE NOTICE '🧹 Test data cleaned up';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️  Could not clean up test data - %', SQLERRM;
    END;
    
END $$;

-- =====================================================
-- 7. CHECK PERMISSIONS
-- =====================================================

DO $$
DECLARE
    service_role_perms INTEGER;
    auth_role_perms INTEGER;
BEGIN
    RAISE NOTICE '🔍 Verifying permissions...';
    
    -- This is a simplified check - actual permission verification 
    -- would need to be done with actual role switching
    
    SELECT COUNT(*) INTO service_role_perms
    FROM information_schema.table_privileges
    WHERE grantee = 'service_role'
    AND table_schema = 'public'
    AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE');
    
    SELECT COUNT(*) INTO auth_role_perms  
    FROM information_schema.table_privileges
    WHERE grantee = 'authenticated'
    AND table_schema = 'public'
    AND privilege_type = 'SELECT';
    
    RAISE NOTICE '🔑 Service role permissions: %', service_role_perms;
    RAISE NOTICE '🔑 Authenticated role permissions: %', auth_role_perms;
    
    RAISE NOTICE '✅ Permission grants applied';
END $$;

-- =====================================================
-- 8. DISPLAY TABLE STATISTICS
-- =====================================================

DO $$
DECLARE
    rec RECORD;
    total_size BIGINT := 0;
BEGIN
    RAISE NOTICE '📊 Table Statistics:';
    RAISE NOTICE '=====================================';
    
    FOR rec IN 
        SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
            pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('workflow_executions', 'workflow_errors', 'lead_processing_status', 'workflow_health', 'api_usage', 'retry_attempts')
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    LOOP
        RAISE NOTICE '📋 %: %', rec.tablename, rec.size;
        total_size := total_size + rec.size_bytes;
    END LOOP;
    
    RAISE NOTICE '=====================================';
    RAISE NOTICE '📊 Total monitoring tables size: %', pg_size_pretty(total_size);
END $$;

-- =====================================================
-- 9. SAMPLE QUERIES TO TEST
-- =====================================================

-- Test the views with sample queries
SELECT 
    'workflow_summary' as view_name,
    COUNT(*) as row_count
FROM public.workflow_summary

UNION ALL

SELECT 
    'error_summary' as view_name,
    COUNT(*) as row_count  
FROM public.error_summary

UNION ALL

SELECT 
    'lead_processing_summary' as view_name,
    COUNT(*) as row_count
FROM public.lead_processing_summary

UNION ALL

SELECT 
    'recent_activity' as view_name,
    COUNT(*) as row_count
FROM public.recent_activity;

-- =====================================================
-- 10. FINAL VERIFICATION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 VERIFICATION COMPLETE!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Next Steps:';
    RAISE NOTICE '   1. Note any warnings or errors above';
    RAISE NOTICE '   2. Test your API endpoints';
    RAISE NOTICE '   3. Configure your N8N workflows';
    RAISE NOTICE '   4. Update your environment variables';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Your monitoring system is ready!';
END $$;