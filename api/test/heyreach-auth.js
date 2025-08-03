// Simple test endpoint for HeyReach authentication
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const HEYREACH_API_KEY = process.env.HEYREACH_API_KEY;
    
    if (!HEYREACH_API_KEY) {
      console.error('❌ HEYREACH_API_KEY not found in environment');
      return res.status(500).json({
        error: 'HEYREACH_API_KEY environment variable is missing',
        available_vars: Object.keys(process.env).filter(key => key.includes('HEYREACH')),
        timestamp: new Date().toISOString()
      });
    }

    console.log('🔄 Testing HeyReach authentication...');
    console.log('🔄 API key length:', HEYREACH_API_KEY.length);
    console.log('🔄 API key prefix:', HEYREACH_API_KEY.substring(0, 10) + '...');

    const response = await fetch('https://api.heyreach.io/api/public/auth/CheckApiKey', {
      method: 'GET',
      headers: {
        'X-API-KEY': HEYREACH_API_KEY,
        'Accept': 'application/json'
      }
    });

    const result = {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      timestamp: new Date().toISOString()
    };

    if (response.ok) {
      console.log('✅ HeyReach authentication successful');
      res.status(200).json({
        message: 'HeyReach authentication successful',
        ...result
      });
    } else {
      console.error('❌ HeyReach authentication failed:', result);
      res.status(response.status).json({
        error: 'HeyReach authentication failed',
        ...result
      });
    }

  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    res.status(500).json({
      error: 'Test endpoint failed',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}