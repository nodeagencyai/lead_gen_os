-- Lead Tagging System Rollback Script
-- Use this to undo the migration if needed
-- WARNING: This will DELETE all tagging data!

BEGIN;

-- Drop views first (they depend on the tables/columns)
DROP VIEW IF EXISTS leads_with_campaigns;
DROP VIEW IF EXISTS campaign_analytics;

-- Drop triggers
DROP TRIGGER IF EXISTS update_linkedin_updated_at ON "LinkedIn";
DROP TRIGGER IF EXISTS update_apollo_updated_at ON "Apollo";
DROP TRIGGER IF EXISTS update_campaign_sends_updated_at ON campaign_sends;

-- Don't drop the update function as it's used by other tables
-- DROP FUNCTION IF EXISTS update_updated_at_column(); -- Commented out - function is shared

-- Drop the campaign_sends table entirely
DROP TABLE IF EXISTS campaign_sends;

-- Drop indexes first (before dropping columns)
DROP INDEX IF EXISTS idx_linkedin_niche;
DROP INDEX IF EXISTS idx_linkedin_tags;
DROP INDEX IF EXISTS idx_linkedin_created_at;
DROP INDEX IF EXISTS idx_linkedin_updated_at;

DROP INDEX IF EXISTS idx_apollo_niche;
DROP INDEX IF EXISTS idx_apollo_tags;
DROP INDEX IF EXISTS idx_apollo_created_at;
DROP INDEX IF EXISTS idx_apollo_updated_at;

-- Remove columns from LinkedIn table
ALTER TABLE "LinkedIn" 
DROP COLUMN IF EXISTS niche,
DROP COLUMN IF EXISTS tags,
DROP COLUMN IF EXISTS created_at,
DROP COLUMN IF EXISTS updated_at;

-- Remove columns from Apollo table
ALTER TABLE "Apollo" 
DROP COLUMN IF EXISTS niche,
DROP COLUMN IF EXISTS tags,
DROP COLUMN IF EXISTS created_at,
DROP COLUMN IF EXISTS updated_at;

-- Verify rollback
SELECT 'LinkedIn' as table_name, count(*) as row_count FROM "LinkedIn"
UNION ALL
SELECT 'Apollo' as table_name, count(*) as row_count FROM "Apollo";

COMMIT;

-- Rollback complete message
DO $$
BEGIN
  RAISE NOTICE 'Lead tagging rollback completed!';
  RAISE NOTICE 'All tagging columns and data have been removed.';
  RAISE NOTICE 'Tables linkedin and apollo are back to original state.';
END $$;