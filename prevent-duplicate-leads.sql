-- =====================================================
-- Prevent Duplicate Leads - Database Constraints & Upsert Functions
-- =====================================================
-- This script adds unique constraints and creates upsert functions to prevent duplicate leads
-- Run this in your Supabase SQL Editor

BEGIN;

-- =====================================================
-- 1. ADD UNIQUE CONSTRAINTS TO PREVENT DUPLICATES
-- =====================================================

-- Apollo table: Prevent duplicates based on email + company combination
-- Email is the primary identifier for email outreach
ALTER TABLE public."Apollo" 
DROP CONSTRAINT IF EXISTS unique_apollo_email_company;

ALTER TABLE public."Apollo" 
ADD CONSTRAINT unique_apollo_email_company 
UNIQUE (email, company);

-- LinkedIn table: Prevent duplicates based on email + company combination
-- Even for LinkedIn, email is often the unique identifier
ALTER TABLE public."LinkedIn" 
DROP CONSTRAINT IF EXISTS unique_linkedin_email_company;

ALTER TABLE public."LinkedIn" 
ADD CONSTRAINT unique_linkedin_email_company 
UNIQUE (email, company);

-- Alternative: If you want to also prevent duplicates by LinkedIn URL
-- Uncomment this if LinkedIn URL is always unique and available
-- ALTER TABLE public."LinkedIn" 
-- ADD CONSTRAINT unique_linkedin_url 
-- UNIQUE (linkedin_url) 
-- WHERE linkedin_url IS NOT NULL;

-- =====================================================
-- 2. CREATE UPSERT FUNCTIONS FOR N8N TO USE
-- =====================================================

-- Function to upsert Apollo leads (prevent duplicates)
CREATE OR REPLACE FUNCTION upsert_apollo_lead(
    p_email TEXT,
    p_company TEXT,
    p_full_name TEXT DEFAULT NULL,
    p_first_name TEXT DEFAULT NULL,
    p_last_name TEXT DEFAULT NULL,
    p_title TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_linkedin_url TEXT DEFAULT NULL,
    p_website TEXT DEFAULT NULL,
    p_niche TEXT DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_icebreaker TEXT DEFAULT NULL,
    p_personalization_hooks TEXT DEFAULT NULL,
    p_additional_data JSONB DEFAULT NULL
) RETURNS TABLE(
    lead_id INTEGER,
    was_inserted BOOLEAN,
    message TEXT
) AS $$
DECLARE
    existing_id INTEGER;
    inserted_id INTEGER;
BEGIN
    -- Check if lead already exists
    SELECT id INTO existing_id
    FROM public."Apollo"
    WHERE email = p_email AND company = p_company;
    
    IF existing_id IS NOT NULL THEN
        -- Lead already exists, return existing ID
        RETURN QUERY SELECT existing_id, FALSE, 'Lead already exists - skipped duplicate'::TEXT;
    ELSE
        -- Insert new lead
        INSERT INTO public."Apollo" (
            email, 
            company, 
            full_name, 
            first_name, 
            last_name, 
            title, 
            phone, 
            linkedin_url, 
            website,
            niche,
            tags,
            icebreaker,
            personalization_hooks,
            additional_data
        ) VALUES (
            p_email,
            p_company,
            p_full_name,
            p_first_name,
            p_last_name,
            p_title,
            p_phone,
            p_linkedin_url,
            p_website,
            p_niche,
            p_tags,
            p_icebreaker,
            p_personalization_hooks,
            p_additional_data
        ) RETURNING id INTO inserted_id;
        
        RETURN QUERY SELECT inserted_id, TRUE, 'New lead inserted successfully'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to upsert LinkedIn leads (prevent duplicates)
CREATE OR REPLACE FUNCTION upsert_linkedin_lead(
    p_email TEXT,
    p_company TEXT,
    p_name TEXT DEFAULT NULL,
    p_full_name TEXT DEFAULT NULL,
    p_position TEXT DEFAULT NULL,
    p_linkedin_url TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_niche TEXT DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_icebreaker TEXT DEFAULT NULL,
    p_additional_data JSONB DEFAULT NULL
) RETURNS TABLE(
    lead_id INTEGER,
    was_inserted BOOLEAN,
    message TEXT
) AS $$
DECLARE
    existing_id INTEGER;
    inserted_id INTEGER;
BEGIN
    -- Check if lead already exists
    SELECT id INTO existing_id
    FROM public."LinkedIn"
    WHERE email = p_email AND company = p_company;
    
    IF existing_id IS NOT NULL THEN
        -- Lead already exists, return existing ID
        RETURN QUERY SELECT existing_id, FALSE, 'Lead already exists - skipped duplicate'::TEXT;
    ELSE
        -- Insert new lead
        INSERT INTO public."LinkedIn" (
            email, 
            company, 
            name,
            full_name, 
            position, 
            linkedin_url, 
            phone,
            niche,
            tags,
            icebreaker,
            additional_data
        ) VALUES (
            p_email,
            p_company,
            p_name,
            p_full_name,
            p_position,
            p_linkedin_url,
            p_phone,
            p_niche,
            p_tags,
            p_icebreaker,
            p_additional_data
        ) RETURNING id INTO inserted_id;
        
        RETURN QUERY SELECT inserted_id, TRUE, 'New lead inserted successfully'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. CREATE BATCH UPSERT FUNCTIONS FOR BULK OPERATIONS
-- =====================================================

