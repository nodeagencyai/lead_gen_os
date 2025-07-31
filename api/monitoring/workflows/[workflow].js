// api/monitoring/workflows/[workflow].js - Get specific workflow details
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
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

  const { workflow } = req.query;
  const { timeRange = '24h', limit = 50, offset = 0 } = req.query;

  if (!workflow) {
    return res.status(400).json({ error: 'Workflow parameter is required' });
  }

  // Decode workflow name (handle URL encoding)
  const workflowName = decodeURIComponent(workflow);
  
  // Convert time range to hours
  const hours = timeRange === '7d' ? 168 : timeRange === '30d' ? 720 : 24;
  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

  try {
    // Get workflow executions, errors, and performance data in parallel
    const [executions, errors, performance, apiUsage, leadStats] = await Promise.all([
      getWorkflowExecutions(workflowName, startTime, parseInt(limit), parseInt(offset)),
      getWorkflowErrors(workflowName, startTime),
      getWorkflowPerformance(workflowName, startTime),
      getWorkflowApiUsage(workflowName, startTime),
      getWorkflowLeadStats(workflowName, startTime)
    ]);

    const workflowDetails = {
      workflow_name: workflowName,
      time_range: timeRange,
      executions,
      errors,
      performance,
      api_usage: apiUsage,
      lead_stats: leadStats,
      summary: {
        total_executions: executions.data?.length || 0,
        success_rate: calculateSuccessRate(executions.data || []),
        total_errors: errors.total,
        avg_execution_time: calculateAverageExecutionTime(executions.data || []),
        total_api_cost: apiUsage.total_cost || 0,
        leads_processed: leadStats.total_processed || 0
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      data: workflowDetails
    });

  } catch (error) {
    console.error('Error fetching workflow details:', error);
    res.status(500).json({
      error: 'Failed to fetch workflow details',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function getWorkflowExecutions(workflowName, startTime, limit, offset) {
  try {
    const { data, error, count } = await supabase
      .from('workflow_executions')
      .select('*', { count: 'exact' })
      .eq('workflow_name', workflowName)
      .gte('started_at', startTime.toISOString())
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      data: data || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        has_more: (offset + limit) < (count || 0)
      }
    };
  } catch (error) {
    console.error('Error fetching workflow executions:', error);
    return { data: [], pagination: { limit, offset, total: 0, has_more: false } };
  }
}

async function getWorkflowErrors(workflowName, startTime) {
  try {
    const { data, error } = await supabase
      .from('workflow_errors')
      .select(`
        *,
        error_types(severity, description, suggested_action)
      `)
      .eq('workflow_name', workflowName)
      .gte('occurred_at', startTime.toISOString())
      .order('occurred_at', { ascending: false });

    if (error) throw error;

    const errors = data || [];
    
    // Group errors by type and severity
    const by_type = {};
    const by_severity = { critical: 0, high: 0, medium: 0, low: 0 };
    const by_node = {};
    const recent_errors = errors.slice(0, 10);

    errors.forEach(err => {
      // Count by type
      by_type[err.error_type] = (by_type[err.error_type] || 0) + 1;
      
      // Count by severity
      if (by_severity.hasOwnProperty(err.severity)) {
        by_severity[err.severity]++;
      }
      
      // Count by node
      by_node[err.node_name] = (by_node[err.node_name] || 0) + 1;
    });

    return {
      total: errors.length,
      by_type,
      by_severity,
      by_node,
      recent_errors: recent_errors.map(err => ({
        id: err.id,
        node_name: err.node_name,
        error_type: err.error_type,
        error_message: err.error_message,
        severity: err.severity,
        occurred_at: err.occurred_at,
        lead_name: err.lead_name,
        lead_company: err.lead_company,
        resolved: err.resolved,
        retry_count: err.retry_count
      }))
    };
  } catch (error) {
    console.error('Error fetching workflow errors:', error);
    return { total: 0, by_type: {}, by_severity: {}, by_node: {}, recent_errors: [] };
  }
}

async function getWorkflowPerformance(workflowName, startTime) {
  try {
    const { data, error } = await supabase
      .from('workflow_performance')
      .select('*')
      .eq('workflow_name', workflowName)
      .gte('date', startTime.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) throw error;

    const performance = data || [];
    
    // Calculate aggregated metrics
    const totalExecutions = performance.reduce((sum, p) => sum + p.total_executions, 0);
    const totalSuccessful = performance.reduce((sum, p) => sum + p.successful_executions, 0);
    const totalFailed = performance.reduce((sum, p) => sum + p.failed_executions, 0);
    
    const avgSuccessRate = totalExecutions > 0 ? (totalSuccessful / totalExecutions) * 100 : 0;
    const avgDuration = performance.length > 0 ? 
      performance.reduce((sum, p) => sum + (p.avg_duration_ms || 0), 0) / performance.length : 0;

    return {
      daily_metrics: performance,
      summary: {
        total_executions: totalExecutions,
        successful_executions: totalSuccessful,
        failed_executions: totalFailed,
        success_rate: Math.round(avgSuccessRate * 100) / 100,
        avg_duration_ms: Math.round(avgDuration)
      }
    };
  } catch (error) {
    console.error('Error fetching workflow performance:', error);
    return { daily_metrics: [], summary: {} };
  }
}

async function getWorkflowApiUsage(workflowName, startTime) {
  try {
    const { data, error } = await supabase
      .from('api_usage')
      .select('*')
      .eq('workflow_name', workflowName)
      .gte('called_at', startTime.toISOString());

    if (error) throw error;

    const usage = data || [];
    
    // Calculate totals
    const total_calls = usage.length;
    const total_tokens = usage.reduce((sum, u) => sum + (u.total_tokens || 0), 0);
    const total_cost = usage.reduce((sum, u) => sum + (u.total_cost || 0), 0);
    
    // Group by model
    const by_model = {};
    usage.forEach(u => {
      if (!by_model[u.model_name]) {
        by_model[u.model_name] = {
          calls: 0,
          tokens: 0,
          cost: 0,
          avg_duration_ms: 0
        };
      }
      by_model[u.model_name].calls++;
      by_model[u.model_name].tokens += u.total_tokens || 0;
      by_model[u.model_name].cost += u.total_cost || 0;
    });

    // Calculate averages
    Object.keys(by_model).forEach(model => {
      const modelUsage = usage.filter(u => u.model_name === model);
      by_model[model].avg_duration_ms = modelUsage.length > 0 ?
        modelUsage.reduce((sum, u) => sum + (u.duration_ms || 0), 0) / modelUsage.length : 0;
    });

    return {
      total_calls,
      total_tokens,
      total_cost: Math.round(total_cost * 100) / 100,
      by_model,
      recent_calls: usage.slice(-10).map(u => ({
        id: u.id,
        model_name: u.model_name,
        node_name: u.node_name,
        tokens: u.total_tokens,
        cost: u.total_cost,
        duration_ms: u.duration_ms,
        called_at: u.called_at
      }))
    };
  } catch (error) {
    console.error('Error fetching workflow API usage:', error);
    return { total_calls: 0, total_tokens: 0, total_cost: 0, by_model: {}, recent_calls: [] };
  }
}

async function getWorkflowLeadStats(workflowName, startTime) {
  try {
    const { data, error } = await supabase
      .from('lead_processing_status')
      .select(`
        *,
        workflow_executions!inner(workflow_name)
      `)
      .eq('workflow_executions.workflow_name', workflowName)
      .gte('created_at', startTime.toISOString());

    if (error) throw error;

    const leads = data || [];
    
    const stats = {
      total_processed: leads.length,
      completed: leads.filter(l => l.database_update_status === 'completed').length,
      failed: leads.filter(l => l.error_count > 0).length,
      in_progress: leads.filter(l => 
        l.research_status === 'in_progress' || 
        l.outreach_status === 'in_progress' || 
        l.database_update_status === 'in_progress'
      ).length,
      pending: leads.filter(l => 
        l.research_status === 'pending' || 
        l.outreach_status === 'pending' || 
        l.database_update_status === 'pending'
      ).length
    };

    // Calculate processing times
    const completedLeads = leads.filter(l => l.total_processing_time_ms);
    stats.avg_processing_time_ms = completedLeads.length > 0 ?
      completedLeads.reduce((sum, l) => sum + l.total_processing_time_ms, 0) / completedLeads.length : 0;

    return stats;
  } catch (error) {
    console.error('Error fetching workflow lead stats:', error);
    return { total_processed: 0, completed: 0, failed: 0, in_progress: 0, pending: 0 };
  }
}

function calculateSuccessRate(executions) {
  if (!executions.length) return 0;
  const completed = executions.filter(e => e.status === 'completed').length;
  return Math.round((completed / executions.length) * 100 * 100) / 100;
}

function calculateAverageExecutionTime(executions) {
  const completedExecutions = executions.filter(e => e.completed_at && e.started_at);
  if (!completedExecutions.length) return 0;
  
  const totalTime = completedExecutions.reduce((sum, e) => {
    const duration = new Date(e.completed_at) - new Date(e.started_at);
    return sum + duration;
  }, 0);
  
  return Math.round(totalTime / completedExecutions.length / 1000); // Convert to seconds
}