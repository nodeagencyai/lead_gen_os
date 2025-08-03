// Vercel Serverless Function for HeyReach Campaign Details
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
    console.log('🔄 CORS preflight request handled for /api/heyreach/campaign-details');
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

    // Extract campaign ID from query or path
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

    console.log(`🔄 Fetching details for campaign ${campaignId} from HeyReach...`);

    // Get specific campaign details
    const response = await fetch(`https://api.heyreach.io/api/public/campaigns/${campaignId}`, {
      method: 'GET',
      headers: {
        'X-API-KEY': HEYREACH_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ HeyReach campaign details error:', response.status, data);
      
      // Handle rate limit response from HeyReach
      if (response.status === 429) {
        const retryAfter = response.headers.get('X-RateLimit-Reset') || '60';
        return res.status(429).json({
          error: 'HeyReach rate limit exceeded',
          retryAfter: parseInt(retryAfter),
          message: 'Too many requests to HeyReach API'
        });
      }
      
      // Handle specific error codes per documentation
      const errorCodes = {
        401: 'Invalid API key',
        403: 'API key lacks required permissions',
        404: 'Campaign not found',
        500: 'HeyReach server error'
      };
      
      return res.status(response.status).json({
        error: errorCodes[response.status] || 'Failed to fetch campaign details',
        status: response.status,
        details: data
      });
    }

    console.log(`✅ Fetched details for campaign ${campaignId}`);
    res.status(200).json(data);

  } catch (error) {
    console.error('❌ HeyReach campaign details error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}