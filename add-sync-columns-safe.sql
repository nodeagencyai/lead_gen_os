-- Safe migration for sync status columns
-- Apollo uses Instantly platform, LinkedIn uses HeyReach platform

-- Step 1: Add sync columns to both tables
ALTER TABLE public."Apollo" ADD COLUMN IF NOT EXISTS instantly_synced BOOLEAN DEFAULT FALSE;
ALTER TABLE public."Apollo" ADD COLUMN IF NOT EXISTS instantly_synced_at TIMESTAMP;

ALTER TABLE public."LinkedIn" ADD COLUMN IF NOT EXISTS heyreach_synced BOOLEAN DEFAULT FALSE;
ALTER TABLE public."LinkedIn" ADD COLUMN IF NOT EXISTS heyreach_synced_at TIMESTAMP;

-- Step 2: Safe migration of existing campaign_sends data
-- This handles the UUID/integer type mismatch safely

-- For Apollo leads (Instantly platform)
UPDATE public."Apollo" 
SET instantly_synced = TRUE, instantly_synced_at = cs.sent_at
FROM campaign_sends cs 
WHERE CAST(cs.lead_id AS TEXT) = CAST("Apollo".id AS TEXT)
  AND UPPER(cs.lead_source) = 'APOLLO'
  AND LOWER(cs.platform) = 'instantly' 
  AND cs.status IN ('sent', 'completed');

-- For LinkedIn leads (HeyReach platform)  
UPDATE public."LinkedIn" 
SET heyreach_synced = TRUE, heyreach_synced_at = cs.sent_at
FROM campaign_sends cs 
WHERE CAST(cs.lead_id AS TEXT) = CAST("LinkedIn".id AS TEXT)
  AND UPPER(cs.lead_source) = 'LINKEDIN'
  AND LOWER(cs.platform) = 'heyreach'
  AND cs.status IN ('sent', 'completed');

-- Step 3: Verify the migration (optional - run these to check results)
-- SELECT COUNT(*) as apollo_synced FROM public."Apollo" WHERE instantly_synced = TRUE;
-- SELECT COUNT(*) as linkedin_synced FROM public."LinkedIn" WHERE heyreach_synced = TRUE;