-- Add sync status columns to Apollo and LinkedIn tables
-- This provides a simple and efficient way to track which leads have been sent to Instantly

-- Add to Apollo table
ALTER TABLE public."Apollo" ADD COLUMN IF NOT EXISTS instantly_synced BOOLEAN DEFAULT FALSE;
ALTER TABLE public."Apollo" ADD COLUMN IF NOT EXISTS instantly_synced_at TIMESTAMP;

-- Add to LinkedIn table  
ALTER TABLE public."LinkedIn" ADD COLUMN IF NOT EXISTS instantly_synced BOOLEAN DEFAULT FALSE;
ALTER TABLE public."LinkedIn" ADD COLUMN IF NOT EXISTS instantly_synced_at TIMESTAMP;

-- Optional: Update existing leads to have sync status based on campaign_sends table
-- This migrates existing data to the new column structure
UPDATE public."Apollo" 
SET instantly_synced = TRUE, instantly_synced_at = cs.sent_at
FROM campaign_sends cs 
WHERE cs.lead_id = "Apollo".id 
  AND cs.lead_source = 'Apollo' 
  AND cs.platform = 'instantly' 
  AND cs.status IN ('sent', 'completed');

UPDATE public."LinkedIn" 
SET instantly_synced = TRUE, instantly_synced_at = cs.sent_at  
FROM campaign_sends cs 
WHERE cs.lead_id = "LinkedIn".id 
  AND cs.lead_source = 'LinkedIn' 
  AND cs.platform = 'instantly' 
  AND cs.status IN ('sent', 'completed');