// api/monitoring/costs.js - Get API cost analytics
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

  const { 
    timeRange = '30d', 
    groupBy = 'day',
    model,
    service,
    workflow
  } = req.query;

  // Convert time range to date
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 30;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    // Get cost analytics data in parallel
    const [totalCosts, dailyCosts, modelBreakdown, serviceBreakdown, workflowCosts] = await Promise.all([
      getTotalCosts(startDate, model, service, workflow),
      getDailyCosts(startDate, groupBy, model, service, workflow),
      getModelBreakdown(startDate, model, service, workflow),
      getServiceBreakdown(startDate, model, service, workflow),
      getWorkflowCosts(startDate, model, service, workflow)
    ]);

    const costAnalytics = {
      summary: totalCosts,
      trends: dailyCosts,
      breakdowns: {
        by_model: modelBreakdown,
        by_service: serviceBreakdown,
        by_workflow: workflowCosts
      },
      filters: {
        time_range: timeRange,
        group_by: groupBy,
        model,
        service,
        workflow
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      data: costAnalytics
    });

  } catch (error) {
    console.error('Error fetching cost analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch cost analytics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function getTotalCosts(startDate, model, service, workflow) {
  try {
    let query = supabase
      .from('api_usage')
      .select('total_cost, total_tokens, prompt_tokens, completion_tokens')
      .gte('called_at', startDate.toISOString())
      .not('total_cost', 'is', null);

    // Apply filters
    if (model) query = query.eq('model_name', model);
    if (service) query = query.eq('api_service', service);
    if (workflow) query = query.eq('workflow_name', workflow);

    const { data, error } = await query;

    if (error) throw error;

    const usage = data || [];
    
    const totalCost = usage.reduce((sum, u) => sum + (u.total_cost || 0), 0);
    const totalTokens = usage.reduce((sum, u) => sum + (u.total_tokens || 0), 0);
    const totalPromptTokens = usage.reduce((sum, u) => sum + (u.prompt_tokens || 0), 0);
    const totalCompletionTokens = usage.reduce((sum, u) => sum + (u.completion_tokens || 0), 0);
    const totalCalls = usage.length;

    // Calculate averages
    const avgCostPerCall = totalCalls > 0 ? totalCost / totalCalls : 0;
    const avgCostPer1kTokens = totalTokens > 0 ? (totalCost / totalTokens) * 1000 : 0;

    return {
      total_cost: Math.round(totalCost * 100) / 100,
      total_tokens: totalTokens,
      total_prompt_tokens: totalPromptTokens,
      total_completion_tokens: totalCompletionTokens,
      total_calls: totalCalls,
      avg_cost_per_call: Math.round(avgCostPerCall * 10000) / 10000,
      avg_cost_per_1k_tokens: Math.round(avgCostPer1kTokens * 10000) / 10000
    };
  } catch (error) {
    console.error('Error calculating total costs:', error);
    return {
      total_cost: 0,
      total_tokens: 0,
      total_prompt_tokens: 0,
      total_completion_tokens: 0,
      total_calls: 0,
      avg_cost_per_call: 0,
      avg_cost_per_1k_tokens: 0
    };
  }
}

async function getDailyCosts(startDate, groupBy, model, service, workflow) {
  try {
    let query = supabase
      .from('api_usage')
      .select('called_at, total_cost, total_tokens')
      .gte('called_at', startDate.toISOString())
      .not('total_cost', 'is', null)
      .order('called_at', { ascending: true });

    // Apply filters
    if (model) query = query.eq('model_name', model);
    if (service) query = query.eq('api_service', service);
    if (workflow) query = query.eq('workflow_name', workflow);

    const { data, error } = await query;

    if (error) throw error;

    const usage = data || [];
    
    // Group by time period
    const groupedData = {};
    usage.forEach(u => {
      const date = new Date(u.called_at);
      let key;
      
      if (groupBy === 'hour') {
        key = date.toISOString().slice(0, 13) + ':00:00Z'; // Group by hour
      } else {
        key = date.toISOString().slice(0, 10); // Group by day
      }
      
      if (!groupedData[key]) {
        groupedData[key] = {
          date: key,
          cost: 0,
          tokens: 0,
          calls: 0
        };
      }
      
      groupedData[key].cost += u.total_cost || 0;
      groupedData[key].tokens += u.total_tokens || 0;
      groupedData[key].calls += 1;
    });

    // Convert to array and sort
    const trends = Object.values(groupedData)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(item => ({
        ...item,
        cost: Math.round(item.cost * 100) / 100
      }));

    return trends;
  } catch (error) {
    console.error('Error calculating daily costs:', error);
    return [];
  }
}

async function getModelBreakdown(startDate, modelFilter, service, workflow) {
  try {
    let query = supabase
      .from('api_usage')
      .select('model_name, total_cost, total_tokens')
      .gte('called_at', startDate.toISOString())
      .not('total_cost', 'is', null);

    // Apply filters
    if (modelFilter) query = query.eq('model_name', modelFilter);
    if (service) query = query.eq('api_service', service);
    if (workflow) query = query.eq('workflow_name', workflow);

    const { data, error } = await query;

    if (error) throw error;

    const usage = data || [];
    
    // Group by model
    const modelStats = {};
    usage.forEach(u => {
      const model = u.model_name;
      if (!modelStats[model]) {
        modelStats[model] = {
          model_name: model,
          total_cost: 0,
          total_tokens: 0,
          total_calls: 0
        };
      }
      
      modelStats[model].total_cost += u.total_cost || 0;
      modelStats[model].total_tokens += u.total_tokens || 0;
      modelStats[model].total_calls += 1;
    });

    // Convert to array and calculate percentages
    const totalCost = Object.values(modelStats).reduce((sum, m) => sum + m.total_cost, 0);
    
    const breakdown = Object.values(modelStats)
      .map(model => ({
        ...model,
        total_cost: Math.round(model.total_cost * 100) / 100,
        cost_percentage: totalCost > 0 ? Math.round((model.total_cost / totalCost) * 100 * 100) / 100 : 0,
        avg_cost_per_call: model.total_calls > 0 ? Math.round((model.total_cost / model.total_calls) * 10000) / 10000 : 0
      }))
      .sort((a, b) => b.total_cost - a.total_cost);

    return breakdown;
  } catch (error) {
    console.error('Error calculating model breakdown:', error);
    return [];
  }
}

async function getServiceBreakdown(startDate, model, serviceFilter, workflow) {
  try {
    let query = supabase
      .from('api_usage')
      .select('api_service, total_cost, total_tokens')
      .gte('called_at', startDate.toISOString())
      .not('total_cost', 'is', null);

    // Apply filters
    if (model) query = query.eq('model_name', model);
    if (serviceFilter) query = query.eq('api_service', serviceFilter);
    if (workflow) query = query.eq('workflow_name', workflow);

    const { data, error } = await query;

    if (error) throw error;

    const usage = data || [];
    
    // Group by service
    const serviceStats = {};
    usage.forEach(u => {
      const service = u.api_service;
      if (!serviceStats[service]) {
        serviceStats[service] = {
          api_service: service,
          total_cost: 0,
          total_tokens: 0,
          total_calls: 0
        };
      }
      
      serviceStats[service].total_cost += u.total_cost || 0;
      serviceStats[service].total_tokens += u.total_tokens || 0;
      serviceStats[service].total_calls += 1;
    });

    // Convert to array and calculate percentages
    const totalCost = Object.values(serviceStats).reduce((sum, s) => sum + s.total_cost, 0);
    
    const breakdown = Object.values(serviceStats)
      .map(service => ({
        ...service,
        total_cost: Math.round(service.total_cost * 100) / 100,
        cost_percentage: totalCost > 0 ? Math.round((service.total_cost / totalCost) * 100 * 100) / 100 : 0,
        avg_cost_per_call: service.total_calls > 0 ? Math.round((service.total_cost / service.total_calls) * 10000) / 10000 : 0
      }))
      .sort((a, b) => b.total_cost - a.total_cost);

    return breakdown;
  } catch (error) {
    console.error('Error calculating service breakdown:', error);
    return [];
  }
}

async function getWorkflowCosts(startDate, model, service, workflowFilter) {
  try {
    let query = supabase
      .from('api_usage')
      .select('workflow_name, total_cost, total_tokens')
      .gte('called_at', startDate.toISOString())
      .not('total_cost', 'is', null)
      .not('workflow_name', 'is', null);

    // Apply filters
    if (model) query = query.eq('model_name', model);
    if (service) query = query.eq('api_service', service);
    if (workflowFilter) query = query.eq('workflow_name', workflowFilter);

    const { data, error } = await query;

    if (error) throw error;

    const usage = data || [];
    
    // Group by workflow
    const workflowStats = {};
    usage.forEach(u => {
      const workflow = u.workflow_name;
      if (!workflowStats[workflow]) {
        workflowStats[workflow] = {
          workflow_name: workflow,
          total_cost: 0,
          total_tokens: 0,
          total_calls: 0
        };
      }
      
      workflowStats[workflow].total_cost += u.total_cost || 0;
      workflowStats[workflow].total_tokens += u.total_tokens || 0;
      workflowStats[workflow].total_calls += 1;
    });

    // Convert to array and calculate percentages
    const totalCost = Object.values(workflowStats).reduce((sum, w) => sum + w.total_cost, 0);
    
    const breakdown = Object.values(workflowStats)
      .map(workflow => ({
        ...workflow,
        total_cost: Math.round(workflow.total_cost * 100) / 100,
        cost_percentage: totalCost > 0 ? Math.round((workflow.total_cost / totalCost) * 100 * 100) / 100 : 0,
        avg_cost_per_call: workflow.total_calls > 0 ? Math.round((workflow.total_cost / workflow.total_calls) * 10000) / 10000 : 0
      }))
      .sort((a, b) => b.total_cost - a.total_cost);

    return breakdown;
  } catch (error) {
    console.error('Error calculating workflow costs:', error);
    return [];
  }
}