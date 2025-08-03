-- Create OpenRouter cost tracking tables
-- This migration creates the necessary tables for tracking OpenRouter API usage and monthly costs

-- Table to track individual OpenRouter API calls
CREATE TABLE IF NOT EXISTS openrouter_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generation_id VARCHAR(255) UNIQUE,
    campaign_id VARCHAR(255),
    email_id VARCHAR(255),
    model VARCHAR(255) NOT NULL,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    cost_usd DECIMAL(10, 6),
    purpose VARCHAR(50) CHECK (purpose IN ('email_generation', 'subject_line', 'personalization', 'follow_up', 'other')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table to track monthly cost summaries
CREATE TABLE IF NOT EXISTS monthly_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    instantly_cost DECIMAL(10, 2) DEFAULT 75.00,
    google_workspace_cost DECIMAL(10, 2) DEFAULT 48.00,
    openrouter_cost DECIMAL(10, 6) DEFAULT 0,
    total_cost DECIMAL(10, 2),
    emails_sent INTEGER DEFAULT 0,
    meetings_booked INTEGER DEFAULT 0,
    cost_per_email DECIMAL(10, 4),
    cost_per_meeting DECIMAL(10, 4),
    exchange_rate DECIMAL(10, 6) DEFAULT 0.92, -- USD to EUR
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_year_month UNIQUE(year, month)
);

-- Add performance indexes
CREATE INDEX idx_openrouter_usage_campaign ON openrouter_usage(campaign_id);
CREATE INDEX idx_openrouter_usage_date ON openrouter_usage(created_at);
CREATE INDEX idx_openrouter_usage_purpose ON openrouter_usage(purpose);
CREATE INDEX idx_openrouter_usage_generation ON openrouter_usage(generation_id);
CREATE INDEX idx_monthly_costs_period ON monthly_costs(year, month);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_openrouter_usage_updated_at BEFORE UPDATE ON openrouter_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_costs_updated_at BEFORE UPDATE ON monthly_costs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add cost alert table for budget tracking
CREATE TABLE IF NOT EXISTS cost_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(50) NOT NULL,
    threshold_amount DECIMAL(10, 2) NOT NULL,
    current_amount DECIMAL(10, 2) NOT NULL,
    is_triggered BOOLEAN DEFAULT FALSE,
    triggered_at TIMESTAMP WITH TIME ZONE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cost_alerts_triggered ON cost_alerts(is_triggered, acknowledged_at);