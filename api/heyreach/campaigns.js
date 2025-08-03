// Vercel Serverless Function for HeyReach Campaigns
// Inline rate limiter to avoid module issues in Vercel
const rateLimitStore = new Map();
const RATE_LIMIT = 300; // 300 requests per minute
const TIME_WINDOW = 60000; // 1 minute

function checkRateLimit(key = 'global') {
  const now = Date.now();
  const requests = rateLimitStore.get(key) || [];
  
  // Filter out old requests
  const recentRequests = requests.filter(time => now - time < TIME_WINDOW);
  
  if (recentRequests.length >= RATE_LIMIT) {
    const oldestRequest = recentRequests[0];
    const waitTime = TIME_WINDOW - (now - oldestRequest);
    const error = new Error(`Rate limit exceeded. Wait ${waitTime}ms`);
    error.waitTime = waitTime;
    throw error;
  }
  
  // Add current request
  recentRequests.push(now);
  rateLimitStore.set(key, recentRequests);
}

export default async function handler(req, res) {
  // Set comprehensive CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔄 CORS preflight request handled for /api/heyreach/campaigns');
    return res.status(200).end();
  }

  // Allow POST method per HeyReach API pattern (similar to li_account/GetAll)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check rate limit before making request
    try {
      checkRateLimit('heyreach-campaigns');
    } catch (rateLimitError) {
      console.warn('⚠️ Rate limit exceeded:', rateLimitError.message);
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: rateLimitError.message,
        retryAfter: Math.ceil(rateLimitError.waitTime / 1000)
      });
    }
    
    // Use server-side environment variable (NO VITE_ prefix)
    const HEYREACH_API_KEY = process.env.HEYREACH_API_KEY;
    
    if (!HEYREACH_API_KEY) {
      console.error('❌ HeyReach API key not found');
      return res.status(500).json({ 
        error: 'API key not configured',
        debug: 'HEYREACH_API_KEY environment variable is missing'
      });
    }

    console.log('🔄 Fetching campaigns from HeyReach...');
    
    // Use correct endpoint from official HeyReach documentation pattern
    // Following the same pattern as li_account/GetAll
    const requestBody = {
      offset: req.query.offset || "0",
      limit: req.query.limit || "50",
      // Optional status filter if supported
      ...(req.query.status && { status: req.query.status })
    };
    
    const response = await fetch('https://api.heyreach.io/api/public/campaign/GetAll', {
      method: 'POST',
      headers: {
        'X-API-KEY': HEYREACH_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ HeyReach campaigns error:', response.status, data);
      return res.status(response.status).json({
        error: 'Failed to fetch campaigns',
        status: response.status,
        details: data
      });
    }

    // Transform response to match expected format
    const campaigns = Array.isArray(data) ? data : (data.campaigns || data.items || []);
    const hasMore = data.has_more || false;
    const totalCount = data.total_count || campaigns.length;
    
    console.log(`✅ Fetched ${campaigns.length} campaigns`);
    
    res.status(200).json({
      items: campaigns,
      total_count: totalCount,
      has_more: hasMore
    });

  } catch (error) {
    console.error('❌ HeyReach campaigns error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}