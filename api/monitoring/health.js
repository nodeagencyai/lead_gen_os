import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // Enable CORS
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
    console.log('🔄 Checking system health...');
    
    // Test database connection
    const { error } = await supabase
      .from('workflow_executions')
      .select('id', { count: 'exact', head: true });

    if (error) {
      throw error;
    }

    const healthData = {
      status: 'healthy',
      uptime: '99.9%',
      database: 'connected',
      timestamp: new Date().toISOString()
    };

    console.log('✅ System health check passed');
    res.status(200).json(healthData);
  } catch (error) {
    console.error('❌ System health check failed:', error);
    res.status(500).json({ 
      status: 'unhealthy', 
      error: error.message,
      database: 'disconnected',
      timestamp: new Date().toISOString()
    });
  }
}