-- Lead Tagging System Migration
-- Recommended Option 1: Simple and Flexible
-- Run this in your Supabase SQL Editor

BEGIN;

-- Add core fields to LinkedIn table
ALTER TABLE "LinkedIn" 
ADD COLUMN IF NOT EXISTS niche VARCHAR(255),
ADD COLUMN IF NOT EXISTS tags TEXT[], 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add core fields to Apollo table
ALTER TABLE "Apollo" 
ADD COLUMN IF NOT EXISTS niche VARCHAR(255),
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create indexes for performance on LinkedIn table
CREATE INDEX IF NOT EXISTS idx_linkedin_niche ON "LinkedIn"(niche);
CREATE INDEX IF NOT EXISTS idx_linkedin_tags ON "LinkedIn" USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_linkedin_created_at ON "LinkedIn"(created_at);
CREATE INDEX IF NOT EXISTS idx_linkedin_updated_at ON "LinkedIn"(updated_at);

-- Create indexes for performance on Apollo table
CREATE INDEX IF NOT EXISTS idx_apollo_niche ON "Apollo"(niche);
CREATE INDEX IF NOT EXISTS idx_apollo_tags ON "Apollo" USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_apollo_created_at ON "Apollo"(created_at);
CREATE INDEX IF NOT EXISTS idx_apollo_updated_at ON "Apollo"(updated_at);

-- Create a separate campaign tracking table
CREATE TABLE IF NOT EXISTS campaign_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  lead_source VARCHAR(50) NOT NULL CHECK (lead_source IN ('LinkedIn', 'Apollo')),
  campaign_id VARCHAR(255) NOT NULL,
  campaign_name VARCHAR(255),
  platform VARCHAR(50) CHECK (platform IN ('instantly', 'heyreach')),
  sent_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'sent',
  response JSONB,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(lead_id, lead_source, campaign_id)
);

-- Create indexes for campaign_sends table
CREATE INDEX IF NOT EXISTS idx_campaign_sends_lead ON campaign_sends(lead_id, lead_source);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign ON campaign_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_platform ON campaign_sends(platform);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_status ON campaign_sends(status);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_sent_at ON campaign_sends(sent_at);

-- Create helpful views for lead management
CREATE OR REPLACE VIEW leads_with_campaigns AS
SELECT 
  'LinkedIn' as source,
  l.id,
  l.full_name,
  l.company,
  l.title,
  l.niche,
  l.tags,
  l.created_at,
  l.updated_at,
  COALESCE(
    json_agg(
      json_build_object(
        'campaign_id', cs.campaign_id,
        'campaign_name', cs.campaign_name,
        'platform', cs.platform,
        'sent_at', cs.sent_at,
        'status', cs.status
      ) ORDER BY cs.sent_at DESC
    ) FILTER (WHERE cs.id IS NOT NULL), 
    '[]'::json
  ) as campaign_history,
  COUNT(cs.id) as total_campaigns_sent
FROM "LinkedIn" l
LEFT JOIN campaign_sends cs ON cs.lead_id = l.id AND cs.lead_source = 'LinkedIn'
GROUP BY l.id, l.full_name, l.company, l.title, l.niche, l.tags, l.created_at, l.updated_at

UNION ALL

SELECT 
  'Apollo' as source,
  a.id,
  a.full_name,
  a.company,
  a.title,
  a.niche,
  a.tags,
  a.created_at,
  a.updated_at,
  COALESCE(
    json_agg(
      json_build_object(
        'campaign_id', cs.campaign_id,
        'campaign_name', cs.campaign_name,
        'platform', cs.platform,
        'sent_at', cs.sent_at,
        'status', cs.status
      ) ORDER BY cs.sent_at DESC
    ) FILTER (WHERE cs.id IS NOT NULL), 
    '[]'::json
  ) as campaign_history,
  COUNT(cs.id) as total_campaigns_sent
FROM "Apollo" a
LEFT JOIN campaign_sends cs ON cs.lead_id = a.id AND cs.lead_source = 'Apollo'
GROUP BY a.id, a.full_name, a.company, a.title, a.niche, a.tags, a.created_at, a.updated_at;

-- Create a view for campaign analytics
CREATE OR REPLACE VIEW campaign_analytics AS
SELECT 
  campaign_id,
  campaign_name,
  platform,
  lead_source,
  COUNT(*) as total_sends,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_count,
  COUNT(CASE WHEN status = 'replied' THEN 1 END) as reply_count,
  COUNT(CASE WHEN status = 'bounced' THEN 1 END) as bounce_count,
  ROUND(
    (COUNT(CASE WHEN status = 'replied' THEN 1 END)::decimal / NULLIF(COUNT(*), 0)) * 100, 
    2
  ) as reply_rate_percent,
  MIN(sent_at) as first_sent,
  MAX(sent_at) as last_sent
FROM campaign_sends
GROUP BY campaign_id, campaign_name, platform, lead_source
ORDER BY total_sends DESC;

-- Create functions for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_linkedin_updated_at ON "LinkedIn";
CREATE TRIGGER update_linkedin_updated_at 
  BEFORE UPDATE ON "LinkedIn" 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_apollo_updated_at ON "Apollo";
CREATE TRIGGER update_apollo_updated_at 
  BEFORE UPDATE ON "Apollo" 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_campaign_sends_updated_at ON campaign_sends;
CREATE TRIGGER update_campaign_sends_updated_at 
  BEFORE UPDATE ON campaign_sends 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Verify the migration worked
SELECT 'LinkedIn' as table_name, count(*) as row_count FROM "LinkedIn"
UNION ALL
SELECT 'Apollo' as table_name, count(*) as row_count FROM "Apollo"
UNION ALL  
SELECT 'campaign_sends' as table_name, count(*) as row_count FROM campaign_sends;

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Lead tagging migration completed successfully!';
  RAISE NOTICE 'New columns added: niche, tags, created_at, updated_at';
  RAISE NOTICE 'New table created: campaign_sends';
  RAISE NOTICE 'Views created: leads_with_campaigns, campaign_analytics';
  RAISE NOTICE 'Triggers created for automatic updated_at timestamps';
END $$;