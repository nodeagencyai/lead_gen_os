import { createClient } from '@supabase/supabase-js';

// Check for required environment variables  
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  console.log('=== CAMPAIGN SEND REQUEST START ===');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));

  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.log('Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { leadIds, leadSource, campaignId, campaignName, platform } = req.body;

  console.log('Extracted fields:', { leadIds, leadSource, campaignId, campaignName, platform });

  if (!leadIds || !leadSource || !campaignId || !platform) {
    console.log('Missing required fields validation failed');
    return res.status(400).json({ 
      error: 'Missing required fields: leadIds, leadSource, campaignId, platform',
      received: { leadIds: !!leadIds, leadSource: !!leadSource, campaignId: !!campaignId, platform: !!platform }
    });
  }

  try {
    // Map lead source to correct table name
    const tableName = leadSource === 'linkedin' ? 'LinkedIn' : 'Apollo';
    console.log('Using table name:', tableName);
    
    // Fetch leads data
    console.log('Fetching leads from Supabase...');
    const { data: leads, error: fetchError } = await supabase
      .from(tableName)
      .select('*')
      .in('id', leadIds);

    console.log('Supabase query result:', { leadsCount: leads?.length, error: fetchError });

    if (fetchError) {
      console.error('Error fetching leads:', fetchError);
      return res.status(500).json({ 
        error: 'Database error', 
        details: fetchError.message,
        table: tableName,
        leadIds 
      });
    }

    if (!leads || leads.length === 0) {
      console.log('No leads found with provided IDs');
      return res.status(404).json({ 
        error: 'No leads found with provided IDs',
        table: tableName,
        leadIds 
      });
    }

    console.log('Found leads:', leads.map(l => ({ id: l.id, email: l.email, name: l.full_name })));

    // Send to external platform
    let sendResult;
    try {
      if (platform === 'instantly') {
        sendResult = await sendToInstantly(leads, campaignId);
      } else if (platform === 'heyreach') {
        sendResult = await sendToHeyReach(leads, campaignId);
      } else {
        throw new Error(`Unsupported platform: ${platform}`);
      }
    } catch (platformError) {
      console.error(`Error sending to ${platform}:`, platformError);
      // Continue to log in database even if external API fails
      sendResult = { 
        error: platformError.message,
        attempted: true,
        timestamp: new Date().toISOString()
      };
    }

    // Record campaign sends in database
    const campaignSends = leadIds.map(leadId => ({
      lead_id: leadId,
      lead_source: tableName,
      campaign_id: campaignId,
      campaign_name: campaignName || `Campaign ${campaignId}`,
      platform: platform,
      sent_at: new Date().toISOString(),
      status: sendResult.error ? 'failed' : 'sent',
      response: sendResult,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    try {
      const { error: insertError } = await supabase
        .from('campaign_sends')
        .insert(campaignSends);

      if (insertError) {
        console.error('Error recording campaign sends:', insertError);
        // Don't fail the request if we can't log to database
      }
    } catch (dbError) {
      console.warn('Campaign sends table may not exist yet:', dbError);
      // Continue without logging if table doesn't exist
    }

    return res.status(200).json({
      success: true,
      count: leadIds.length,
      campaign: campaignName || campaignId,
      platform: platform,
      sendResult: sendResult
    });
  } catch (error) {
    console.error('Error sending to campaign:', error);
    return res.status(500).json({ 
      error: 'Failed to send leads to campaign', 
      details: error.message 
    });
  }
}

async function sendToInstantly(leads, campaignId) {
  const instantlyApiKey = process.env.INSTANTLY_API_KEY || process.env.VITE_INSTANTLY_API_KEY;
  
  if (!instantlyApiKey) {
    throw new Error('Instantly API key not configured');
  }

  console.log(`Sending ${leads.length} leads to Instantly campaign ${campaignId}`);
  console.log('Lead data before formatting:', leads[0]); // Log first lead for debugging

  // Format leads for Instantly API v2 - correct field names
  const instantlyLeads = leads.map(lead => ({
    email: lead.email,
    first_name: lead.first_name || lead.full_name?.split(' ')[0] || '',
    last_name: lead.last_name || lead.full_name?.split(' ').slice(1).join(' ') || '',
    company_name: lead.company || '',
    job_title: lead.title || '',
    website: lead.website || '',
    location: lead.city || lead.location || '',
    phone: lead.phone || '',
    custom_variables: {
      niche: lead.niche || '',
      tags: Array.isArray(lead.tags) ? lead.tags.join(', ') : (lead.tags || ''),
      linkedin_url: lead.linkedin_url || '',
      industry: lead.industry || ''
    }
  }));

  // Use correct Instantly API v2 endpoint from official documentation
  // Note: v2 API creates leads one by one, not in batches
  const results = [];
  
  for (const lead of instantlyLeads) {
    console.log(`Sending individual lead: ${lead.email}`);
    
    const response = await fetch(`https://api.instantly.ai/api/v2/leads`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${instantlyApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        campaign: campaignId,  // Required field
        email: lead.email,     // Required field
        first_name: lead.first_name,
        last_name: lead.last_name,
        company_name: lead.company_name,
        website: lead.website,
        phone: lead.phone,
        custom_variables: lead.custom_variables
      })
    });

    const result = await response.json();
    console.log(`Lead ${lead.email} result:`, response.status, result);
    
    if (!response.ok) {
      console.error(`Failed to add lead ${lead.email}:`, result);
      results.push({ email: lead.email, success: false, error: result });
    } else {
      results.push({ email: lead.email, success: true, id: result.id });
    }
  }
  
  // Check if any leads were successful
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`Campaign send complete: ${successful.length} successful, ${failed.length} failed`);
  
  if (failed.length > 0 && successful.length === 0) {
    // All failed
    throw new Error(`All leads failed: ${failed.map(f => f.error?.message || 'Unknown error').join(', ')}`);
  }
  
  return {
    successful: successful.length,
    failed: failed.length,
    results: results
  };
}

async function sendToHeyReach(leads, campaignId) {
  const heyreachApiKey = process.env.HEYREACH_API_KEY || process.env.VITE_HEYREACH_API_KEY;
  
  if (!heyreachApiKey) {
    throw new Error('HeyReach API key not configured');
  }

  console.log(`Sending ${leads.length} leads to HeyReach campaign ${campaignId}`);

  // Format leads for HeyReach API
  const heyreachLeads = leads.map(lead => ({
    email: lead.email || '',
    firstName: lead.first_name || lead.full_name?.split(' ')[0] || '',
    lastName: lead.last_name || lead.full_name?.split(' ').slice(1).join(' ') || '',
    companyName: lead.company || '',
    jobTitle: lead.title || '',
    linkedInUrl: lead.linkedin_url || '',
    phoneNumber: lead.phone || '',
    location: lead.city || lead.location || '',
    custom: {
      niche: lead.niche || '',
      tags: Array.isArray(lead.tags) ? lead.tags.join(', ') : '',
      industry: lead.industry || '',
      website: lead.website || ''
    }
  }));

  // Use HeyReach prospect import endpoint
  const response = await fetch('https://api.heyreach.io/api/public/prospect/Import', {
    method: 'POST',
    headers: {
      'X-API-KEY': heyreachApiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      campaignId: campaignId,
      prospects: heyreachLeads,
      skipDuplicates: true // Avoid duplicates
    })
  });

  const result = await response.json();
  
  console.log('HeyReach API response:', response.status, result);
  
  if (!response.ok) {
    console.error('HeyReach API error:', result);
    throw new Error(`HeyReach API error: ${result.error || result.message || response.statusText}`);
  }

  return result;
}