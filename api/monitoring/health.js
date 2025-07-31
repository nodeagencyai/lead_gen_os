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
    const startTime = Date.now();
    
    // Test database connection
    const { data, error } = await supabase
      .from('workflow_executions')
      .select('count')
      .limit(1);

    const dbResponseTime = Date.now() - startTime;

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: error ? 'unhealthy' : 'healthy',
          responseTime: dbResponseTime,
          error: error?.message
        },
        api: {
          status: 'healthy',
          uptime: process.uptime(),
          memory: process.memoryUsage()
        }
      },
      version: '1.0.0'
    };

    // Determine overall status
    const allServicesHealthy = Object.values(health.services)
      .every(service => service.status === 'healthy');
    
    health.status = allServicesHealthy ? 'healthy' : 'unhealthy';
    
    const statusCode = allServicesHealthy ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (e) {
    console.error('Health check failed:', e);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: e.message
    });
  }
}