-- LeadGenOS Monitoring Database Schema
-- This file contains the SQL schema for the monitoring system

-- Workflow Executions Table
-- Tracks each workflow execution instance
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'partial')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    campaign_name TEXT,
    leads_processed INTEGER,
    error_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_status 
    ON workflow_executions(workflow_name, status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_started_at 
    ON workflow_executions(started_at DESC);

-- Workflow Errors Table
-- Tracks all errors that occur during workflow execution
CREATE TABLE IF NOT EXISTS workflow_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
    workflow_name TEXT NOT NULL,
    node_name TEXT NOT NULL,
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    error_details JSONB,
    lead_id UUID,
    lead_name TEXT,
    lead_company TEXT,
    lead_data JSONB,
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')) DEFAULT 'medium',
    occurred_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for error queries
CREATE INDEX IF NOT EXISTS idx_workflow_errors_execution_id 
    ON workflow_errors(execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_errors_workflow_occurred 
    ON workflow_errors(workflow_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_errors_lead_id 
    ON workflow_errors(lead_id);
CREATE INDEX IF NOT EXISTS idx_workflow_errors_severity 
    ON workflow_errors(severity);

-- Lead Processing Status Table
-- Tracks the processing status of individual leads through the workflow
CREATE TABLE IF NOT EXISTS lead_processing_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL,
    lead_source TEXT NOT NULL CHECK (lead_source IN ('linkedin', 'apollo')),
    execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
    
    -- Processing stages
    research_status TEXT CHECK (research_status IN ('pending', 'in_progress', 'completed', 'failed')) DEFAULT 'pending',
    research_started_at TIMESTAMPTZ,
    research_completed_at TIMESTAMPTZ,
    
    outreach_status TEXT CHECK (outreach_status IN ('pending', 'in_progress', 'completed', 'failed')) DEFAULT 'pending',
    outreach_started_at TIMESTAMPTZ,
    outreach_completed_at TIMESTAMPTZ,
    
    database_update_status TEXT CHECK (database_update_status IN ('pending', 'in_progress', 'completed', 'failed')) DEFAULT 'pending',
    database_update_started_at TIMESTAMPTZ,
    database_updated_at TIMESTAMPTZ,
    
    -- Error tracking
    error_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    
    -- Retry tracking
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_retry_at TIMESTAMPTZ,
    
    -- Performance metrics
    processing_time_seconds INTEGER,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one record per lead per execution
    UNIQUE(lead_id, lead_source, execution_id)
);

-- Create indexes for lead processing queries
CREATE INDEX IF NOT EXISTS idx_lead_processing_lead_source 
    ON lead_processing_status(lead_id, lead_source);
CREATE INDEX IF NOT EXISTS idx_lead_processing_execution 
    ON lead_processing_status(execution_id);
CREATE INDEX IF NOT EXISTS idx_lead_processing_status 
    ON lead_processing_status(database_update_status);
CREATE INDEX IF NOT EXISTS idx_lead_processing_errors 
    ON lead_processing_status(error_count) WHERE error_count > 0;

-- Workflow Health Table
-- Tracks overall health metrics for each workflow
CREATE TABLE IF NOT EXISTS workflow_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('completed', 'failed', 'started')),
    health_score INTEGER NOT NULL CHECK (health_score >= 0 AND health_score <= 100),
    last_execution_status TEXT,
    critical_errors INTEGER NOT NULL DEFAULT 0,
    error_details JSONB,
    started_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Prevent duplicate records for same workflow and time
    UNIQUE(workflow_name, started_at)
);

