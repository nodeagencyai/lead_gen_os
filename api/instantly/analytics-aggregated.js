// Vercel Serverless Function for Instantly Aggregated Analytics
export default async function handler(req, res) {
  // Set comprehensive CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔄 CORS preflight request handled for /api/instantly/analytics-aggregated');
    return res.status(200).end();
  }

  // Only allow GET method
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
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

    console.log('🔄 Fetching aggregated analytics from Instantly...');

    // Get date range for last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    // Format dates as YYYY-MM-DD
    const formatDate = (date) => {
      return date.toISOString().split('T')[0];
    };

    // Fetch aggregated analytics for all campaigns
    const response = await fetch(`https://api.instantly.ai/api/v2/campaigns/analytics?start_date=${formatDate(startDate)}&end_date=${formatDate(endDate)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${INSTANTLY_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Instantly aggregated analytics error:', response.status, data);
      return res.status(response.status).json({
        error: 'Failed to fetch aggregated analytics',
        status: response.status,
        details: data
      });
    }

    console.log('✅ Fetched aggregated analytics from Instantly');
    
    // Calculate aggregated metrics from all campaigns
    let aggregatedMetrics = {
      sent: 0,
      unique_opened: 0,
      unique_replies: 0,
      bounced: 0,
      meetings_booked: 0,
      unsubscribed: 0,
      leads_count: 0
    };

    // Check if data is an array or has items property
    const campaigns = Array.isArray(data) ? data : (data.items || []);
    
    // Aggregate metrics from all campaigns
    campaigns.forEach(campaign => {
      aggregatedMetrics.sent += campaign.emails_sent_count || 0;
      aggregatedMetrics.unique_opened += campaign.open_count || 0;
      aggregatedMetrics.unique_replies += campaign.reply_count || 0;
      aggregatedMetrics.bounced += campaign.bounced_count || 0;
      aggregatedMetrics.meetings_booked += campaign.total_opportunities || 0;
      aggregatedMetrics.unsubscribed += campaign.unsubscribed_count || 0;
      aggregatedMetrics.leads_count += campaign.leads_count || 0;
    });

    // Calculate rates
    aggregatedMetrics.open_rate = aggregatedMetrics.sent > 0 
      ? ((aggregatedMetrics.unique_opened / aggregatedMetrics.sent) * 100).toFixed(2)
      : 0;
    
    aggregatedMetrics.bounce_rate = aggregatedMetrics.sent > 0
      ? ((aggregatedMetrics.bounced / aggregatedMetrics.sent) * 100).toFixed(2)
      : 0;

    aggregatedMetrics.reply_rate = aggregatedMetrics.sent > 0
      ? ((aggregatedMetrics.unique_replies / aggregatedMetrics.sent) * 100).toFixed(2)
      : 0;

    // Also calculate metrics for previous 30-day period for comparison
    const prevEndDate = new Date(startDate);
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - 30);

    const prevResponse = await fetch(`https://api.instantly.ai/api/v2/campaigns/analytics?start_date=${formatDate(prevStartDate)}&end_date=${formatDate(prevEndDate)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${INSTANTLY_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    let previousMetrics = {
      sent: 0,
      unique_opened: 0,
      unique_replies: 0,
      bounced: 0,
      meetings_booked: 0
    };

    if (prevResponse.ok) {
      const prevData = await prevResponse.json();
      const prevCampaigns = Array.isArray(prevData) ? prevData : (prevData.items || []);
      
      prevCampaigns.forEach(campaign => {
        previousMetrics.sent += campaign.emails_sent_count || 0;
        previousMetrics.unique_opened += campaign.open_count || 0;
        previousMetrics.unique_replies += campaign.reply_count || 0;
        previousMetrics.bounced += campaign.bounced_count || 0;
        previousMetrics.meetings_booked += campaign.total_opportunities || 0;
      });
    }

    // Calculate percentage changes
    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous * 100).toFixed(1);
    };

    aggregatedMetrics.changes = {
      sent: calculateChange(aggregatedMetrics.sent, previousMetrics.sent),
      unique_opened: calculateChange(aggregatedMetrics.unique_opened, previousMetrics.unique_opened),
      unique_replies: calculateChange(aggregatedMetrics.unique_replies, previousMetrics.unique_replies),
      meetings_booked: calculateChange(aggregatedMetrics.meetings_booked, previousMetrics.meetings_booked),
      bounce_rate: calculateChange(aggregatedMetrics.bounced, previousMetrics.bounced)
    };

    res.status(200).json(aggregatedMetrics);

  } catch (error) {
    console.error('❌ Instantly aggregated analytics error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}