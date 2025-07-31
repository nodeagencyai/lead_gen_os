// api/monitoring/leads/route.js (Updated)
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

    let query = supabase
      .from('lead_processing_status')
      .select(`
        *,
        workflow_executions!inner(
          workflow_name,
          campaign_name
        )
      `)
      .order('updated_at', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1)

    if (source) {
      query = query.eq('lead_source', source)
    }

    const { data: leads, error, count } = await query

    if (error) throw error

    // Calculate overall_status for each lead
    const leadsWithStatus = leads?.map(lead => ({
      ...lead,
      overall_status: calculateOverallStatus(lead)
    }))

    // Filter by status if requested
    const filteredLeads = status 
      ? leadsWithStatus?.filter(lead => lead.overall_status === status)
      : leadsWithStatus

    // Get aggregate stats with calculated overall_status
    const stats = {
      linkedin: {
        total_leads: 0,
        completed_leads: 0,
        failed_leads: 0,
        processing_leads: 0,
        pending_leads: 0
      },
      apollo: {
        total_leads: 0,
        completed_leads: 0,
        failed_leads: 0,
        processing_leads: 0,
        pending_leads: 0
      }
    }

    if (leads) {
      leads.forEach(lead => {
        const leadStatus = calculateOverallStatus(lead)
        const leadSource = lead.lead_source
        
        if (stats[leadSource]) {
          stats[leadSource].total_leads++
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
        }
      })
    }

    return res.status(200).json({
      leads: filteredLeads,
      stats,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: count || 0
      }
    })
  } catch (error) {
    console.error('Error fetching lead data:', error)
    return res.status(500).json({
      error: 'Failed to fetch lead data',
      details: error.message
    })
  }
}