-- Batch upsert for Apollo leads (for N8N bulk operations)
CREATE OR REPLACE FUNCTION batch_upsert_apollo_leads(leads_data JSONB)
RETURNS TABLE(
    total_processed INTEGER,
    new_leads INTEGER,
    duplicates_skipped INTEGER,
    results JSONB
) AS $$
DECLARE
    lead_record JSONB;
    result_record JSONB;
    results_array JSONB[] := '{}';
    total_count INTEGER := 0;
    new_count INTEGER := 0;
    duplicate_count INTEGER := 0;
    temp_result RECORD;
BEGIN
    -- Process each lead in the input array
    FOR lead_record IN SELECT * FROM jsonb_array_elements(leads_data)
    LOOP
        total_count := total_count + 1;
        
        -- Call individual upsert function
        SELECT * INTO temp_result FROM upsert_apollo_lead(
            p_email := lead_record->>'email',
            p_company := lead_record->>'company',
            p_full_name := lead_record->>'full_name',
            p_first_name := lead_record->>'first_name',
            p_last_name := lead_record->>'last_name',
            p_title := lead_record->>'title',
            p_phone := lead_record->>'phone',
            p_linkedin_url := lead_record->>'linkedin_url',
            p_website := lead_record->>'website',
            p_niche := lead_record->>'niche',
            p_tags := CASE WHEN lead_record->'tags' IS NOT NULL 
                          THEN ARRAY(SELECT jsonb_array_elements_text(lead_record->'tags'))
                          ELSE NULL END,
            p_icebreaker := lead_record->>'icebreaker',
            p_personalization_hooks := lead_record->>'personalization_hooks',
            p_additional_data := lead_record->'additional_data'
        );
        
        -- Count results
        IF temp_result.was_inserted THEN
            new_count := new_count + 1;
        ELSE
            duplicate_count := duplicate_count + 1;
        END IF;
        
        -- Build result record
        result_record := jsonb_build_object(
            'email', lead_record->>'email',
            'company', lead_record->>'company',
            'lead_id', temp_result.lead_id,
            'was_inserted', temp_result.was_inserted,
            'message', temp_result.message
        );
        
        results_array := results_array || result_record;
    END LOOP;
    
    RETURN QUERY SELECT 
        total_count,
        new_count,
        duplicate_count,
        array_to_json(results_array)::JSONB;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. GRANT PERMISSIONS FOR API ACCESS
-- =====================================================

-- Grant execute permissions to authenticated users (for N8N service account)
GRANT EXECUTE ON FUNCTION upsert_apollo_lead TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_linkedin_lead TO authenticated;
GRANT EXECUTE ON FUNCTION batch_upsert_apollo_leads TO authenticated;

-- Grant to service role (for direct N8N access if using service key)
GRANT EXECUTE ON FUNCTION upsert_apollo_lead TO service_role;
GRANT EXECUTE ON FUNCTION upsert_linkedin_lead TO service_role;
GRANT EXECUTE ON FUNCTION batch_upsert_apollo_leads TO service_role;

-- =====================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Ensure we have indexes on the constraint columns for fast lookups
CREATE INDEX IF NOT EXISTS idx_apollo_email_company ON public."Apollo"(email, company);
CREATE INDEX IF NOT EXISTS idx_linkedin_email_company ON public."LinkedIn"(email, company);

-- Additional indexes for common queries
CREATE INDEX IF NOT EXISTS idx_apollo_email ON public."Apollo"(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_linkedin_email ON public."LinkedIn"(email) WHERE email IS NOT NULL;

COMMIT;

-- =====================================================
-- 6. USAGE EXAMPLES FOR N8N
-- =====================================================

-- Example 1: Insert single Apollo lead (upsert)
/*
SELECT * FROM upsert_apollo_lead(
    p_email := 'john.doe@company.com',
    p_company := 'Example Corp',
    p_full_name := 'John Doe',
    p_title := 'CEO',
    p_niche := 'saas',
    p_tags := ARRAY['startup', 'series-a']
);
*/

-- Example 2: Insert single LinkedIn lead (upsert)
/*
SELECT * FROM upsert_linkedin_lead(
    p_email := 'jane.smith@techcorp.com',
    p_company := 'TechCorp',
    p_name := 'Jane Smith',
    p_position := 'CTO',
    p_linkedin_url := 'https://linkedin.com/in/janesmith'
);
*/

-- Example 3: Batch insert Apollo leads
/*
SELECT * FROM batch_upsert_apollo_leads('[
    {
        "email": "lead1@company.com", 
        "company": "Company A", 
        "full_name": "Lead One",
        "title": "Manager"
    },
    {
        "email": "lead2@company.com", 
        "company": "Company B", 
        "full_name": "Lead Two",
        "title": "Director"
    }
]'::JSONB);
*/

-- =====================================================
-- SETUP COMPLETE MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 Duplicate Prevention Setup Complete!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Added unique constraints to prevent duplicates:';
    RAISE NOTICE '   • Apollo: email + company must be unique';
    RAISE NOTICE '   • LinkedIn: email + company must be unique';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Created upsert functions for N8N:';
    RAISE NOTICE '   • upsert_apollo_lead() - single lead upsert';
    RAISE NOTICE '   • upsert_linkedin_lead() - single lead upsert';
    RAISE NOTICE '   • batch_upsert_apollo_leads() - bulk upsert';
    RAISE NOTICE '';
    RAISE NOTICE '📈 Performance indexes created for fast duplicate checking';
    RAISE NOTICE '';
    RAISE NOTICE '🔑 Next Steps:';
    RAISE NOTICE '   1. Update your N8N workflows to use the upsert functions';
    RAISE NOTICE '   2. Replace INSERT statements with SELECT * FROM upsert_*_lead(...)';
    RAISE NOTICE '   3. Test with duplicate data to verify prevention works';
END $$;