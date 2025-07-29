// Vercel Serverless Function for HeyReach LinkedIn Accounts
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
      console.error('❌ HeyReach API key not found');
      return res.status(500).json({ 
        error: 'API key not configured',
        debug: 'VITE_HEYREACH_API_KEY environment variable is missing'
      });
    }

    console.log('🔄 Fetching LinkedIn accounts from HeyReach...');

    const response = await fetch('https://api.heyreach.io/api/public/li_account/GetAll', {
      method: 'POST',
      headers: {
        'X-API-KEY': HEYREACH_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(req.body || {})
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

    console.log(`✅ Fetched ${data.items?.length || 0} LinkedIn accounts`);
    res.status(200).json(data);

  } catch (error) {
    console.error('❌ HeyReach accounts error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}