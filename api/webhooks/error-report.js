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

  const { workflow_name, timestamp, error, node_name, lead_data } = req.body;

  if (!workflow_name || !timestamp || !error || !node_name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    let leadInfo = {};
    if (lead_data) {
      try {
        leadInfo = JSON.parse(lead_data);
      } catch (e) {
        console.warn('Failed to parse lead_data:', e);
        leadInfo = { raw_data: lead_data };
      }
    }

    const leadSource = workflow_name.includes('LinkedIn') ? 'linkedin' : 'apollo';
    
    // Get active execution or create new one
    let executionId = await getActiveExecution(workflow_name);
    if (!executionId) {
      const { data, error: insertError } = await supabase
        .from('workflow_executions')
        .insert({
          workflow_name,
          status: 'started',
          campaign_name: leadInfo.campaign_name || 'Unknown',
          started_at: new Date()
        })
        .select('id')
        .single();
      
      if (insertError) {
        console.error('Error creating execution:', insertError);
      } else {
        executionId = data.id;
      }
    }
    
    // Insert error record
    const { error: errorInsertError } = await supabase.from('workflow_errors').insert({
      execution_id: executionId,
      workflow_name,
      node_name,
      error_type: determineErrorType(error),
      error_message: error.message || JSON.stringify(error),
      error_details: error,
      lead_id: leadInfo.id,
      lead_name: leadInfo.full_name,
      lead_company: leadInfo.company,
      lead_data: leadInfo,
      occurred_at: timestamp,
      severity: determineSeverity(error, node_name)
    });

    if (errorInsertError) {
      console.error('Error inserting error record:', errorInsertError);
    }
    
    // Update or insert lead processing status
    if (leadInfo.id) {
      const { error: statusError } = await supabase.from('lead_processing_status').upsert({
        lead_id: leadInfo.id,
        lead_source: leadSource,
        execution_id: executionId,
        [`${getNodeType(node_name)}_status`]: 'failed',
        error_count: 1, // This would need to be incremented properly in a real implementation
        last_error: error.message || JSON.stringify(error),
        updated_at: new Date()
      }, {
        onConflict: 'lead_id,lead_source,execution_id'
      });

      if (statusError) {
        console.error('Error updating lead status:', statusError);
      }
    }

    res.status(200).json({ success: true });
  } catch (e) {
    console.error('Error processing error report:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function determineErrorType(error) {
  const message = error.message || JSON.stringify(error).toLowerCase();
  
  if (message.includes('timeout')) return 'timeout';
  if (message.includes('rate limit')) return 'rate_limit';
  if (message.includes('api')) return 'api_error';
  if (message.includes('validation')) return 'validation_error';
  if (message.includes('auth')) return 'authentication_error';
  if (message.includes('network')) return 'network_error';
  return 'unknown';
}

function determineSeverity(error, nodeName) {
  const message = error.message || JSON.stringify(error).toLowerCase();
  
  // Critical errors
  if (message.includes('database') || message.includes('connection')) return 'critical';
  if (nodeName === 'Update a row') return 'critical';
  
  // High priority errors
  if (message.includes('auth') || message.includes('permission')) return 'high';
  if (nodeName.includes('Research Agent') || nodeName.includes('Outreach Agent')) return 'high';
  
  // Medium priority errors
  if (message.includes('rate limit') || message.includes('timeout')) return 'medium';
  
  // Low priority errors
  return 'low';
}

function getNodeType(nodeName) {
  if (nodeName.includes('Research')) return 'research';
  if (nodeName.includes('Outreach')) return 'outreach';
  if (nodeName.includes('Update')) return 'database_update';
  if (nodeName.includes('Get Leads')) return 'lead_fetch';
  if (nodeName.includes('Set Campaign')) return 'campaign_setup';
  if (nodeName.includes('Code') || nodeName.includes('Filter')) return 'processing';
  return 'other';
}

async function getActiveExecution(workflowName) {
  try {
    const { data, error } = await supabase
      .from('workflow_executions')
      .select('id')
      .eq('workflow_name', workflowName)
      .eq('status', 'started')
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