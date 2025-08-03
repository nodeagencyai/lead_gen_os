// Debug endpoint to check HeyReach environment variable in Vercel
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const HEYREACH_API_KEY = process.env.HEYREACH_API_KEY;
    
    console.log('🔍 Debug: Checking HeyReach API key availability');
    console.log('🔍 Environment:', process.env.NODE_ENV);
    console.log('🔍 Vercel Environment:', process.env.VERCEL_ENV);
    
    const response = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV || 'not-vercel',
        hasHeyReachKey: !!HEYREACH_API_KEY,
        keyLength: HEYREACH_API_KEY ? HEYREACH_API_KEY.length : 0,
        keyPrefix: HEYREACH_API_KEY ? HEYREACH_API_KEY.substring(0, 8) + '...' : 'none'
      }
    };

    // If we have the key, test it
    if (HEYREACH_API_KEY) {
      try {
        console.log('🔍 Testing HeyReach API key...');
        const testResponse = await fetch('https://api.heyreach.io/api/public/auth/CheckApiKey', {
          method: 'GET',
          headers: {
            'X-API-KEY': HEYREACH_API_KEY,
            'Accept': 'application/json'
          }
        });

        response.apiTest = {
          status: testResponse.status,
          statusText: testResponse.statusText,
          success: testResponse.ok
        };

        console.log('🔍 API test result:', response.apiTest);
      } catch (apiError) {
        console.error('🔍 API test failed:', apiError);
        response.apiTest = {
          error: apiError.message,
          success: false
        };
      }
    }

    console.log('🔍 Debug response:', response);
    res.status(200).json(response);

  } catch (error) {
    console.error('🔍 Debug endpoint error:', error);
    res.status(500).json({
      error: 'Debug endpoint failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}