-- Create indexes for health queries
CREATE INDEX IF NOT EXISTS idx_workflow_health_workflow_time 
    ON workflow_health(workflow_name, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_health_score 
    ON workflow_health(health_score);

-- API Usage Table
-- Tracks usage and costs of external APIs (Perplexity, Anthropic, etc.)
CREATE TABLE IF NOT EXISTS api_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_service TEXT NOT NULL,
    endpoint TEXT,
    method TEXT,
    request_data JSONB,
    response_status INTEGER,
    tokens_used INTEGER,
    cost_estimate DECIMAL(10, 4),
    execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
    lead_id UUID,
    called_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for API usage queries
CREATE INDEX IF NOT EXISTS idx_api_usage_service_time 
    ON api_usage(api_service, called_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_execution 
    ON api_usage(execution_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_cost 
    ON api_usage(called_at DESC, cost_estimate DESC);

-- Retry Attempts Table
-- Tracks retry attempts for failed leads
CREATE TABLE IF NOT EXISTS retry_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL,
    lead_source TEXT NOT NULL CHECK (lead_source IN ('linkedin', 'apollo')),
    workflow_name TEXT NOT NULL,
    retry_type TEXT NOT NULL CHECK (retry_type IN ('full', 'from_failure', 'research_only', 'outreach_only')),
    status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')) DEFAULT 'queued',
    requested_at TIMESTAMPTZ NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for retry queries
CREATE INDEX IF NOT EXISTS idx_retry_attempts_lead 
    ON retry_attempts(lead_id, lead_source);
CREATE INDEX IF NOT EXISTS idx_retry_attempts_status 
    ON retry_attempts(status, requested_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
DROP TRIGGER IF EXISTS update_workflow_executions_updated_at ON workflow_executions;
CREATE TRIGGER update_workflow_executions_updated_at 
    BEFORE UPDATE ON workflow_executions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lead_processing_status_updated_at ON lead_processing_status;
CREATE TRIGGER update_lead_processing_status_updated_at 
    BEFORE UPDATE ON lead_processing_status 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for common queries

-- Workflow Summary View
CREATE OR REPLACE VIEW workflow_summary AS
SELECT 
    workflow_name,
    COUNT(*) as total_executions,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_executions,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_executions,
    COUNT(*) FILTER (WHERE status = 'started') as running_executions,
    ROUND(
        (COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 
        2
    ) as success_rate,
    MAX(started_at) as last_execution,
    SUM(leads_processed) as total_leads_processed
FROM workflow_executions 
GROUP BY workflow_name;

-- Error Summary View
CREATE OR REPLACE VIEW error_summary AS
SELECT 
    workflow_name,
    node_name,
    error_type,
    severity,
    COUNT(*) as error_count,
    MAX(occurred_at) as last_occurrence
FROM workflow_errors 
GROUP BY workflow_name, node_name, error_type, severity
ORDER BY error_count DESC, last_occurrence DESC;

-- Lead Processing Summary View
CREATE OR REPLACE VIEW lead_processing_summary AS
SELECT 
    lead_source,
    COUNT(*) as total_leads,
    COUNT(*) FILTER (WHERE database_update_status = 'completed') as completed_leads,
    COUNT(*) FILTER (WHERE error_count > 0) as failed_leads,
    COUNT(*) FILTER (WHERE database_update_status = 'in_progress') as processing_leads,
    AVG(processing_time_seconds) as avg_processing_time,
    SUM(retry_count) as total_retries
FROM lead_processing_status 
GROUP BY lead_source;

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_service_role;
-- GRANT SELECT ON ALL VIEWS IN SCHEMA public TO your_service_role;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_service_role;

-- Insert sample data for testing (optional)
-- INSERT INTO workflow_executions (workflow_name, status, campaign_name) 
-- VALUES ('LeadGenOS (Apollo)', 'completed', 'Test Campaign');

COMMENT ON TABLE workflow_executions IS 'Tracks each workflow execution instance with timing and status';
COMMENT ON TABLE workflow_errors IS 'Records all errors that occur during workflow execution';
COMMENT ON TABLE lead_processing_status IS 'Tracks the processing status of individual leads through workflow stages';
COMMENT ON TABLE workflow_health IS 'Stores health metrics and scores for workflow performance monitoring';
COMMENT ON TABLE api_usage IS 'Tracks external API usage, costs, and performance metrics';
COMMENT ON TABLE retry_attempts IS 'Logs retry attempts for failed lead processing';