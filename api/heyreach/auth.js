// Vercel Serverless Function for HeyReach Authentication
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
    console.log('🔄 CORS preflight request handled for /api/heyreach/auth');
    return res.status(200).end();
  }

  // Only allow POST method
  if (req.method !== 'POST') {
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
      console.error('❌ HeyReach API key not found in environment variables');
      return res.status(500).json({ 
        error: 'API key not configured',
        debug: 'HEYREACH_API_KEY environment variable is missing'
      });
    }

    console.log('🔄 Testing HeyReach API key via serverless function...');

    const response = await fetch('https://api.heyreach.io/api/public/auth/CheckApiKey', {
      method: 'GET',
      headers: {
        'X-API-KEY': HEYREACH_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      // Handle rate limit response from HeyReach
      if (response.status === 429) {
        const retryAfter = response.headers.get('X-RateLimit-Reset') || '60';
        return res.status(429).json({
          error: 'HeyReach rate limit exceeded',
          retryAfter: parseInt(retryAfter),
          message: 'Too many requests to HeyReach API'
        });
      }
      
      const errorText = await response.text();
      console.error('❌ HeyReach auth failed:', response.status, errorText);
      
      // Handle specific error codes per documentation
      const errorCodes = {
        401: 'Invalid API key',
        403: 'API key lacks required permissions',
        500: 'HeyReach server error'
      };
      
      return res.status(response.status).json({ 
        error: errorCodes[response.status] || 'Authentication failed',
        status: response.status,
        details: errorText
      });
    }

    console.log('✅ HeyReach authentication successful');
    res.status(200).json({ 
      success: true,
      message: 'Authentication successful',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ HeyReach auth error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}