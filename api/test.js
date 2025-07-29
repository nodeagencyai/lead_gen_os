// Vercel Serverless Function for Testing Proxy and CORS
export default async function handler(req, res) {
  // Set comprehensive CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔄 CORS preflight request handled for /api/test');
    return res.status(200).end();
  }

  console.log('🧪 Test endpoint called with method:', req.method);

  try {
    const testResults = {
      timestamp: new Date().toISOString(),
      method: req.method,
      headers: req.headers,
      environment: process.env.NODE_ENV || 'unknown',
      vercel_env: process.env.VERCEL_ENV || 'unknown',
      proxy_status: '✅ Proxy is working',
      cors_status: '✅ CORS headers set',
      api_keys_status: {
        instantly: process.env.INSTANTLY_API_KEY ? '✅ Server-side key present' : '❌ Missing',
        heyreach: process.env.HEYREACH_API_KEY ? '✅ Server-side key present' : '❌ Missing'
      },
      direct_api_test: await testExternalAPIs(),
      message: 'Test endpoint is working correctly. All API calls should go through this proxy.'
    };

    console.log('✅ Test results:', testResults);
    res.status(200).json(testResults);

  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    res.status(500).json({ 
      error: 'Test endpoint failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

async function testExternalAPIs() {
  const tests = {};

  // Test HeyReach API if key is available
  if (process.env.HEYREACH_API_KEY) {
    try {
      const response = await fetch('https://api.heyreach.io/api/public/auth/CheckApiKey', {
        method: 'GET',
        headers: {
          'X-API-KEY': process.env.HEYREACH_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      tests.heyreach = response.ok ? '✅ API key valid' : '❌ API key invalid';
    } catch (error) {
      tests.heyreach = '❌ Connection failed';
    }
  } else {
    tests.heyreach = '❌ No API key';
  }

  // Test Instantly API if key is available
  if (process.env.INSTANTLY_API_KEY) {
    try {
      const response = await fetch('https://api.instantly.ai/api/v2/campaigns?limit=1', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.INSTANTLY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      tests.instantly = response.ok ? '✅ API key valid' : '❌ API key invalid';
    } catch (error) {
      tests.instantly = '❌ Connection failed';
    }
  } else {
    tests.instantly = '❌ No API key';
  }

  return tests;
}