// Vercel Serverless Function for Instantly Analytics Overview
// Provides unique metrics like open_count_unique, link_click_count_unique, etc.
export default async function handler(req, res) {
  // Set comprehensive CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔄 CORS preflight request handled for /api/instantly/analytics-overview');
    return res.status(200).end();
  }

  // Only allow GET method
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Use server-side environment variable (NO VITE_ prefix)
    const INSTANTLY_API_KEY = process.env.INSTANTLY_API_KEY || process.env.VITE_INSTANTLY_API_KEY;
    
    if (!INSTANTLY_API_KEY) {
      console.error('❌ Instantly API key not found');
      return res.status(500).json({ 
        error: 'API key not configured',
        debug: 'INSTANTLY_API_KEY environment variable is missing'
      });
    }

    // Get campaign_id from query params
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ 
        error: 'Missing required parameter: id' 
      });
    }
    
    console.log(`🔄 Fetching analytics overview for campaign ${id} from Instantly...`);

    // Build URL per API v2 docs - /campaigns/analytics/overview
    const url = `https://api.instantly.ai/api/v2/campaigns/analytics/overview?id=${id}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${INSTANTLY_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Instantly analytics overview error:', response.status, data);
      return res.status(response.status).json({
        error: 'Failed to fetch analytics overview',
        status: response.status,
        details: data
      });
    }

    console.log('✅ Fetched analytics overview from Instantly');
    console.log('📊 Overview data structure:', {
      hasUniqueMetrics: !!data.open_count_unique,
      keys: Object.keys(data),
      metrics: {
        uniqueOpens: data.open_count_unique,
        uniqueClicks: data.link_click_count_unique,
        uniqueReplies: data.reply_count_unique,
        meetingsBooked: data.total_meeting_booked
      }
    });
    
    res.status(200).json(data);

  } catch (error) {
    console.error('❌ Instantly analytics overview error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}