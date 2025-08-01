// Vercel Serverless Function for Instantly Leads - Uses POST /leads/list per API v2 docs
export default async function handler(req, res) {
  // Set comprehensive CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔄 CORS preflight request handled for /api/instantly/leads');
    return res.status(200).end();
  }

  // Only allow POST method (per API v2 documentation)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed - use POST' });
  }

  try {
    // Use server-side environment variable (with fallback to VITE_ prefixed version)
    const INSTANTLY_API_KEY = process.env.INSTANTLY_API_KEY || process.env.VITE_INSTANTLY_API_KEY;
    
    if (!INSTANTLY_API_KEY) {
      console.error('❌ Instantly API key not found');
      return res.status(500).json({ 
        error: 'API key not configured',
        debug: 'INSTANTLY_API_KEY environment variable is missing'
      });
    }

    // Get filters from request body
    const { campaign_id, limit = 100, starting_after } = req.body || {};
    
    if (!campaign_id) {
      return res.status(400).json({ 
        error: 'campaign_id is required in request body' 
      });
    }

    console.log(`🔄 Fetching leads for campaign ${campaign_id} from Instantly...`);

    // Use POST /leads/list endpoint as per API v2 documentation
    const requestBody = {
      campaign_id,
      limit,
      ...(starting_after && { starting_after })
    };

    const response = await fetch('https://api.instantly.ai/api/v2/leads/list', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${INSTANTLY_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Instantly leads error:', response.status, data);
      return res.status(response.status).json({
        error: 'Failed to fetch leads',
        status: response.status,
        details: data
      });
    }

    const leads = data.items || data || [];
    console.log(`✅ Fetched ${leads.length} leads for campaign ${campaign_id} from Instantly`);
    
    // Count leads by status for analytics
    const leadsReady = leads.filter(lead => {
      // Filter for leads that are ready to be contacted (not completed/paused)
      // Based on API v2 docs - leads with valid email and not in completed state
      return lead.email && 
             lead.status !== 'completed' && 
             lead.status !== 'paused' &&
             !lead.interest_status?.includes('completed');
    }).length;

    const leadsContacted = leads.filter(lead => {
      // Leads that have been contacted (have campaign activity)
      return lead.status === 'contacted' || 
             lead.status === 'replied' ||
             lead.campaign_id; // Has been added to a campaign
    }).length;

    res.status(200).json({
      ...data,
      // Add calculated analytics
      analytics: {
        total_leads: leads.length,
        leads_ready: leadsReady,
        leads_contacted: leadsContacted
      }
    });

  } catch (error) {
    console.error('❌ Instantly leads error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}