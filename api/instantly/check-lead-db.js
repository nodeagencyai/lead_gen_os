import { createClient } from '@supabase/supabase-js';

// Check for required environment variables with multiple fallbacks
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Vercel Serverless Function to check if a lead has been sent to Instantly campaigns
export default async function handler(req, res) {
  // Set comprehensive CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔄 CORS preflight request handled for /api/instantly/check-lead-db');
    return res.status(200).end();
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, leadId, leadSource } = req.body;
    
    if (!email && !leadId) {
      return res.status(400).json({ 
        error: 'Email or leadId is required',
        synced: false 
      });
    }

    console.log(`🔄 Checking if lead ${email || leadId} has been sent to Instantly campaigns...`);

    // Build query to check campaign_sends table
    let query = supabase
      .from('campaign_sends')
      .select('campaign_id, campaign_name, sent_at, status, platform')
      .eq('platform', 'instantly')
      .order('sent_at', { ascending: false });

    // If we have leadId and leadSource, use those for exact match
    if (leadId && leadSource) {
      query = query
        .eq('lead_id', leadId)
        .eq('lead_source', leadSource);
    } else if (email) {
      // Otherwise, we need to find the lead ID from the Apollo/LinkedIn table first
      const tableName = leadSource === 'linkedin' ? 'LinkedIn' : 'Apollo';
      
      const { data: leadData, error: leadError } = await supabase
        .from(tableName)
        .select('id')
        .eq('email', email)
        .single();
      
      if (leadError || !leadData) {
        console.log(`❌ Lead with email ${email} not found in ${tableName} table`);
        return res.status(200).json({ 
          synced: false,
          platform: 'instantly'
        });
      }
      
      query = query
        .eq('lead_id', leadData.id)
        .eq('lead_source', tableName);
    }

    const { data: campaignSends, error: queryError } = await query;

    if (queryError) {
      console.error('❌ Error checking campaign_sends:', queryError);
      return res.status(200).json({ 
        synced: false,
        error: 'Database query error',
        platform: 'instantly'
      });
    }

    // Check if any successful sends exist
    const successfulSend = campaignSends?.find(send => 
      send.status === 'sent' || send.status === 'completed'
    );

    if (successfulSend) {
      console.log(`✅ Lead ${email || leadId} has been sent to Instantly campaign ${successfulSend.campaign_name}`);
      return res.status(200).json({ 
        synced: true,
        platform: 'instantly',
        campaign: {
          id: successfulSend.campaign_id,
          name: successfulSend.campaign_name
        },
        sentAt: successfulSend.sent_at
      });
    }

    console.log(`❌ Lead ${email || leadId} has not been sent to any Instantly campaigns`);
    res.status(200).json({ 
      synced: false,
      platform: 'instantly'
    });

  } catch (error) {
    console.error('❌ Check lead database error:', error);
    res.status(200).json({ 
      synced: false,
      error: 'Failed to check lead status',
      message: error.message,
      platform: 'instantly'
    });
  }
}