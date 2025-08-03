// Vercel Serverless Function for HeyReach Conversations
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
    console.log('🔄 CORS preflight request handled for /api/heyreach/conversations');
    return res.status(200).end();
  }

  // Allow GET method per official documentation
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

    console.log('🔄 Fetching conversations from HeyReach...');
    
    // Build query parameters from request
    const queryParams = new URLSearchParams();
    if (req.query.status) queryParams.append('status', req.query.status);
    if (req.query.linkedin_account_id) queryParams.append('linkedin_account_id', req.query.linkedin_account_id);
    if (req.query.campaign_id) queryParams.append('campaign_id', req.query.campaign_id);
    if (req.query.limit) queryParams.append('limit', req.query.limit);
    if (req.query.offset) queryParams.append('offset', req.query.offset);
    
    const url = `https://api.heyreach.io/api/public/conversations${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': HEYREACH_API_KEY,
        'Accept': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ HeyReach conversations error:', response.status, data);
      
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
        500: 'HeyReach server error'
      };
      
      return res.status(response.status).json({
        error: errorCodes[response.status] || 'Failed to fetch conversations',
        status: response.status,
        details: data
      });
    }

    // Transform response to match expected format
    const conversations = Array.isArray(data) ? data : (data.conversations || data.items || []);
    const hasMore = data.has_more || false;
    const totalCount = data.total_count || conversations.length;
    
    console.log(`✅ Fetched ${conversations.length} conversations`);
    
    res.status(200).json({
      items: conversations,
      total_count: totalCount,
      has_more: hasMore
    });

  } catch (error) {
    console.error('❌ HeyReach conversations error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}