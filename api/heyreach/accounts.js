// Vercel Serverless Function for HeyReach LinkedIn Accounts
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
    console.log('🔄 CORS preflight request handled for /api/heyreach/accounts');
    return res.status(200).end();
  }

  // Allow both GET and POST methods (POST is required for HeyReach API)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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
    
    // Use server-side environment variable (NO VITE_ prefix)
    const HEYREACH_API_KEY = process.env.HEYREACH_API_KEY;
    
    if (!HEYREACH_API_KEY) {
      console.error('❌ HeyReach API key not found');
      return res.status(500).json({ 
        error: 'API key not configured',
        debug: 'HEYREACH_API_KEY environment variable is missing'
      });
    }

    console.log('🔄 Fetching LinkedIn accounts from HeyReach...');

    // Use correct endpoint from official HeyReach documentation
    // POST https://api.heyreach.io/api/public/li_account/GetAll
    const requestBody = {
      offset: req.query.offset || "0",
      keyword: req.query.keyword || "",
      limit: req.query.limit || "100"
    };
    
    const response = await fetch('https://api.heyreach.io/api/public/li_account/GetAll', {
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
      console.error('❌ HeyReach accounts error:', response.status, data);
      return res.status(response.status).json({
        error: 'Failed to fetch accounts',
        status: response.status,
        details: data
      });
    }

    // Transform response to match expected format
    const accounts = Array.isArray(data) ? data : (data.accounts || data.items || []);
    console.log(`✅ Fetched ${accounts.length} LinkedIn accounts`);
    
    res.status(200).json({
      items: accounts,
      total_count: accounts.length
    });

  } catch (error) {
    console.error('❌ HeyReach accounts error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}