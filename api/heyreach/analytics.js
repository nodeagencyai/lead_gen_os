// Vercel Serverless Function for HeyReach Campaign Analytics
const { heyreachRateLimiter } = require('../utils/heyreachRateLimiter');

export default async function handler(req, res) {
  // Set comprehensive CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔄 CORS preflight request handled for /api/heyreach/analytics');
    return res.status(200).end();
  }

  // Allow both GET and POST methods
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Use server-side environment variable (NO VITE_ prefix)
    const HEYREACH_API_KEY = process.env.HEYREACH_API_KEY;
    
    if (!HEYREACH_API_KEY) {
      console.error('❌ HeyReach API key not found');
      return res.status(500).json({ 
        error: 'API key not configured',
        debug: 'HEYREACH_API_KEY environment variable is missing'
      });
    }

    // Extract campaign ID from query
    const campaignId = req.query.id || req.query.campaignId;
    
    if (!campaignId) {
      return res.status(400).json({
        error: 'Campaign ID is required',
        usage: 'Use ?id=campaign_id or ?campaignId=campaign_id'
      });
    }

    // Check rate limit before making request
    try {
      await heyreachRateLimiter.checkLimit();
    } catch (rateLimitError) {
      console.warn('⚠️ Rate limit exceeded:', rateLimitError.message);
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: rateLimitError.message,
        retryAfter: Math.ceil(rateLimitError.waitTime / 1000)
      });
    }

    console.log(`🔄 Fetching analytics for campaign ${campaignId} from HeyReach...`);

    // Fetch campaign analytics
    const response = await fetch(`https://api.heyreach.io/api/public/campaigns/${campaignId}/analytics`, {
      method: 'GET',
      headers: {
        'X-API-KEY': HEYREACH_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ HeyReach analytics error:', response.status, errorData);
      
      // Handle rate limit response from HeyReach
      if (response.status === 429) {
        const retryAfter = response.headers.get('X-RateLimit-Reset') || '60';
        return res.status(429).json({
          error: 'HeyReach rate limit exceeded',
          retryAfter: parseInt(retryAfter),
          message: 'Too many requests to HeyReach API'
        });
      }
      
      // If analytics endpoint doesn't exist, return mock data structure
      if (response.status === 404) {
        console.log('⚠️ Analytics endpoint not available, returning mock structure');
        const mockAnalytics = {
          summary: {
            leads_added: 0,
            profiles_viewed: 0,
            connections_sent: 0,
            connections_accepted: 0,
            messages_sent: 0,
            replies_received: 0,
            acceptance_rate: 0,
            reply_rate: 0
          },
          daily_stats: []
        };
        return res.status(200).json(mockAnalytics);
      }
      
      // Handle specific error codes per documentation
      const errorCodes = {
        401: 'Invalid API key',
        403: 'API key lacks required permissions',
        500: 'HeyReach server error'
      };
      
      return res.status(response.status).json({
        error: errorCodes[response.status] || 'Failed to fetch campaign analytics',
        status: response.status,
        details: errorData
      });
    }

    const data = await response.json();
    console.log(`✅ Fetched analytics for campaign ${campaignId}`);
    res.status(200).json(data);

  } catch (error) {
    console.error('❌ HeyReach analytics error:', error);
    
    // Return mock data on error for graceful degradation
    const mockAnalytics = {
      summary: {
        leads_added: 0,
        profiles_viewed: 0,
        connections_sent: 0,
        connections_accepted: 0,
        messages_sent: 0,
        replies_received: 0,
        acceptance_rate: 0,
        reply_rate: 0
      },
      daily_stats: []
    };
    
    res.status(200).json(mockAnalytics);
  }
}