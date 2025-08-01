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

    // Determine which table to query and which sync columns to check
    const tableName = leadSource === 'LinkedIn' ? 'LinkedIn' : 'Apollo';
    const syncColumns = tableName === 'LinkedIn' 
      ? 'id, heyreach_synced, heyreach_synced_at'
      : 'id, instantly_synced, instantly_synced_at';
    
    let query = supabase
      .from(tableName)
      .select(syncColumns)
      .limit(1);

    // Query by leadId if available, otherwise by email
    if (leadId) {
      query = query.eq('id', leadId);
    } else if (email) {
      query = query.eq('email', email);
    }

    const { data: leadData, error: queryError } = await query.single();

    if (queryError || !leadData) {
      const platformName = tableName === 'LinkedIn' ? 'heyreach' : 'instantly';
      console.log(`Lead with ${leadId ? `ID ${leadId}` : `email ${email}`} not found in ${tableName} table`);
      return res.status(200).json({ 
        synced: false,
        platform: platformName
      });
    }

    // Check the appropriate sync column based on table
    const synced = tableName === 'LinkedIn' 
      ? leadData.heyreach_synced === true
      : leadData.instantly_synced === true;
    const syncedAt = tableName === 'LinkedIn' 
      ? leadData.heyreach_synced_at
      : leadData.instantly_synced_at;
    const platformName = tableName === 'LinkedIn' ? 'heyreach' : 'instantly';

    if (synced) {
      console.log(`✅ Lead ${leadId || email} is synced to ${platformName} (synced at: ${syncedAt})`);
      return res.status(200).json({ 
        synced: true,
        platform: platformName,
        syncedAt: syncedAt
      });
    } else {
      console.log(`❌ Lead ${leadId || email} is not synced to ${platformName}`);
      return res.status(200).json({ 
        synced: false,
        platform: platformName
      });
    }

  } catch (error) {
    console.error('❌ Check sync status error:', error);
    res.status(200).json({ 
      synced: false,
      error: 'Failed to check sync status',
      message: error.message,
      platform: 'unknown'
    });
  }
}