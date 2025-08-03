-- Create lead processing costs table
-- This tracks the relationship between lead personalization costs and actual campaign results

CREATE TABLE IF NOT EXISTS lead_processing_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id VARCHAR(255) NOT NULL,
    campaign_id VARCHAR(255) NOT NULL,
    personalization_cost DECIMAL(10, 6) DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    model VARCHAR(255),
    generation_id VARCHAR(255),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP WITH TIME ZONE,
    platform_used VARCHAR(50), -- 'instantly' or 'heyreach'
    meeting_booked_at TIMESTAMP WITH TIME ZONE,
    meeting_value DECIMAL(10, 2), -- Potential revenue from meeting
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_lead_processing_costs_lead ON lead_processing_costs(lead_id);
CREATE INDEX idx_lead_processing_costs_campaign ON lead_processing_costs(campaign_id);
CREATE INDEX idx_lead_processing_costs_processed_date ON lead_processing_costs(processed_at);
CREATE INDEX idx_lead_processing_costs_sent_date ON lead_processing_costs(sent_at);
CREATE INDEX idx_lead_processing_costs_platform ON lead_processing_costs(platform_used);

-- Add update trigger
CREATE TRIGGER update_lead_processing_costs_updated_at 
    BEFORE UPDATE ON lead_processing_costs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add some useful views for cost analysis
CREATE VIEW lead_processing_efficiency AS
SELECT 
    campaign_id,
    COUNT(*) as leads_processed,
    COUNT(sent_at) as leads_sent,
    COUNT(meeting_booked_at) as meetings_booked,
    SUM(personalization_cost) as total_personalization_cost,
    SUM(CASE WHEN sent_at IS NULL THEN personalization_cost ELSE 0 END) as wasted_personalization_cost,
    AVG(personalization_cost) as avg_cost_per_lead,
    CASE 
        WHEN COUNT(sent_at) > 0 THEN SUM(personalization_cost) / COUNT(sent_at)
        ELSE 0 
    END as cost_per_email_sent,
    CASE 
        WHEN COUNT(meeting_booked_at) > 0 THEN SUM(personalization_cost) / COUNT(meeting_booked_at)
        ELSE 0 
    END as cost_per_meeting,
    ROUND(
        CASE 
            WHEN COUNT(*) > 0 THEN (COUNT(sent_at)::DECIMAL / COUNT(*)) * 100
            ELSE 0 
        END, 2
    ) as send_rate_percentage,
    ROUND(
        CASE 
            WHEN COUNT(sent_at) > 0 THEN (COUNT(meeting_booked_at)::DECIMAL / COUNT(sent_at)) * 100
            ELSE 0 
        END, 2
    ) as conversion_rate_percentage
FROM lead_processing_costs
GROUP BY campaign_id;

-- View for monthly cost analysis
CREATE VIEW monthly_lead_processing_costs AS
SELECT 
    EXTRACT(YEAR FROM processed_at) as year,
    EXTRACT(MONTH FROM processed_at) as month,
    COUNT(*) as leads_processed,
    COUNT(sent_at) as leads_sent,
    COUNT(meeting_booked_at) as meetings_booked,
    SUM(personalization_cost) as total_personalization_cost,
    SUM(CASE WHEN sent_at IS NULL THEN personalization_cost ELSE 0 END) as wasted_cost,
    AVG(personalization_cost) as avg_cost_per_lead,
    SUM(tokens_used) as total_tokens_used
FROM lead_processing_costs
GROUP BY EXTRACT(YEAR FROM processed_at), EXTRACT(MONTH FROM processed_at)
ORDER BY year DESC, month DESC;