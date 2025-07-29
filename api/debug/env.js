// Vercel Serverless Function for Environment Debugging
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET method
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const envCheck = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      vercel_env: process.env.VERCEL_ENV || 'unknown',
      vercel_url: process.env.VERCEL_URL || 'unknown',
      api_keys: {
        instantly: process.env.INSTANTLY_API_KEY ? '✅ Present' : '❌ Missing',
        heyreach: process.env.HEYREACH_API_KEY ? '✅ Present' : '❌ Missing',
        supabase_url: process.env.VITE_SUPABASE_URL ? '✅ Present' : '❌ Missing',
        supabase_key: process.env.VITE_SUPABASE_ANON_KEY ? '✅ Present' : '❌ Missing',
        n8n_token: process.env.VITE_N8N_AUTH_TOKEN ? '✅ Present' : '❌ Missing'
      },
      api_key_lengths: {
        instantly: process.env.INSTANTLY_API_KEY?.length || 0,
        heyreach: process.env.HEYREACH_API_KEY?.length || 0
      },
      server_env_vars: Object.keys(process.env)
        .filter(key => key.includes('API_KEY') || key.startsWith('VERCEL_') || key.startsWith('NODE_'))
        .map(key => ({
          key,
          length: process.env[key]?.length || 0,
          preview: process.env[key]?.substring(0, 10) + '...'
        })),
      frontend_env_vars: Object.keys(process.env)
        .filter(key => key.startsWith('VITE_'))
        .map(key => ({
          key,
          length: process.env[key]?.length || 0,
          preview: process.env[key]?.substring(0, 10) + '...'
        }))
    };

    console.log('🔍 Environment debug requested:', envCheck);
    res.status(200).json(envCheck);

  } catch (error) {
    console.error('❌ Environment debug error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}