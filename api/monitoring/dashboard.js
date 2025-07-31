import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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

  const { timeRange = '24h' } = req.query;
  
  // Convert time range to hours
  const hours = timeRange === '7d' ? 168 : timeRange === '30d' ? 720 : 24;
  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

  try {
    // Get all monitoring data in parallel
    const [health, executions, leads, errors, apiUsage] = await Promise.all([
      getWorkflowHealth(startTime),
      getExecutionStats(startTime),
      getLeadStats(startTime),
      getErrorSummary(startTime),
      getApiUsage(startTime)
    ]);

    const dashboardData = {
      health,
      executions,
      leads,
      errors,
      apiUsage,
      timestamp: new Date().toISOString(),
      timeRange
    };

    res.status(200).json(dashboardData);
  } catch (e) {
    console.error('Error fetching dashboard data:', e);
    res.status(500).json({ error: 'Internal server error', details: e.message });
  }
}

async function getWorkflowHealth(startTime) {
  try {
    const { data, error } = await supabase
      .from('workflow_health')
      .select('*')
      .gte('started_at', startTime.toISOString())
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Error fetching workflow health:', error);
      return getDefaultHealth();
    }

    const health = {};
    const workflowTypes = ['LeadGenOS (LinkedIn)', 'LeadGenOS (Apollo)'];
    
    for (const workflow of workflowTypes) {
      const workflowData = data?.filter(d => d.workflow_name === workflow) || [];
      const key = workflow.includes('LinkedIn') ? 'linkedin' : 'apollo';
      
      health[key] = {
        score: workflowData.length > 0 ? calculateHealthScore(workflowData) : 0,
        status: workflowData.length > 0 ? getHealthStatus(calculateHealthScore(workflowData)) : 'unknown',
        lastExecution: workflowData[0]?.started_at || null,
        totalExecutions: workflowData.length,
        successfulExecutions: workflowData.filter(e => e.status === 'completed').length
      };
    }
    
    return health;
  } catch (e) {
    console.error('Error in getWorkflowHealth:', e);
    return getDefaultHealth();
  }
}

function getDefaultHealth() {
  return {
    linkedin: { score: 0, status: 'unknown', lastExecution: null, totalExecutions: 0, successfulExecutions: 0 },
    apollo: { score: 0, status: 'unknown', lastExecution: null, totalExecutions: 0, successfulExecutions: 0 }
  };
}

function calculateHealthScore(executions) {
  if (!executions.length) return 0;
  
  const successRate = executions.filter(e => e.status === 'completed').length / executions.length;
  const errorPenalty = executions.reduce((sum, e) => sum + (e.critical_errors || 0), 0) * 10;
  
  return Math.max(0, Math.round(successRate * 100 - errorPenalty));
}

function getHealthStatus(score) {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'healthy';
  if (score >= 50) return 'warning';
  return 'critical';
}

async function getExecutionStats(startTime) {
  try {
    const { data, error } = await supabase
      .from('workflow_executions')
      .select('*')
      .gte('started_at', startTime.toISOString());

    if (error) {
      console.error('Error fetching execution stats:', error);
      return { total: 0, completed: 0, failed: 0, successRate: 0 };
    }

    const total = data?.length || 0;
    const completed = data?.filter(e => e.status === 'completed').length || 0;
    const failed = data?.filter(e => e.status === 'failed').length || 0;
    const successRate = total > 0 ? ((completed / total) * 100).toFixed(2) : 0;

    return {
      total,
      completed,
      failed,
      running: data?.filter(e => e.status === 'started').length || 0,
      successRate: parseFloat(successRate)
    };
  } catch (e) {
    console.error('Error in getExecutionStats:', e);
    return { total: 0, completed: 0, failed: 0, running: 0, successRate: 0 };
  }
}

async function getLeadStats(startTime) {
  try {
    const { data, error } = await supabase
      .from('lead_processing_status')
      .select('*')
      .gte('created_at', startTime.toISOString());

    if (error) {
      console.error('Error fetching lead stats:', error);
      return { processed: 0, failed: 0, averageProcessingTime: 0 };
    }

    const processed = data?.filter(l => l.database_update_status === 'completed').length || 0;
    const failed = data?.filter(l => l.error_count > 0).length || 0;
    const processingTimes = data?.filter(l => l.processing_time_seconds).map(l => l.processing_time_seconds) || [];
    const avgTime = processingTimes.length > 0 
      ? (processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length).toFixed(2)
      : 0;

    return {
      processed,
      failed,
      averageProcessingTime: parseFloat(avgTime),
      inProgress: data?.filter(l => l.database_update_status === 'in_progress').length || 0
    };
  } catch (e) {
    console.error('Error in getLeadStats:', e);
    return { processed: 0, failed: 0, averageProcessingTime: 0, inProgress: 0 };
  }
}

async function getErrorSummary(startTime) {
  try {
    const { data, error } = await supabase
      .from('workflow_errors')
      .select('*')
      .gte('occurred_at', startTime.toISOString());

    if (error) {
      console.error('Error fetching error summary:', error);
      return { total: 0, bySeverity: {}, byNode: {}, byType: {} };
    }

    const bySeverity = {
      critical: data?.filter(e => e.severity === 'critical').length || 0,
      high: data?.filter(e => e.severity === 'high').length || 0,
      medium: data?.filter(e => e.severity === 'medium').length || 0,
      low: data?.filter(e => e.severity === 'low').length || 0
    };
    
    const byNode = {};
    const byType = {};
    
    data?.forEach(error => {
      // Count by node
      byNode[error.node_name] = (byNode[error.node_name] || 0) + 1;
      
      // Count by error type
      byType[error.error_type] = (byType[error.error_type] || 0) + 1;
    });
    
    return {
      total: data?.length || 0,
      bySeverity,
      byNode,
      byType
    };
  } catch (e) {
    console.error('Error in getErrorSummary:', e);
    return { total: 0, bySeverity: {}, byNode: {}, byType: {} };
  }
}

async function getApiUsage(startTime) {
  try {
    const { data, error } = await supabase
      .from('api_usage')
      .select('*')
      .gte('called_at', startTime.toISOString());

    if (error) {
      console.error('Error fetching API usage:', error);
      return {};
    }

    const usage = {};
    const services = ['perplexity', 'anthropic', 'openrouter', 'openai'];
    
    services.forEach(service => {
      const serviceData = data?.filter(d => d.api_service === service) || [];
      usage[service] = {
        calls: serviceData.length,
        cost: serviceData.reduce((sum, d) => sum + (d.cost_estimate || 0), 0).toFixed(2),
        tokens: serviceData.reduce((sum, d) => sum + (d.tokens_used || 0), 0)
      };
    });
    
    return usage;
  } catch (e) {
    console.error('Error in getApiUsage:', e);
    return {};
  }
}