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

  const { leadIds, source, workflowName, retryType = 'full' } = req.body;

  if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({ error: 'leadIds must be a non-empty array' });
  }

  if (!source || !['linkedin', 'apollo'].includes(source)) {
    return res.status(400).json({ error: 'Invalid source. Must be "linkedin" or "apollo"' });
  }

  if (!workflowName) {
    return res.status(400).json({ error: 'workflowName is required' });
  }

  if (!['full', 'from_failure', 'research_only', 'outreach_only'].includes(retryType)) {
    return res.status(400).json({ error: 'Invalid retryType' });
  }

  try {
    // Validate that all leads exist
    const tableName = source === 'linkedin' ? 'LinkedIn' : 'Apollo';
    const { data: existingLeads, error: validationError } = await supabase
      .from(tableName)
      .select('id, full_name, company')
      .in('id', leadIds);

    if (validationError) {
      console.error('Error validating leads:', validationError);
      return res.status(500).json({ error: 'Failed to validate leads' });
    }

    const existingLeadIds = existingLeads.map(lead => lead.id);
    const missingLeadIds = leadIds.filter(id => !existingLeadIds.includes(id));

    if (missingLeadIds.length > 0) {
      return res.status(400).json({ 
        error: 'Some leads not found', 
        missingLeadIds 
      });
    }

    // Reset processed flag for failed leads
    const { error: resetError } = await supabase
      .from(tableName)
      .update({ 
        processed: false,
        updated_at: new Date()
      })
      .in('id', leadIds);

    if (resetError) {
      console.error('Error resetting processed flag:', resetError);
      return res.status(500).json({ error: 'Failed to reset lead processing status' });
    }

    // Update processing status based on retry type
    const statusUpdate = getStatusUpdateForRetryType(retryType);
    
    const { error: statusError } = await supabase
      .from('lead_processing_status')
      .upsert(
        leadIds.map(leadId => ({
          lead_id: leadId,
          lead_source: source,
          ...statusUpdate,
          retry_count: supabase.raw('COALESCE(retry_count, 0) + 1'),
          last_retry_at: new Date(),
          updated_at: new Date()
        })),
        {
          onConflict: 'lead_id,lead_source',
          ignoreDuplicates: false
        }
      );

    if (statusError) {
      console.error('Error updating processing status:', statusError);
      return res.status(500).json({ error: 'Failed to update processing status' });
    }

    // Log retry attempt
    const { error: logError } = await supabase
      .from('retry_attempts')
      .insert(
        leadIds.map(leadId => ({
          lead_id: leadId,
          lead_source: source,
          workflow_name: workflowName,
          retry_type: retryType,
          requested_at: new Date(),
          status: 'queued'
        }))
      );

    if (logError) {
      console.error('Error logging retry attempts:', logError);
      // Don't fail the request if logging fails
    }

    // Trigger workflow webhook if configured
    const webhookResult = await triggerWorkflowWebhook(workflowName, leadIds, retryType);

    const response = {
      success: true,
      message: `${leadIds.length} leads queued for retry`,
      retryType: retryType,
      leadIds: leadIds,
      webhook: webhookResult,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (e) {
    console.error('Error retrying leads:', e);
    res.status(500).json({ error: 'Internal server error', details: e.message });
  }
}

function getStatusUpdateForRetryType(retryType) {
  const baseUpdate = {
    last_error: null,
    error_count: 0
  };

  switch (retryType) {
    case 'full':
      return {
        ...baseUpdate,
        research_status: 'pending',
        outreach_status: 'pending',
        database_update_status: 'pending',
        research_started_at: null,
        research_completed_at: null,
        outreach_started_at: null,
        outreach_completed_at: null,
        database_update_started_at: null,
        database_updated_at: null
      };
    
    case 'from_failure':
      // Only reset the failed step and subsequent steps
      return {
        ...baseUpdate,
        // This would need more complex logic to determine which step failed
        // For now, treat as full retry
        research_status: 'pending',
        outreach_status: 'pending',
        database_update_status: 'pending'
      };
    
    case 'research_only':
      return {
        ...baseUpdate,
        research_status: 'pending',
        research_started_at: null,
        research_completed_at: null
      };
    
    case 'outreach_only':
      return {
        ...baseUpdate,
        outreach_status: 'pending',
        outreach_started_at: null,
        outreach_completed_at: null
      };
    
    default:
      return baseUpdate;
  }
}

async function triggerWorkflowWebhook(workflowName, leadIds, retryType) {
  try {
    // Get webhook URL from environment variables
    const webhookUrl = workflowName.includes('LinkedIn') 
      ? process.env.N8N_WEBHOOK_LINKEDIN 
      : process.env.N8N_WEBHOOK_APOLLO;

    if (!webhookUrl) {
      console.warn(`No webhook URL configured for ${workflowName}`);
      return { triggered: false, reason: 'No webhook URL configured' };
    }

    const webhookPayload = {
      action: 'retry',
      leadIds: leadIds,
      retryType: retryType,
      timestamp: new Date().toISOString(),
      source: 'monitoring_api'
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'LeadGenOS-Monitoring/1.0'
      },
      body: JSON.stringify(webhookPayload),
      timeout: 30000 // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status ${response.status}: ${response.statusText}`);
    }

    return { 
      triggered: true, 
      status: response.status,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error triggering webhook:', error);
    return { 
      triggered: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}