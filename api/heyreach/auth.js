// Vercel Serverless Function for HeyReach Authentication
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const HEYREACH_API_KEY = process.env.VITE_HEYREACH_API_KEY;
    
    if (!HEYREACH_API_KEY) {
      console.error('❌ HeyReach API key not found in environment variables');
      return res.status(500).json({ 
        error: 'API key not configured',
        debug: 'VITE_HEYREACH_API_KEY environment variable is missing'
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
      const errorText = await response.text();
      console.error('❌ HeyReach auth failed:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'Authentication failed',
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