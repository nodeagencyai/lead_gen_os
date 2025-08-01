-- Simple sync status columns - start fresh, no migration needed
-- Apollo uses Instantly platform, LinkedIn uses HeyReach platform

-- Add sync columns to Apollo table (for Instantly)
ALTER TABLE public."Apollo" ADD COLUMN IF NOT EXISTS instantly_synced BOOLEAN DEFAULT FALSE;
ALTER TABLE public."Apollo" ADD COLUMN IF NOT EXISTS instantly_synced_at TIMESTAMP;

-- Add sync columns to LinkedIn table (for HeyReach)
ALTER TABLE public."LinkedIn" ADD COLUMN IF NOT EXISTS heyreach_synced BOOLEAN DEFAULT FALSE;
ALTER TABLE public."LinkedIn" ADD COLUMN IF NOT EXISTS heyreach_synced_at TIMESTAMP;

-- All existing leads start as NOT synced (FALSE)
-- Only leads sent AFTER this migration will show as synced
-- This gives a clean starting point for the sync status feature