import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { workflow_name, status, error_node, processed_count } = req.body;

  if (!workflow_name || !status) {
    return res.status(400).json({ error: 'Missing required fields: workflow_name and status' });
  }

  if (!['completed', 'failed', 'started'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be: completed, failed, or started' });
  }

  try {
    if (status === 'started') {
      // Create new execution record
      const { data, error: insertError } = await supabase
        .from('workflow_executions')
        .insert({
          workflow_name,
          status: 'started',
          started_at: new Date()
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error creating execution:', insertError);
        return res.status(500).json({ error: 'Failed to create execution record' });
      }

      return res.status(200).json({ 
        success: true, 
        executionId: data.id,
        message: 'Workflow execution started'
      });
    }

    // For completed/failed status, find the active execution
    const executionId = await getActiveExecution(workflow_name);
    
    if (!executionId) {
      return res.status(400).json({ error: 'No active execution found for this workflow' });
    }

    if (status === 'completed') {
      const updateData = {
        status: 'completed',
        completed_at: new Date()
      };

      // Add processed count if provided and valid
      if (processed_count && processed_count !== 'unknown') {
        const count = parseInt(processed_count);
        if (!isNaN(count)) {
          updateData.leads_processed = count;
        }
      }

      const { error: updateError } = await supabase
        .from('workflow_executions')
        .update(updateData)
        .eq('id', executionId);

      if (updateError) {
        console.error('Error updating execution to completed:', updateError);
        return res.status(500).json({ error: 'Failed to update execution status' });
      }

      // Update workflow health metrics
      await updateWorkflowHealth(workflow_name, 'completed');

    } else if (status === 'failed') {
      const updateData = {
        status: 'failed',
        completed_at: new Date(),
        error_summary: error_node ? `Failed at node: ${error_node}` : 'Workflow execution failed'
      };

      const { error: updateError } = await supabase
        .from('workflow_executions')
        .update(updateData)
        .eq('id', executionId);

      if (updateError) {
        console.error('Error updating execution to failed:', updateError);
        return res.status(500).json({ error: 'Failed to update execution status' });
      }

      // Update workflow health metrics
      await updateWorkflowHealth(workflow_name, 'failed', error_node);
    }

    res.status(200).json({ 
      success: true,
      executionId: executionId,
      message: `Workflow ${status} successfully recorded`
    });
  } catch (e) {
    console.error('Error processing status update:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getActiveExecution(workflowName) {
  try {
    const { data, error } = await supabase
      .from('workflow_executions')
      .select('id')
      .eq('workflow_name', workflowName)
      .in('status', ['started', 'partial'])
      .order('started_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error getting active execution:', error);
    }
    
    return data?.id;
  } catch (e) {
    console.error('Error in getActiveExecution:', e);
    return null;
  }
}

async function updateWorkflowHealth(workflowName, status, errorNode = null) {
  try {
    const healthData = {
      workflow_name: workflowName,
      status: status,
      started_at: new Date(),
      health_score: calculateHealthScore(status),
      last_execution_status: status
    };

    if (status === 'failed') {
      healthData.critical_errors = 1;
      healthData.error_details = errorNode ? { failed_node: errorNode } : null;
    }

    // Insert or update workflow health record
    const { error } = await supabase
      .from('workflow_health')
      .upsert(healthData, {
        onConflict: 'workflow_name,started_at',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('Error updating workflow health:', error);
    }
  } catch (e) {
    console.error('Error in updateWorkflowHealth:', e);
  }
}

function calculateHealthScore(status) {
  // Simple health scoring - can be made more sophisticated
  if (status === 'completed') return 100;
  if (status === 'failed') return 0;
  return 50; // partial/unknown
}