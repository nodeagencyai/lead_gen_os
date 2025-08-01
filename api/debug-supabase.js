// Debug endpoint to test Supabase connection and table structure
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const debug = {
    timestamp: new Date().toISOString(),
    environment: {
      supabase_url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'NOT SET',
      supabase_key_exists: !!supabaseKey,
      supabase_key_length: supabaseKey?.length || 0
    },
    tests: []
  };

  if (!supabaseUrl || !supabaseKey) {
    debug.error = 'Missing Supabase credentials';
    return res.status(500).json(debug);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Test 1: Basic connection
  try {
    debug.tests.push('Testing basic Supabase connection...');
    
    const { data, error } = await supabase
      .from('Apollo')
      .select('count')
      .limit(1);
    
    debug.connection_test = {
      success: !error,
      error: error?.message,
      data: data
    };
  } catch (err) {
    debug.connection_test = {
      success: false,
      error: err.message
    };
  }

  // Test 2: Check Apollo table structure
  try {
    debug.tests.push('Checking Apollo table structure...');
    
    const { data, error } = await supabase
      .from('Apollo')
      .select('*')
      .limit(3);
    
    debug.apollo_table = {
      success: !error,
      error: error?.message,
      record_count: data?.length || 0,
      sample_record: data?.[0],
      columns: data?.[0] ? Object.keys(data[0]) : []
    };
  } catch (err) {
    debug.apollo_table = {
      success: false,
      error: err.message
    };
  }

  // Test 3: Check LinkedIn table structure  
  try {
    debug.tests.push('Checking LinkedIn table structure...');
    
    const { data, error } = await supabase
      .from('LinkedIn')
      .select('*')
      .limit(3);
    
    debug.linkedin_table = {
      success: !error,
      error: error?.message,
      record_count: data?.length || 0,
      sample_record: data?.[0],
      columns: data?.[0] ? Object.keys(data[0]) : []
    };
  } catch (err) {
    debug.linkedin_table = {
      success: false,
      error: err.message
    };
  }

  // Test 4: Test specific lead ID query (if provided)
  if (req.method === 'POST' && req.body.testLeadIds) {
    const { testLeadIds, leadSource } = req.body;
    const tableName = leadSource === 'linkedin' ? 'LinkedIn' : 'Apollo';
    
    try {
      debug.tests.push(`Testing query with lead IDs: ${testLeadIds.join(', ')}`);
      
      const { data: leads, error: fetchError } = await supabase
        .from(tableName)
        .select('*')
        .in('id', testLeadIds);

      debug.lead_query_test = {
        success: !fetchError,
        error: fetchError?.message,
        table: tableName,
        query_lead_ids: testLeadIds,
        found_leads: leads?.length || 0,
        leads: leads?.map(l => ({
          id: l.id,
          email: l.email,
          full_name: l.full_name,
          company: l.company
        }))
      };
    } catch (err) {
      debug.lead_query_test = {
        success: false,
        error: err.message,
        table: tableName,
        query_lead_ids: testLeadIds
      };
    }
  }

  return res.status(200).json(debug);
}