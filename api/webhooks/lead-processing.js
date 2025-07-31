// api/webhooks/lead-processing.js - Update lead processing stages
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
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
    lead_id, 
    lead_source, 
    execution_id,
    stage, 
    status, 
    started_at, 
    completed_at,
    duration_ms,
    error_message,
    lead_data,
    result_data
  } = req.body;

  // Validate required fields
  if (!lead_id || !lead_source || !stage || !status) {
    return res.status(400).json({ 
      error: 'Missing required fields: lead_id, lead_source, stage, status' 
    });
  }

  if (!['linkedin', 'apollo'].includes(lead_source)) {
    return res.status(400).json({ 
      error: 'Invalid lead_source. Must be "linkedin" or "apollo"' 
    });
  }

  if (!['research', 'outreach', 'database_update', 'campaign_assignment'].includes(stage)) {
    return res.status(400).json({ 
      error: 'Invalid stage. Must be one of: research, outreach, database_update, campaign_assignment' 
    });
  }

  if (!['pending', 'in_progress', 'completed', 'failed', 'skipped'].includes(status)) {
    return res.status(400).json({ 
      error: 'Invalid status. Must be one of: pending, in_progress, completed, failed, skipped' 
    });
  }

  try {
    // Get or create execution record if not provided
    let execId = execution_id;
    if (!execId) {
      const { data: execData, error: execError } = await supabase
        .from('workflow_executions')
        .insert({
          workflow_name: `LeadGenOS (${lead_source.charAt(0).toUpperCase() + lead_source.slice(1)})`,
          status: 'started',
          started_at: new Date()
        })
        .select('id')
        .single();

      if (execError) {
        console.error('Error creating execution:', execError);
        return res.status(500).json({ error: 'Failed to create execution record' });
      }
      execId = execData.id;
    }

    // Prepare update data based on stage
    const updateData = {
      lead_id,
      lead_source,
      execution_id: execId,
      updated_at: new Date()
    };

    // Extract lead info from lead_data if provided
    if (lead_data) {
      updateData.lead_name = lead_data.full_name || lead_data.name;
      updateData.lead_email = lead_data.email;
      updateData.lead_company = lead_data.company || lead_data.organization_name;
      updateData.lead_title = lead_data.title;
    }

    // Set stage-specific fields
    switch (stage) {
      case 'campaign_assignment':
        updateData.campaign_assignment_status = status;
        if (status === 'completed') {
          updateData.campaign_assignment_at = completed_at || new Date();
        }
        break;

      case 'research':
        updateData.research_status = status;
        if (status === 'in_progress') {
          updateData.research_started_at = started_at || new Date();
        } else if (status === 'completed') {
          updateData.research_completed_at = completed_at || new Date();
          updateData.research_duration_ms = duration_ms;
          if (result_data) {
            updateData.research_data = result_data;
          }
        } else if (status === 'failed') {
          updateData.research_error = error_message;
        }
        break;

      case 'outreach':
        updateData.outreach_status = status;
        if (status === 'in_progress') {
          updateData.outreach_started_at = started_at || new Date();
        } else if (status === 'completed') {
          updateData.outreach_completed_at = completed_at || new Date();
          updateData.outreach_duration_ms = duration_ms;
          if (result_data) {
            updateData.outreach_data = result_data;
            updateData.icebreaker_generated = result_data.icebreaker || result_data.message;
          }
        } else if (status === 'failed') {
          updateData.outreach_error = error_message;
        }
        break;

      case 'database_update':
        updateData.database_update_status = status;
        if (status === 'in_progress') {
          updateData.database_update_started_at = started_at || new Date();
        } else if (status === 'completed') {
          updateData.database_updated_at = completed_at || new Date();
        }
        break;
    }

    // Handle errors
    if (status === 'failed') {
      updateData.error_count = 1; // Will be properly incremented by trigger
      updateData.last_error = error_message;
      updateData.last_error_node = `${stage.charAt(0).toUpperCase() + stage.slice(1)} Agent`;
    }

    // Calculate total processing time if all stages are complete
    if (stage === 'database_update' && status === 'completed') {
      const researchTime = updateData.research_duration_ms || 0;
      const outreachTime = updateData.outreach_duration_ms || 0;
      updateData.total_processing_time_ms = researchTime + outreachTime + (duration_ms || 0);
    }

    // Upsert lead processing status
    const { data, error } = await supabase
      .from('lead_processing_status')
      .upsert(updateData, {
        onConflict: 'lead_id,lead_source,execution_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating lead processing status:', error);
      return res.status(500).json({ 
        error: 'Failed to update lead processing status',
        details: error.message
      });
    }

    // Update workflow execution if this is the final stage completion
    if (stage === 'database_update' && status === 'completed') {
      const { error: execUpdateError } = await supabase
        .from('workflow_executions')
        .update({
          leads_processed: supabase.sql`leads_processed + 1`,
          updated_at: new Date()
        })
        .eq('id', execId);

      if (execUpdateError) {
        console.error('Error updating execution leads count:', execUpdateError);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        lead_id: data.lead_id,
        stage,
        status,
        execution_id: execId,
        overall_status: calculateOverallStatus(data)
      }
    });

  } catch (error) {
    console.error('Error processing lead status update:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

function calculateOverallStatus(lead) {
  if (lead.database_update_status === 'completed') return 'completed';
  if (lead.research_status === 'failed' || 
      lead.outreach_status === 'failed' || 
      lead.database_update_status === 'failed') return 'failed';
  if (lead.research_status === 'in_progress' || 
      lead.outreach_status === 'in_progress' || 
      lead.database_update_status === 'in_progress') return 'processing';
  return 'pending';
}