import { createClient } from '@supabase/supabase-js';

// Check for required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
}

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔄 Fetching dashboard data...');
    const timeRange = req.query.timeRange || '24h';
    
    // Convert time range to hours
    const hours = timeRange === '7d' ? 168 : timeRange === '30d' ? 720 : 24;
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Initialize default values
    let executions = [];
    let errors = [];
    let leads = [];

    // Try to fetch data from each table, but continue if tables don't exist
    try {
      const executionsResult = await supabase
        .from('workflow_executions')
        .select('*')
        .gte('started_at', startTime.toISOString());
      
      if (executionsResult.error) {
        console.warn('workflow_executions table error:', executionsResult.error);
      } else {
        executions = executionsResult.data || [];
      }
    } catch (e) {
      console.warn('Failed to fetch executions:', e.message);
    }

    try {
      const errorsResult = await supabase
        .from('workflow_errors')
        .select('*')
        .gte('occurred_at', startTime.toISOString());
      
      if (errorsResult.error) {
        console.warn('workflow_errors table error:', errorsResult.error);
      } else {
        errors = errorsResult.data || [];
      }
    } catch (e) {
      console.warn('Failed to fetch errors:', e.message);
    }

    try {
      const leadsResult = await supabase
        .from('lead_processing_status')
        .select('*')
        .gte('created_at', startTime.toISOString());
      
      if (leadsResult.error) {
        console.warn('lead_processing_status table error:', leadsResult.error);
      } else {
        leads = leadsResult.data || [];
      }
    } catch (e) {
      console.warn('Failed to fetch leads:', e.message);
    }

    // Calculate metrics
    const executionStats = {
      total: executions.length,
      completed: executions.filter(e => e.status === 'completed').length,
      failed: executions.filter(e => e.status === 'failed').length,
      running: executions.filter(e => e.status === 'started').length,
      successRate: executions.length > 0 ? 
        Math.round((executions.filter(e => e.status === 'completed').length / executions.length) * 100) : 0
    };

    const errorStats = {
      total: errors.length,
      bySeverity: {
        critical: errors.filter(e => e.severity === 'critical').length,
        high: errors.filter(e => e.severity === 'high').length,
        medium: errors.filter(e => e.severity === 'medium').length,
        low: errors.filter(e => e.severity === 'low').length
      }
    };

    // Group by workflow
    const apolloExecutions = executions.filter(e => e.workflow_name?.includes('Apollo'));
    const linkedinExecutions = executions.filter(e => e.workflow_name?.includes('LinkedIn'));

    const health = {
      apollo: {
        totalExecutions: apolloExecutions.length,
        successfulExecutions: apolloExecutions.filter(e => e.status === 'completed').length
      },
      linkedin: {
        totalExecutions: linkedinExecutions.length,
        successfulExecutions: linkedinExecutions.filter(e => e.status === 'completed').length
      }
    };

    // Recent activity (last 20 items)
    const recentActivity = [
      ...executions.slice(-10).map(e => ({
        activity_type: 'execution',
        title: e.workflow_name,
        subtitle: e.campaign_name || 'No campaign',
        details: e.status,
        timestamp: e.started_at,
        metric_value: e.leads_processed,
        metric_unit: 'leads',
        severity: e.status === 'failed' ? 'error' : 'success'
      })),
      ...errors.slice(-10).map(e => ({
        activity_type: 'error',
        title: `${e.workflow_name} - ${e.node_name}`,
        subtitle: e.lead_company || 'Unknown',
        details: e.error_message,
        timestamp: e.occurred_at,
        metric_value: e.retry_count,
        metric_unit: 'retries',
        severity: e.severity
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 20);

    const dashboardData = {
      executions: executionStats,
      errors: errorStats,
      health,
      leads: {
        total: leads.length,
        completed: leads.filter(l => l.database_update_status === 'completed').length,
        failed: leads.filter(l => l.error_count > 0).length,
        processing: leads.filter(l => 
          l.research_status === 'in_progress' || 
          l.outreach_status === 'in_progress' || 
          l.database_update_status === 'in_progress'
        ).length
      },
      recent_activity: recentActivity,
      timestamp: new Date().toISOString(),
      timeRange
    };

    console.log('✅ Dashboard data fetched successfully');
    res.status(200).json(dashboardData);
  } catch (error) {
    console.error('❌ Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data', details: error.message });
  }
}