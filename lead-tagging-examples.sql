-- Lead Tagging System Usage Examples
-- Run these after the migration to test the new functionality

-- =========================================
-- INSERTING LEADS WITH TAGS AND NICHE
-- =========================================

-- Insert LinkedIn lead with tags
INSERT INTO "LinkedIn" (full_name, company, title, niche, tags) VALUES 
('John Smith', 'TechCorp', 'CEO', 'saas', ARRAY['series-a', 'enterprise', 'ai-startup']);

-- Insert Apollo lead with tags
INSERT INTO "Apollo" (full_name, company, title, niche, tags) VALUES 
('Jane Doe', 'StartupInc', 'CTO', 'fintech', ARRAY['seed-stage', 'blockchain', 'remote-first']);

-- =========================================
-- QUERYING LEADS BY TAGS AND NICHE
-- =========================================

-- Find all leads in 'saas' niche
SELECT * FROM "LinkedIn" WHERE niche = 'saas'
UNION ALL
SELECT * FROM "Apollo" WHERE niche = 'saas';

-- Find leads with specific tag
SELECT * FROM "LinkedIn" WHERE 'series-a' = ANY(tags)
UNION ALL  
SELECT * FROM "Apollo" WHERE 'series-a' = ANY(tags);

-- Find leads with multiple tags (AND condition)
SELECT * FROM "LinkedIn" WHERE tags @> ARRAY['enterprise', 'ai-startup']
UNION ALL
SELECT * FROM "Apollo" WHERE tags @> ARRAY['enterprise', 'ai-startup'];

-- Find leads with any of multiple tags (OR condition)
SELECT * FROM "LinkedIn" WHERE tags && ARRAY['series-a', 'seed-stage']
UNION ALL
SELECT * FROM "Apollo" WHERE tags && ARRAY['series-a', 'seed-stage'];

-- =========================================
-- UPDATING TAGS AND NICHE
-- =========================================

-- Add a tag to existing lead
UPDATE "LinkedIn" 
SET tags = array_append(tags, 'high-priority') 
WHERE id = 'your-lead-id';

-- Remove a tag from lead
UPDATE "LinkedIn" 
SET tags = array_remove(tags, 'old-tag') 
WHERE id = 'your-lead-id';

-- Replace all tags
UPDATE "LinkedIn" 
SET tags = ARRAY['new-tag', 'another-tag'] 
WHERE id = 'your-lead-id';

-- Update niche
UPDATE "LinkedIn" 
SET niche = 'healthtech' 
WHERE id = 'your-lead-id';

-- =========================================
-- CAMPAIGN TRACKING
-- =========================================

-- Record that a lead was sent to a campaign
INSERT INTO campaign_sends (lead_id, lead_source, campaign_id, campaign_name, platform) VALUES
('your-lead-id', 'LinkedIn', 'campaign-123', 'Q4 SaaS Outreach', 'heyreach');

-- Update campaign status when lead replies
UPDATE campaign_sends 
SET status = 'replied', response = '{"message": "Interested in learning more"}' 
WHERE lead_id = 'your-lead-id' AND campaign_id = 'campaign-123';

-- =========================================
-- USEFUL QUERIES WITH NEW VIEWS
-- =========================================

-- Get all leads with their campaign history
SELECT * FROM leads_with_campaigns 
WHERE niche = 'saas' 
ORDER BY created_at DESC 
LIMIT 10;

-- Get campaign analytics
SELECT * FROM campaign_analytics 
WHERE reply_rate_percent > 5 
ORDER BY reply_rate_percent DESC;

-- Find leads never sent to campaigns
SELECT * FROM leads_with_campaigns 
WHERE total_campaigns_sent = 0;

-- Find leads sent to campaigns but no replies
SELECT * FROM leads_with_campaigns 
WHERE total_campaigns_sent > 0 
AND NOT EXISTS (
  SELECT 1 FROM campaign_sends cs 
  WHERE cs.lead_id = leads_with_campaigns.id 
  AND cs.lead_source = leads_with_campaigns.source 
  AND cs.status = 'replied'
);

-- =========================================
-- ANALYTICS QUERIES
-- =========================================

-- Tag popularity across all leads
SELECT 
  unnest(tags) as tag, 
  COUNT(*) as usage_count
FROM (
  SELECT tags FROM "LinkedIn" WHERE tags IS NOT NULL
  UNION ALL
  SELECT tags FROM "Apollo" WHERE tags IS NOT NULL
) all_tags
GROUP BY tag
ORDER BY usage_count DESC;

-- Niche distribution
SELECT 
  niche, 
  COUNT(*) as lead_count,
  COUNT(CASE WHEN source = 'linkedin' THEN 1 END) as linkedin_count,
  COUNT(CASE WHEN source = 'apollo' THEN 1 END) as apollo_count
FROM leads_with_campaigns 
WHERE niche IS NOT NULL
GROUP BY niche
ORDER BY lead_count DESC;

-- Campaign performance by niche
SELECT 
  lwc.niche,
  ca.platform,
  AVG(ca.reply_rate_percent) as avg_reply_rate,
  SUM(ca.total_sends) as total_sends
FROM leads_with_campaigns lwc
JOIN campaign_sends cs ON cs.lead_id = lwc.id AND cs.lead_source = lwc.source
JOIN campaign_analytics ca ON ca.campaign_id = cs.campaign_id
WHERE lwc.niche IS NOT NULL
GROUP BY lwc.niche, ca.platform
ORDER BY avg_reply_rate DESC;

-- =========================================
-- MAINTENANCE QUERIES
-- =========================================

-- Find leads with empty or null tags
SELECT * FROM "LinkedIn" WHERE tags IS NULL OR array_length(tags, 1) IS NULL;
SELECT * FROM "Apollo" WHERE tags IS NULL OR array_length(tags, 1) IS NULL;

-- Clean up duplicate tags in a lead
UPDATE "LinkedIn" 
SET tags = (SELECT ARRAY(SELECT DISTINCT unnest(tags)))
WHERE array_length(tags, 1) > 1;

-- Find orphaned campaign sends (leads that don't exist)
SELECT cs.* FROM campaign_sends cs
LEFT JOIN "LinkedIn" l ON l.id = cs.lead_id AND cs.lead_source = 'LinkedIn'
LEFT JOIN "Apollo" a ON a.id = cs.lead_id AND cs.lead_source = 'Apollo'
WHERE l.id IS NULL AND a.id IS NULL;