// api/monitoring/leads/index.js - Main leads monitoring endpoint
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Helper function to calculate overall status
function calculateOverallStatus(lead) {
  if (lead.database_update_status === 'completed') return 'completed'
  if (lead.research_status === 'failed' || 
      lead.outreach_status === 'failed' || 
      lead.database_update_status === 'failed') return 'failed'
  if (lead.research_status === 'in_progress' || 
      lead.outreach_status === 'in_progress' || 
      lead.database_update_status === 'in_progress') return 'processing'
  return 'pending'
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { status, source, limit = 50, offset = 0 } = req.query
    const limitNum = parseInt(limit)
    const offsetNum = parseInt(offset)

    // Build the query
    let query = supabase
      .from('lead_processing_status')
      .select(`
        id,
        lead_id,
        lead_source,
        lead_name,
        lead_email,
        lead_company,
        lead_title,
        research_status,
        research_started_at,
        research_completed_at,
        research_duration_ms,
        research_error,
        outreach_status,
        outreach_started_at,
        outreach_completed_at,
        outreach_duration_ms,
        outreach_error,
        icebreaker_generated,
        database_update_status,
        database_update_started_at,
        database_updated_at,
        error_count,
        retry_count,
        last_error,
        last_error_node,
        total_processing_time_ms,
        created_at,
        updated_at,
        execution_id,
        workflow_executions!inner(
          workflow_name,
          campaign_name,
          status
        )
      `)
      .order('updated_at', { ascending: false })

    // Apply filters
    if (source && ['linkedin', 'apollo'].includes(source)) {
      query = query.eq('lead_source', source)
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('lead_processing_status')
      .select('*', { count: 'exact', head: true })

    // Apply pagination
    query = query.range(offsetNum, offsetNum + limitNum - 1)

    const { data: leads, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    // Calculate overall_status for each lead and format response
    const leadsWithStatus = leads?.map(lead => ({
      id: lead.id,
      lead_id: lead.lead_id,
      lead_source: lead.lead_source,
      lead_name: lead.lead_name,
      lead_email: lead.lead_email,
      lead_company: lead.lead_company,
      lead_title: lead.lead_title,
      overall_status: calculateOverallStatus(lead),
      processing: {
        research: {
          status: lead.research_status || 'pending',
          started_at: lead.research_started_at,
          completed_at: lead.research_completed_at,
          duration_ms: lead.research_duration_ms,
          error: lead.research_error
        },
        outreach: {
          status: lead.outreach_status || 'pending',
          started_at: lead.outreach_started_at,
          completed_at: lead.outreach_completed_at,
          duration_ms: lead.outreach_duration_ms,
          error: lead.outreach_error,
          icebreaker: lead.icebreaker_generated
        },
        database_update: {
          status: lead.database_update_status || 'pending',
          started_at: lead.database_update_started_at,
          completed_at: lead.database_updated_at
        }
      },
      workflow: {
        execution_id: lead.execution_id,
        workflow_name: lead.workflow_executions?.workflow_name,
        campaign_name: lead.workflow_executions?.campaign_name,
        execution_status: lead.workflow_executions?.status
      },
      metrics: {
        error_count: lead.error_count || 0,
        retry_count: lead.retry_count || 0,
        total_processing_time_ms: lead.total_processing_time_ms,
        last_error: lead.last_error,
        last_error_node: lead.last_error_node
      },
      timestamps: {
        created_at: lead.created_at,
        updated_at: lead.updated_at
      }
    }))

    // Filter by status if requested (after calculating overall_status)
    const filteredLeads = status 
      ? leadsWithStatus?.filter(lead => lead.overall_status === status)
      : leadsWithStatus

    // Calculate aggregate stats
    const stats = {
      linkedin: {
        total_leads: 0,
        completed_leads: 0,
        failed_leads: 0,
        processing_leads: 0,
        pending_leads: 0,
        avg_processing_time_ms: 0
      },
      apollo: {
        total_leads: 0,
        completed_leads: 0,
        failed_leads: 0,
        processing_leads: 0,
        pending_leads: 0,
        avg_processing_time_ms: 0
      }
    }

    if (leadsWithStatus) {
      const processingTimes = { linkedin: [], apollo: [] }
      
      leadsWithStatus.forEach(lead => {
        const leadStatus = lead.overall_status
        const leadSource = lead.lead_source
        
        if (stats[leadSource]) {
          stats[leadSource].total_leads++
          
          // Count by status
          switch (leadStatus) {
            case 'completed':
              stats[leadSource].completed_leads++
              break
            case 'failed':
              stats[leadSource].failed_leads++
              break
            case 'processing':
              stats[leadSource].processing_leads++
              break
            case 'pending':
              stats[leadSource].pending_leads++
              break
          }

          // Collect processing times for average
          if (lead.metrics.total_processing_time_ms) {
            processingTimes[leadSource].push(lead.metrics.total_processing_time_ms)
          }
        }
      })

      // Calculate average processing times
      Object.keys(processingTimes).forEach(source => {
        const times = processingTimes[source]
        if (times.length > 0) {
          stats[source].avg_processing_time_ms = Math.round(
            times.reduce((sum, time) => sum + time, 0) / times.length
          )
        }
      })
    }

    return res.status(200).json({
      success: true,
      data: {
        leads: filteredLeads || [],
        stats,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          total: count || 0,
          has_more: (offsetNum + limitNum) < (count || 0)
        }
      }
    })

  } catch (error) {
    console.error('Error fetching lead data:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch lead data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}