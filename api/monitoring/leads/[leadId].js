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

  const { leadId } = req.query;
  const { source } = req.query;

  if (!leadId || !source) {
    return res.status(400).json({ error: 'Missing required parameters: leadId and source' });
  }

  if (!['linkedin', 'apollo'].includes(source)) {
    return res.status(400).json({ error: 'Invalid source. Must be "linkedin" or "apollo"' });
  }

  try {
    // Get lead info from appropriate table
    const tableName = source === 'linkedin' ? 'LinkedIn' : 'Apollo';
    const { data: leadData, error: leadError } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError) {
      if (leadError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Lead not found' });
      }
      console.error('Error fetching lead data:', leadError);
      return res.status(500).json({ error: 'Failed to fetch lead data' });
    }

    // Get processing status
    const { data: processingData, error: processingError } = await supabase
      .from('lead_processing_status')
      .select('*')
      .eq('lead_id', leadId)
      .eq('lead_source', source)
      .order('created_at', { ascending: false })
      .limit(1);

    if (processingError) {
      console.error('Error fetching processing status:', processingError);
    }

    const latestProcessing = processingData?.[0];

    // Get errors for this lead
    const { data: errors, error: errorsError } = await supabase
      .from('workflow_errors')
      .select('*')
      .eq('lead_id', leadId)
      .order('occurred_at', { ascending: false });

    if (errorsError) {
      console.error('Error fetching lead errors:', errorsError);
    }

    // Get execution details if available
    let executionData = null;
    if (latestProcessing?.execution_id) {
      const { data: execData, error: execError } = await supabase
        .from('workflow_executions')
        .select('*')
        .eq('id', latestProcessing.execution_id)
        .single();

      if (execError) {
        console.error('Error fetching execution data:', execError);
      } else {
        executionData = execData;
      }
    }

    // Determine overall processing status
    const overallStatus = determineOverallStatus(latestProcessing, errors);

    const response = {
      lead: {
        id: leadData?.id,
        name: leadData?.full_name,
        company: leadData?.company,
        email: leadData?.email,
        title: leadData?.title,
        source: source,
        createdAt: leadData?.created_at,
        processed: leadData?.processed
      },
      processing: {
        status: overallStatus,
        research: {
          status: latestProcessing?.research_status || 'pending',
          completedAt: latestProcessing?.research_completed_at,
          duration: calculateDuration(latestProcessing?.research_started_at, latestProcessing?.research_completed_at)
        },
        outreach: {
          status: latestProcessing?.outreach_status || 'pending',
          completedAt: latestProcessing?.outreach_completed_at,
          duration: calculateDuration(latestProcessing?.outreach_started_at, latestProcessing?.outreach_completed_at)
        },
        databaseUpdate: {
          status: latestProcessing?.database_update_status || 'pending',
          completedAt: latestProcessing?.database_updated_at,
          duration: calculateDuration(latestProcessing?.database_update_started_at, latestProcessing?.database_updated_at)
        }
      },
      errors: (errors || []).map(error => ({
        id: error.id,
        node: error.node_name,
        type: error.error_type,
        severity: error.severity,
        message: error.error_message,
        occurredAt: error.occurred_at,
        details: error.error_details
      })),
      execution: executionData ? {
        id: executionData.id,
        workflowName: executionData.workflow_name,
        status: executionData.status,
        startedAt: executionData.started_at,
        completedAt: executionData.completed_at,
        campaignName: executionData.campaign_name
      } : null,
      metrics: {
        processingTime: latestProcessing?.processing_time_seconds,
        errorCount: latestProcessing?.error_count || 0,
        retryCount: latestProcessing?.retry_count || 0,
        lastUpdated: latestProcessing?.updated_at
      }
    };

    res.status(200).json(response);
  } catch (e) {
    console.error('Error fetching lead status:', e);
    res.status(500).json({ error: 'Internal server error', details: e.message });
  }
}

function determineOverallStatus(processing, errors) {
  if (!processing) return 'not_started';

  const hasRecentErrors = errors && errors.some(error => {
    const errorTime = new Date(error.occurred_at);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return errorTime > oneHourAgo;
  });

  if (hasRecentErrors) return 'failed';
  
  if (processing.database_update_status === 'completed') return 'completed';
  if (processing.database_update_status === 'in_progress') return 'in_progress';
  if (processing.outreach_status === 'in_progress') return 'in_progress';
  if (processing.research_status === 'in_progress') return 'in_progress';
  
  return 'pending';
}

function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return null;
  
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMs = end - start;
  
  if (durationMs < 0) return null;
  
  return Math.round(durationMs / 1000); // Return duration in seconds
}