import { createClient } from '@supabase/supabase-js';

// Check for required environment variables with multiple fallbacks
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Simple sync status check using instantly_synced column
export default async function handler(req, res) {
  // Set comprehensive CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
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

    // Determine which table to query
    const tableName = leadSource === 'LinkedIn' ? 'LinkedIn' : 'Apollo';
    
    let query = supabase
      .from(tableName)
      .select('id, instantly_synced, instantly_synced_at')
      .limit(1);

    // Query by leadId if available, otherwise by email
    if (leadId) {
      query = query.eq('id', leadId);
    } else if (email) {
      query = query.eq('email', email);
    }

    const { data: leadData, error: queryError } = await query.single();

    if (queryError || !leadData) {
      console.log(`Lead with ${leadId ? `ID ${leadId}` : `email ${email}`} not found in ${tableName} table`);
      return res.status(200).json({ 
        synced: false,
        platform: 'instantly'
      });
    }

    // Check the instantly_synced column
    const synced = leadData.instantly_synced === true;

    if (synced) {
      console.log(`✅ Lead ${leadId || email} is synced to Instantly (synced at: ${leadData.instantly_synced_at})`);
      return res.status(200).json({ 
        synced: true,
        platform: 'instantly',
        syncedAt: leadData.instantly_synced_at
      });
    } else {
      console.log(`❌ Lead ${leadId || email} is not synced to Instantly`);
      return res.status(200).json({ 
        synced: false,
        platform: 'instantly'
      });
    }

  } catch (error) {
    console.error('❌ Check sync status error:', error);
    res.status(200).json({ 
      synced: false,
      error: 'Failed to check sync status',
      message: error.message,
      platform: 'instantly'
    });
  }
}