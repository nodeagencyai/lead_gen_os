-- =====================================================
-- Fix Delete Permissions for Apollo and LinkedIn Tables
-- =====================================================
-- Run this script in your Supabase SQL Editor to diagnose and fix delete issues

-- =====================================================
-- 1. DIAGNOSTIC QUERIES - Check Current Status
-- =====================================================

-- Check if RLS is enabled on Apollo and LinkedIn tables
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled,
    hasrls
FROM pg_tables 
LEFT JOIN pg_class ON pg_class.relname = pg_tables.tablename
WHERE tablename IN ('Apollo', 'LinkedIn')
AND schemaname = 'public';

-- Check current policies on Apollo and LinkedIn tables
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('Apollo', 'LinkedIn')
ORDER BY tablename, policyname;

-- Check table permissions for authenticated role
SELECT 
    table_name,
    privilege_type,
    grantee
FROM information_schema.table_privileges 
WHERE table_name IN ('Apollo', 'LinkedIn')
AND table_schema = 'public'
AND grantee = 'authenticated'
ORDER BY table_name, privilege_type;

-- =====================================================
-- 2. FIX PERMISSIONS - Grant DELETE access
-- =====================================================

-- Grant DELETE permissions to authenticated users
GRANT DELETE ON public.Apollo TO authenticated;
GRANT DELETE ON public.LinkedIn TO authenticated;

-- Also grant to service_role for admin operations
GRANT ALL ON public.Apollo TO service_role;
GRANT ALL ON public.LinkedIn TO service_role;

-- =====================================================
-- 3. FIX RLS POLICIES - Ensure proper delete policies
-- =====================================================

-- Enable RLS if not already enabled
ALTER TABLE public.Apollo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.LinkedIn ENABLE ROW LEVEL SECURITY;

-- Drop existing overly restrictive policies
DROP POLICY IF EXISTS "Authenticated users can access Apollo leads" ON public.Apollo;
DROP POLICY IF EXISTS "Authenticated users can access LinkedIn leads" ON public.LinkedIn;

-- Create more permissive policies for authenticated users
-- (Adjust these based on your security requirements)

-- Option A: Allow all authenticated users full access (most permissive)
CREATE POLICY "Authenticated users can manage Apollo leads" ON public.Apollo
    FOR ALL 
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can manage LinkedIn leads" ON public.LinkedIn
    FOR ALL 
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Option B: If you have user_id columns and want user-specific access, use this instead:
-- (Uncomment and modify if needed)
/*
CREATE POLICY "Users can manage own Apollo leads" ON public.Apollo
    FOR ALL 
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own LinkedIn leads" ON public.LinkedIn
    FOR ALL 
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
*/

-- =====================================================
-- 4. VERIFY FIXES - Check permissions again
-- =====================================================

-- Verify DELETE permissions are granted
SELECT 
    table_name,
    privilege_type,
    grantee
FROM information_schema.table_privileges 
WHERE table_name IN ('Apollo', 'LinkedIn')
AND table_schema = 'public'
AND privilege_type = 'DELETE'
ORDER BY table_name;

-- Verify new policies are in place
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('Apollo', 'LinkedIn')
ORDER BY tablename, policyname;

-- =====================================================
-- 5. TEST DELETE OPERATIONS (Optional - for testing)
-- =====================================================

-- Test if delete operations work (uncomment to test with actual IDs)
/*
-- Replace 999999 with an actual ID from your tables for testing
SELECT 'Testing delete permissions...' as status;

-- Test delete on Apollo (will fail if no row with ID 999999)
-- DELETE FROM public.Apollo WHERE id = 999999;

-- Test delete on LinkedIn (will fail if no row with ID 999999)  
-- DELETE FROM public.LinkedIn WHERE id = 999999;
*/

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Delete permissions fix completed!';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Applied fixes:';
    RAISE NOTICE '   • Granted DELETE permissions to authenticated role';
    RAISE NOTICE '   • Updated RLS policies to allow authenticated users';
    RAISE NOTICE '   • Enabled RLS on Apollo and LinkedIn tables';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Next steps:';
    RAISE NOTICE '   1. Test delete functionality in your application';
    RAISE NOTICE '   2. Check browser console for detailed debug logs';
    RAISE NOTICE '   3. Monitor Network tab for HTTP status codes';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 If issues persist, check the debug logs in browser console';
    RAISE NOTICE '   Look for: 🗑️ delete attempts, 🔐 auth status, 📊 results';
END $$;