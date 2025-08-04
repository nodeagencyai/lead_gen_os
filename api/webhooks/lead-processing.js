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

  const {
    lead_source,
    stage,
    status,
    total_scraped,
    total_qualified,
    filter_rate,
    leads_added,
    scrape_url,
    duration_ms,
    result_data
  } = req.body;

  // Validate required fields
  if (!lead_source || !stage || !status) {
    return res.status(400).json({
      error: 'Missing required fields: lead_source, stage, status'
    });
  }

  // Validate lead_source
  if (!['apollo', 'linkedin'].includes(lead_source)) {
    return res.status(400).json({
      error: 'Invalid lead_source. Must be "apollo" or "linkedin"'
    });
  }

  // Validate stage
  if (!['scraping', 'filtering', 'database_update'].includes(stage)) {
    return res.status(400).json({
      error: 'Invalid stage. Must be one of: scraping, filtering, database_update'
    });
  }

  // Validate status
  if (!['started', 'completed', 'failed'].includes(status)) {
    return res.status(400).json({
      error: 'Invalid status. Must be one of: started, completed, failed'
    });
  }

  try {
    // Get or create active execution
    let executionId = await getActiveExecution(lead_source);
    if (!executionId) {
      const { data, error: insertError } = await supabase
        .from('workflow_executions')
        .insert({
          workflow_name: `LeadGenOS (${lead_source.charAt(0).toUpperCase() + lead_source.slice(1)})`,
          status: 'started',
          started_at: new Date()
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error creating execution:', insertError);
        return res.status(500).json({ error: 'Failed to create execution record' });
      }
      executionId = data.id;
    }

    // Prepare processing record
    const processingRecord = {
      execution_id: executionId,
      lead_source,
      stage,
      status,
      processed_at: new Date(),
      duration_ms: duration_ms || null,
      result_data: result_data || null
    };

    // Add stage-specific metrics
    if (stage === 'scraping') {
      processingRecord.total_scraped = total_scraped || 0;
      processingRecord.scrape_url = scrape_url || null;
    } else if (stage === 'filtering') {
      processingRecord.total_scraped = total_scraped || 0;
      processingRecord.total_qualified = total_qualified || 0;
      processingRecord.filter_rate = filter_rate || 0;
    } else if (stage === 'database_update') {
      processingRecord.leads_added = leads_added || 0;
    }

    // Insert processing record
    const { data, error } = await supabase
      .from('lead_processing_metrics')
      .insert(processingRecord)
      .select()
      .single();

    if (error) {
      console.error('Error inserting lead processing record:', error);
      return res.status(500).json({
        error: 'Failed to record lead processing metrics',
        details: error.message
      });
    }

    console.log(`✅ Recorded ${stage} ${status} for ${lead_source}: ${JSON.stringify(processingRecord)}`);

    // Update execution with latest metrics if completed
    if (status === 'completed' && stage === 'database_update') {
      await supabase
        .from('workflow_executions')
        .update({
          leads_processed: leads_added || 0,
          updated_at: new Date()
        })
        .eq('id', executionId);
    }

    res.status(200).json({
      success: true,
      data: {
        id: data.id,
        execution_id: executionId,
        lead_source,
        stage,
        status,
        message: `Lead processing ${status} recorded successfully`
      }
    });

  } catch (e) {
    console.error('Error processing lead metrics:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getActiveExecution(leadSource) {
  try {
    const workflowName = `LeadGenOS (${leadSource.charAt(0).toUpperCase() + leadSource.slice(1)})`;
    
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