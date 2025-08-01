-- Add sync status columns to Apollo and LinkedIn tables
-- Apollo uses Instantly platform, LinkedIn uses HeyReach platform

-- Add to Apollo table (uses Instantly)
ALTER TABLE public."Apollo" ADD COLUMN IF NOT EXISTS instantly_synced BOOLEAN DEFAULT FALSE;
ALTER TABLE public."Apollo" ADD COLUMN IF NOT EXISTS instantly_synced_at TIMESTAMP;

-- Add to LinkedIn table (uses HeyReach)
ALTER TABLE public."LinkedIn" ADD COLUMN IF NOT EXISTS heyreach_synced BOOLEAN DEFAULT FALSE;
ALTER TABLE public."LinkedIn" ADD COLUMN IF NOT EXISTS heyreach_synced_at TIMESTAMP;

-- Optional: Update existing leads to have sync status based on campaign_sends table
-- This migrates existing data to the new column structure
-- Note: Handle type mismatch between UUID (campaign_sends.lead_id) and integer (table IDs)

UPDATE public."Apollo" 
SET instantly_synced = TRUE, instantly_synced_at = cs.sent_at
FROM campaign_sends cs 
WHERE cs.lead_id::text = "Apollo".id::text 
  AND cs.lead_source = 'Apollo' 
  AND cs.platform = 'instantly' 
  AND cs.status IN ('sent', 'completed');

UPDATE public."LinkedIn" 
SET heyreach_synced = TRUE, heyreach_synced_at = cs.sent_at  
FROM campaign_sends cs 
WHERE cs.lead_id::text = "LinkedIn".id::text 
  AND cs.lead_source = 'LinkedIn' 
  AND cs.platform = 'heyreach' 
  AND cs.status IN ('sent', 'completed');