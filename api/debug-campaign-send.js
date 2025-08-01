// Debug endpoint to test campaign send step by step
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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
    steps: [],
    environment: {},
    errors: []
  };

  try {
    // Step 1: Check environment variables
    debug.steps.push('1. Checking environment variables...');
    debug.environment = {
      supabase_url_exists: !!supabaseUrl,
      supabase_key_exists: !!supabaseKey,
      instantly_key_exists: !!(process.env.VITE_INSTANTLY_API_KEY || process.env.INSTANTLY_API_KEY),
      heyreach_key_exists: !!(process.env.VITE_HEYREACH_API_KEY || process.env.HEYREACH_API_KEY),
      supabase_url_length: supabaseUrl?.length || 0,
      instantly_key_length: (process.env.VITE_INSTANTLY_API_KEY || process.env.INSTANTLY_API_KEY)?.length || 0
    };

    // Step 2: Test Supabase connection
    debug.steps.push('2. Testing Supabase connection...');
    try {
      const { data: apolloTest, error: apolloError } = await supabase
        .from('Apollo')
        .select('id, email, full_name, company')
        .limit(1);
      
      debug.supabase_apollo = {
        success: !apolloError,
        count: apolloTest?.length || 0,
        error: apolloError?.message,
        sample: apolloTest?.[0]
      };
    } catch (err) {
      debug.errors.push(`Supabase Apollo test failed: ${err.message}`);
    }

    // Step 3: Test Instantly API
    debug.steps.push('3. Testing Instantly API...');
    const instantlyApiKey = process.env.VITE_INSTANTLY_API_KEY || process.env.INSTANTLY_API_KEY;
    if (instantlyApiKey) {
      try {
        const instantlyResponse = await fetch('https://api.instantly.ai/api/v2/campaigns', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${instantlyApiKey}`,
            'Content-Type': 'application/json',
          }
        });
        
        const instantlyData = await instantlyResponse.json();
        debug.instantly_api = {
          success: instantlyResponse.ok,
          status: instantlyResponse.status,
          campaigns_count: instantlyData.items?.length || 0,
          error: !instantlyResponse.ok ? instantlyData : null,
          sample_campaign: instantlyData.items?.[0]
        };
      } catch (err) {
        debug.errors.push(`Instantly API test failed: ${err.message}`);
      }
    } else {
      debug.errors.push('Instantly API key not found');
    }

    // Step 4: Test campaign send format
    debug.steps.push('4. Testing campaign send format...');
    if (req.method === 'POST' && req.body.testSend) {
      const { campaignId, testEmail } = req.body;
      
      if (campaignId && instantlyApiKey) {
        try {
          const testLead = {
            email: testEmail || 'test@example.com',
            first_name: 'Test',
            last_name: 'User',
            company_name: 'Test Company'
          };

          const sendResponse = await fetch('https://api.instantly.ai/api/v2/leads', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${instantlyApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              campaign: campaignId,
              email: testLead.email,
              first_name: testLead.first_name,
              last_name: testLead.last_name,
              company_name: testLead.company_name
            })
          });

          const sendResult = await sendResponse.json();
          debug.test_send = {
            success: sendResponse.ok,
            status: sendResponse.status,
            campaign_id: campaignId,
            test_lead: testLead,
            response: sendResult
          };
        } catch (err) {
          debug.errors.push(`Test send failed: ${err.message}`);
        }
      }
    }

    // Step 5: Check API endpoint accessibility
    debug.steps.push('5. Checking API endpoint structure...');
    debug.api_structure = {
      request_method: req.method,
      request_body: req.body,
      request_headers: Object.keys(req.headers),
      vercel_region: process.env.VERCEL_REGION || 'unknown'
    };

    return res.status(200).json(debug);

  } catch (error) {
    debug.errors.push(`Debug script error: ${error.message}`);
    return res.status(500).json(debug);
  }
}