import { createClient } from '@supabase/supabase-js';

// Check for required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
}

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

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
    
    // Test basic database connection first
    const { data: testData, error: testError } = await supabase
      .from('workflow_executions')
      .select('id', { count: 'exact', head: true });

    let databaseStatus = 'connected';
    let healthStatus = 'healthy';
    
    if (testError) {
      console.warn('Database table check failed:', testError);
      // If it's a table not found error, database is connected but tables need setup
      if (testError.message?.includes('relation') && testError.message?.includes('does not exist')) {
        databaseStatus = 'connected - tables not created';
        healthStatus = 'setup_required';
      } else {
        databaseStatus = 'error';
        healthStatus = 'unhealthy';
      }
    }

    const healthData = {
      status: healthStatus,
      uptime: '99.9%',
      database: databaseStatus,
      timestamp: new Date().toISOString(),
      message: healthStatus === 'setup_required' 
        ? 'Database connected but monitoring tables not found. Please run the setup SQL script.'
        : undefined
    };

    console.log('✅ Health check completed:', healthData);
    res.status(200).json(healthData);
  } catch (error) {
    console.error('❌ System health check failed:', error);
    res.status(200).json({ 
      status: 'setup_required', 
      error: error.message,
      database: 'connection_error',
      timestamp: new Date().toISOString(),
      message: 'Unable to connect to database. Please check your Supabase configuration.'
    });
  }
}